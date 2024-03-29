// 定义一个任务队列
export const queue = new Set()

// 使用 Promise.resolve() 创建一个 promise 实例，用它将一个任务添加到微任务队列
const resolvedPromise = Promise.resolve()

// 任务队列是否在执行
let isFlushing = false

let currentFlushPromise = null

export function nextTick(fn) {
  const p = currentFlushPromise || resolvedPromise
  return fn ? p.then(fn) : p
}

export function queueJob(job) {
  // 将 job 添加到队列中
  queue.add(job)
  queueFlush()
}
function queueFlush() {
  if (!isFlushing) {
    // 正在刷新
    isFlushing = true
    currentFlushPromise = resolvedPromise.then(flushJobs)
  }
}
function flushJobs() {
  try {
    queue.forEach(job => job())
  } finally {
    // 重置
    isFlushing = false
    queue.clear()
    currentFlushPromise = null
  }
}
