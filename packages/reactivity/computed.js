import { effect, track, trigger } from './effect'
import { isFunction } from '@mini-vue/shared'
export function computed(getterOrOption) {
  let getter
  let setter = () => {
    console.warn('computed is readonly')
  }
  if (isFunction(getterOrOption)) {
    getter = getterOrOption
  } else {
    getter = getterOrOption.get
    setter = getterOrOption.set
  }
  return new ComputedImpl(getter, setter)
}

class ComputedImpl {
  constructor(getter, setter) {
    this.setter = setter
    this._value = undefined
    this._dirty = true // 是否改变
    this.effect = effect(getter, {
      lazy: true, // 懒计算
      scheduler: () => {
        // computed 里面依赖的响应式对象变化时，才执行此方法
        if (!this._dirty) {
          this._dirty = true
          // 触发更新
          trigger(this, 'value')
        }
      }
    })
  }

  get value() {
    if (this._dirty) {
      this._value = this.effect()
      this._dirty = false
      track(this, 'value')
      // 依赖收集
    }
    return this._value
  }

  set value(newValue) {
    this.setter(newValue)
  }
}
