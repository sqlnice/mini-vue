import { effect } from './effect'

export function watch(source, cb, options = {}) {
  let getter
  if (typeof source === 'function') {
    getter = source
  } else {
    // 递归读取
    getter = () => traverse(source)
  }
  let oldValue
  let newValue

  // 用来存储用户注册的过期回调
  let cleanup
  function onInvalidate(fn) {
    // 将过期回调存储到 cleanup 中
    cleanup = fn
  }

  const job = () => {
    // 数据变化时执行回调
    newValue = effectFn()
    // 调用回调之前，先调用过期回到
    if (cleanup) {
      cleanup()
    }
    cb(newValue, oldValue, onInvalidate)
    oldValue = newValue
  }
  const effectFn = effect(() => getter(), {
    lazy: true,
    scheduler: () => {
      if (options.flush === 'post') {
        const p = Promise.resolve()
        p.then(job) // 'post'
      } else {
        job() // 'sync'
      }
      // pre 涉及到组件更新，暂时无法模拟
    }
  })

  if (options.immediate) {
    job()
  } else {
    // 先手动调用副作用函数
    oldValue = effectFn()
  }
}

function traverse(value, seen = new Set()) {
  if (typeof value !== 'object' || value === null || seen.has(value)) return
  seen.add(value)

  // 目前只考虑对象，不考虑数组等
  for (const key in value) {
    traverse(value[key], seen)
  }

  return value
}
