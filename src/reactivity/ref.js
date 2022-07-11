import { track, trigger } from './effect'
import { reactive } from './reactive'
import { hasChanged, isObject } from '../utils'

export function toRef(obj, key) {
  const wrapper = {
    get value() {
      return obj[key]
    },
    // 设置值
    set value(val) {
      obj[key] = val
    },
  }
  Object.defineProperty(wrapper, '__v_isRef', { value: true })
  return wrapper
}

export function toRefs(obj) {
  const ret = {}
  for (const key in obj) {
    ret[key] = toRef(obj, key)
  }
  return ret
}

export function proxyRefs(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver)
      return value.__v_isRef ? value.value : value
    },
    set(target, key, newValue, recivier) {
      // 先读取之前的真实值
      const value = target[key]
      if (value.__v_isRef) {
        value.value = newValue
        return true
      }
      return Reflect.set(target, key, newValue, recivier)
    },
  })
}

export function ref(value) {
  if (isRef(value)) return value
  return new RefImpl(value)
}

class RefImpl {
  constructor(value) {
    this.__v_isRef = true
    this._value = convert(value)
  }

  get value() {
    track(this, 'value')
    return this._value
  }

  set value(newValue) {
    if (hasChanged(this._value, newValue)) {
      this._value = convert(newValue)
      trigger(this, 'value')
    }
  }
}

export function convert(value) {
  return isObject(value) ? reactive(value) : value
}

export function isRef(value) {
  return !!value.__v_isRef
}
