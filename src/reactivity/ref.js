import { track, trigger } from './effect'
import { reactive } from './reactive'
import { hasChanged, isObject } from './utils'

export function ref(value) {
  if (isRef(value)) return value
  return new RefImp(value)
}

class RefImp {
  constructor(value) {
    this.__isRef = true
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
  return !!value.__isRef
}
