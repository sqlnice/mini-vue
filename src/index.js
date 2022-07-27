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

import { createRenderer, h, Shape, queueJob } from './runtime/index.js'

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
  watch,
  createRenderer,
  h,
  Shape
}
