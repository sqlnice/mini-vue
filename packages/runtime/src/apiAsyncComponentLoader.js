import { onUnmounted } from './lifeCycle'
import { Shape } from './vnode'
import { ref } from '@mini-vue/reactivity'
export const defineAsyncComponent = options => {
  if (typeof options === 'function') {
    options = {
      loader: options
    }
  }
  const { loader } = options
  let InnerComp = null
  // 记录重试次数
  let retries = 0
  function load() {
    return loader().catch(err => {
      // 用户有定义 onError 回调，将控制器交给用户
      if (options.onError) {
        return new Promise((resolve, reject) => {
          const retry = () => {
            resolve(load())
            retries++
          }
          const fail = () => reject(err)
          options.onError(retry, fail, retries)
        })
      } else {
        throw err
      }
    })
  }

  return {
    name: 'AsyncComponentWarpper',
    setup() {
      // 是否已加载
      const loaded = ref(false)
      const error = ref(false)
      const loading = ref(false)
      let loadingTimer = null
      if (options.delay) {
        loadingTimer = setTimeout(() => {
          loading.value = true
        }, options.delay)
      } else {
        loading.value = true
      }
      load()
        .then(c => {
          InnerComp = c
          loaded.value = true
        })
        .catch(err => (error.value = err))
        .finally(() => {
          loading.value = false
          clearTimeout(loadingTimer)
        })

      let timer = null

      if (options.timeout) {
        timer = setTimeout(() => {
          error.value = new Error(`异步组件在${options.timeout}ms 后超时`)
        }, options.timeout)
      }
      // 卸载时清除定时器
      onUnmounted(() => clearTimeout(timer))

      const placeholder = { type: Shape.Text, children: '' }
      return () => {
        if (loaded.value) {
          return { type: InnerComp }
        } else if (error.value && options.errorComponent) {
          return { type: options.errorComponent, props: { error: error.value } }
        } else if (loading.value && options.loadingComponent) {
          return { type: options.loadingComponent }
        } else {
          return placeholder
        }
      }
    }
  }
}
