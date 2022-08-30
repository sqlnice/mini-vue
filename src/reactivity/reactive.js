import { isObject, hasChanged, isArray } from '../utils'
import { track, trigger } from './effect'
import { TriggerOpTypes } from './operations'

const proxyMap = new WeakMap()
// 用于拦截 for...in 操作时，关联副作用函数
export const ITERATE_KEY = Symbol('ITERATE_KEY')

const arrayInstrumentations = {}

;['includes', 'indexOf', 'lastIndexOf'].forEach(method => {
  const originMethod = Array.prototype[method]
  arrayInstrumentations[method] = function (...args) {
    // 这里 this 指代理对象，先在代理对象中查找
    let res = originMethod.apply(this, args)
    if (res === false) {
      // 再次通过 this.raw 拿到原始数组查找
      res = originMethod.apply(this.raw, args)
    }
    return res
  }
})
export let shouldTrack = true
;['push', 'pop', 'shift', 'unshift', 'splice'].forEach(method => {
  const originMethod = Array.prototype[method]
  arrayInstrumentations[method] = function (...args) {
    shouldTrack = false
    const res = originMethod.apply(this, args)
    shouldTrack = true
    return res
  }
})

/**
 * reactive 创建器
 * @param {*} obj
 * @param {*} isShallow
 */
function createReactive(obj, isShallow = false, isReadonly = false) {
  if (!isObject(obj)) return obj
  if (isReactive(obj)) return obj
  if (proxyMap.has(obj)) return proxyMap.get(obj)
  const proxy = new Proxy(obj, {
    get(target, key, receiver) {
      if (key === '__isReactive') return true
      if (key === 'raw') return target
      if (
        isArray(target) &&
        Object.prototype.hasOwnProperty.call(arrayInstrumentations, key)
      ) {
        return Reflect.get(arrayInstrumentations, key, receiver)
      }

      // 在非只读时才建立响应联系
      // 数组调用 for...of 或者 values 方法时，都会读取数组的 Symbol.interator 属性，是一个 symbol 值，为避免意外及提升性能，不应与这类 symbol 值直接建立响应联系
      if (!isReadonly && typeof key !== 'symbol') {
        // 依赖依赖
        track(target, key)
      }

      // https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Reflect
      const res = Reflect.get(target, key, receiver)

      // 浅响应，直接返回值
      if (isShallow) {
        return res
      }
      if (isObject(res)) {
        return isReadonly ? readonly(res) : reactive(res)
      }
      return res
    },
    set(target, key, newValue, receiver) {
      if (isReadonly) {
        console.warn(`属性 ${key} 是只读的`)
        return true
      }
      const type = isArray(target)
        ? Number(key) < target.length
          ? TriggerOpTypes.SET
          : TriggerOpTypes.ADD
        : Object.prototype.hasOwnProperty.call(target, key)
        ? TriggerOpTypes.SET
        : TriggerOpTypes.ADD
      const oldValue = target[key]
      const res = Reflect.set(target, key, newValue, receiver)
      // 说明 receiver 就是 target 的代理对象
      if (target === receiver.raw) {
        if (hasChanged(oldValue, newValue)) {
          // 触发更新
          trigger(target, key, type, newValue)
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
      // 如果是数组使用 length 建立响应联系
      track(target, isArray(target) ? 'length' : ITERATE_KEY)
      return Reflect.ownKeys(target)
    },
    deleteProperty(target, key) {
      if (isReadonly) {
        console.warn(`属性 ${key} 是只读的`)
        return true
      }
      // 判断被操作的属性是否是对象自己的属性
      const hadKey = Object.prototype.hasOwnProperty.call(target, key)
      // 使用 Reflect 完成删除操作
      const res = Reflect.deleteProperty(target, key)
      if (res && hadKey) {
        // 只有成功删除，才触发更新
        trigger(target, key, TriggerOpTypes.DELETE)
      }
      return res
    }
  })
  proxyMap.set(obj, proxy)
  return proxy
}

export function reactive(obj) {
  return createReactive(obj)
}

/**
 * 浅响应
 */
export function shallowReactive(obj) {
  return createReactive(obj, true)
}

export function readonly(obj) {
  return createReactive(obj, false, true /* 只读 */)
}

export function shallowReadonly(obj) {
  return createReactive(obj, true, true /* 只读 */)
}

export function isReactive(target) {
  return !!(target && target.__isReactive)
}
