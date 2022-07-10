import { isObject, hasChanged, isArray } from './utils'
import { track, trigger } from './effect'
import { TriggerOpTypes } from './operations'

const proxyMap = new WeakMap()
export const ITERATE_KEY = Symbol()
export function reactive(target) {
  if (!isObject(target)) return target
  if (isReactive(target)) return target
  if (proxyMap.has(target)) return proxyMap.get(target)
  const proxy = new Proxy(target, {
    get(target, key, receiver) {
      if (key === '__isReactive') return true
      // https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Reflect
      const res = Reflect.get(target, key, receiver)
      // 依赖依赖
      track(target, key)
      return isObject(res) ? reactive(res) : res
    },
    set(target, key, value, receiver) {
      const type = Object.prototype.hasOwnProperty.call(target, key) ? TriggerOpTypes.SET : TriggerOpTypes.ADD
      let oldLength = target.length
      const oldValue = target[key]
      const res = Reflect.set(target, key, value, receiver)
      if (hasChanged(oldValue, value)) {
        // 触发更新
        trigger(target, key, type)
        // 针对数组长度暂时这样处理
        // TODO 根据 RefLect 判断
        if (isArray(target) && hasChanged(oldLength, value.length)) {
          trigger(target, 'length')
        }
      }
      return res
    },
    has(target, key) {
      // 拦截 in 操作  key in obj
      track(target, key)
      return Reflect.has(target, key)
    },
    ownKeys(target) {
      // 拦截 for...in 操作
      track(target, ITERATE_KEY)
      return Reflect.ownKeys(target)
    },
    deleteProperty(target, key) {
      // 判断被操作的属性是否是对象自己的属性
      const hadKey = Object.prototype.hasOwnProperty.call(target, key)
      // 使用 Reflect 完成删除操作
      const res = Reflect.deleteProperty(target, key)
      if (res && hadKey) {
        // 只有成功删除，才触发更新
        trigger(target, key, TriggerOpTypes.DELETE)
      }
      return res
    },
  })
  proxyMap.set(target, proxy)
  return proxy
}
export function isReactive(target) {
  return !!(target && target.__isReactive)
}
