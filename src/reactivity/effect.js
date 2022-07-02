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
      effectStack.push(effectFn)
      activeEffect = effectFn
      return fn()
    } finally {
      effectStack.pop()
      activeEffect = effectStack[effectStack.length - 1]
    }
  }
  // computed { lazy }
  if (!options.lazy) {
    effectFn()
  }
  effectFn.scheduler = options.scheduler
  return effectFn
}

const targetMap = new WeakMap()
// targetMap:{
//   [target]: {
//     [key]: []
//     count: [effect1, effect2]
//   }
// }
export function track(target, key) {
  if (!activeEffect) return
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }

  let deps = depsMap.get(key)
  if (!deps) {
    depsMap.set(key, (deps = new Set()))
  }
  deps.add(activeEffect)
}

export function trigger(target, key) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  const deps = depsMap.get(key)
  if (!deps) return
  deps.forEach(effectFn => {
    if (effectFn.scheduler) {
      // 目前是计算属性用到，计算属性依赖的响应式对象变化之后触发更新
      effectFn.scheduler(effectFn)
    } else {
      effectFn()
    }
  })
}
