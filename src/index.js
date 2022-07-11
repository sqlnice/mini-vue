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
  jobQueue,
  flushJob,
  watch,
} from './reactivity/index.js'

import { createRenderer, h } from './runtime/index.js'
export default MiniVue = {
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
  jobQueue,
  flushJob,
  watch,
  createRenderer,
  h,
}
