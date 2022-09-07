import {
  reactive,
  shallowReactive,
  readonly,
  shallowReadonly,
  effect,
  ref,
  toRaw,
  toRef,
  toRefs,
  isRef,
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
  defineAsyncComponent,
  KeepAlive,
  Teleport,
  Transition,
  createBlock,
  openBlock,
  createApp,
  renderList,
  withModel
} from './runtime/index.js'
import { compile } from './compiler/index.js'
export default {
  reactive,
  shallowReactive,
  readonly,
  shallowReadonly,
  effect,
  ref,
  toRaw,
  toRef,
  toRefs,
  isRef,
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
  defineAsyncComponent,
  KeepAlive,
  Teleport,
  Transition,
  compile,
  createBlock,
  openBlock,
  createApp,
  renderList,
  withModel
}
