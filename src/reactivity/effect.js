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
  effectFn.scheduler = options.scheduler
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
  if (!activeEffect) return
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

export function trigger(target, key) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  const deps = depsMap.get(key)
  if (!deps) return
  const depsToRun = new Set(deps)
  depsToRun.forEach(effectFn => {
    if (effectFn.scheduler) {
      // 目前是计算属性用到，计算属性依赖的响应式对象变化之后触发更新
      effectFn.scheduler(effectFn)
    } else {
      effectFn()
    }
  })
}

// 定义一个任务队列
export const jobQueue = new Set()

// 使用 Promise.resolve() 创建一个 promise 实例，用它将一个任务添加到微任务队列
const p = Promise.resolve()

// 任务队列是否在执行
let isFlushing = false

export function flushJob() {
  if (isFlushing) return
  // 正在刷新
  isFlushing = true
  p.then(() => {
    jobQueue.forEach(job => job())
  }).finally(() => {
    // 刷新完毕
    isFlushing = false
  })
}
