import { isObject } from './utils'
import { track, trigger } from './effect'
export function reactive(target) {
  if (!isObject(target)) return target
  const proxy = new Proxy(target, {
    get(target, key, receiver) {
      // https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Reflect
      const res = Reflect.get(target, key, receiver)
      // 依赖依赖
      track(target, key)
      return res
    },
    set(target, key, value, receiver) {
      const res = Reflect.set(target, key, value, receiver)
      // 触发更新
      trigger(target, key)
      return res
    },
  })
  return proxy
}
