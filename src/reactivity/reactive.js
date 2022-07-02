import { isObject, hasChanged, isArray } from './utils'
import { track, trigger } from './effect'

const proxyMap = new WeakMap()
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
      let oldLength = target.length
      const oldValue = target[key]
      const res = Reflect.set(target, key, value, receiver)
      if (hasChanged(oldValue, value)) {
        // 触发更新
        trigger(target, key)
        // 针对数组长度暂时这样处理
        // TODO 根据 RefLect 判断
        if (isArray(target) && hasChanged(oldLength, value.length)) {
          trigger(target, 'length')
        }
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
