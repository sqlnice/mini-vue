import { effect } from './effect'
export function watch(source, cb, options) {
  let getter
  if (typeof source === 'function') {
    getter = source
  } else {
    // 递归读取
    getter = () => traverse(source)
  }
  let oldValue, newValue

  const job = () => {
    // 数据变化时执行回调
    newValue = effectFn()
    cb(newValue, oldValue)
    oldValue = newValue
  }
  const effectFn = effect(() => getter(), {
    lazy: true,
    scheduler: job,
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
