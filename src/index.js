import {
  reactive,
  shallowReactive,
  readonly,
  shallowReadonly,
  effect,
  ref,
  toRef,
  toRefs,
  proxyRefs,
  computed,
  watch
} from './reactivity/index.js'

import {
  createRenderer,
  h,
  Shape,
  queueJob,
  onBeforeMount,
  onMounted,
  onBeforeUpdate,
  onUpdated,
  onBeforeUnmount,
  onUnmounted,
  onServerPrefetch,
  defineAsyncComponent
} from './runtime/index.js'

export default {
  reactive,
  shallowReactive,
  readonly,
  shallowReadonly,
  effect,
  ref,
  toRef,
  toRefs,
  proxyRefs,
  computed,
  queueJob,
  onBeforeMount,
  onMounted,
  onBeforeUpdate,
  onUpdated,
  onBeforeUnmount,
  onUnmounted,
  onServerPrefetch,
  watch,
  createRenderer,
  h,
  Shape,
  defineAsyncComponent
}
