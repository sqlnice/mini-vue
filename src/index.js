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
  onMounted
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
  onMounted,
  watch,
  createRenderer,
  h,
  Shape
}
