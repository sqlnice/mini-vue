import { TriggerOpTypes } from './operations'
import { ITERATE_KEY, shouldTrack } from './reactive'
import { isArray, isIntegerKey } from '@mini-vue/shared'

let activeEffect
const effectStack = []
// effectStack 先进后出，解决 effect 嵌套问题
// ---------
// |       |
// | inner |
// | out   |
// |       |
// ---------
export function effect(fn, options = {}) {
  const effectFn = () => {
    try {
      cleanup(effectFn)
      effectStack.push(effectFn)
      activeEffect = effectFn
      return fn()
    } finally {
      effectStack.pop()
      activeEffect = effectStack[effectStack.length - 1]
    }
  }
  effectFn.deps = []
  // computed { lazy }
  if (!options.lazy) {
    effectFn()
  }
  effectFn.options = options
  return effectFn
}

function cleanup(effectFn) {
  for (let i = 0; i < effectFn.deps.length; i++) {
    // deps 是依赖集合
    const deps = effectFn.deps[i]
    deps.delete(effectFn)
  }
  effectFn.deps.length = 0
}

const targetMap = new WeakMap()
// targetMap:{
//   [target]: {
//     [key]: []
//     count: [effect1, effect2]
//   }
// }
export function track(target, key) {
  if (!activeEffect || !shouldTrack) return
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }

  let deps = depsMap.get(key)
  if (!deps) {
    depsMap.set(key, (deps = new Set()))
  }
  // 把当前激活的副作用函数添加到依赖集合 deps 中
  deps.add(activeEffect)
  // deps 就是一个与当前副作用函数存在联系的依赖集合
  activeEffect.deps.push(deps)
}

export function trigger(target, key, type, newValue) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  // 取得与 key 相关的副作用函数
  const effects = depsMap.get(key)
  // 取得与 ITERATE_KEY 相关的副作用函数
  const iterateEffects = depsMap.get(ITERATE_KEY)

  const effectsToRun = new Set()

  effects &&
    effects.forEach(effectFn => {
      if (effectFn !== activeEffect) {
        effectsToRun.add(effectFn)
      }
    })
  // 只有操作类型为 'ADD'/'DELETE' 时，才触发与 ITERATE_KEY 相关联的副作用函数重新执行
  // 比如 for...in，修改值不用触发，因为他只检测 key；obj.foo = 2，设置 obj 新的 key 时，才触发
  if ([TriggerOpTypes.ADD, TriggerOpTypes.DELETE].includes(type)) {
    iterateEffects &&
      iterateEffects.forEach(effectFn => {
        if (effectFn !== activeEffect) {
          effectsToRun.add(effectFn)
        }
      })
  }
  // 当给数组通过索引设置值时，触发相关依赖
  if (TriggerOpTypes.ADD === type && isArray(target)) {
    // 只有为整数时才可以，以下都不行
    // observed.x = 'x'
    // observed[-1] = 'x'
    // observed[NaN] = 'x'
    if (isIntegerKey(key)) {
      const lengthEffects = depsMap.get('length')
      lengthEffects &&
        lengthEffects.forEach(effectFn => {
          if (effectFn !== activeEffect) {
            effectsToRun.add(effectFn)
          }
        })
    }
  }

  // 直接修改数组的长度
  if (isArray(target) && key === 'length') {
    depsMap.forEach((effects, key) => {
      if (key >= newValue) {
        // 只触发长度之后的索引依赖的副作用函数
        effects.forEach(effectFn => {
          if (effectFn !== activeEffect) {
            effectsToRun.add(effectFn)
          }
        })
      }
    })
  }

  effectsToRun.forEach(effectFn => {
    if (effectFn?.options?.scheduler) {
      // 目前是计算属性用到，计算属性依赖的响应式对象变化之后触发更新
      effectFn.options.scheduler(effectFn)
    } else {
      effectFn()
    }
  })
}
