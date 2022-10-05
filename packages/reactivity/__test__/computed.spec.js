import { computed } from '../src/computed'
import { effect } from '../src/effect'
import { reactive } from '../src/reactive'
import { ref } from '../src/ref'

describe('computed', () => {
  test('基础使用', () => {
    const observed = reactive({ count: 0 })
    const r = ref(10)
    const c = computed(() => observed.count + r.value)
    expect(c.value).toBe(10)
    observed.count++
    expect(c.value).toBe(11)
    r.value = 20
    expect(c.value).toBe(21)
  })

  test('lazy', () => {
    const r = ref(0)
    const getter = jest.fn(() => r.value)
    const c = computed(getter)
    expect(getter).toHaveBeenCalledTimes(0)

    r.value++
    expect(getter).toHaveBeenCalledTimes(0)
    c.value
    expect(getter).toHaveBeenCalledTimes(1)
    c.value
    expect(getter).toHaveBeenCalledTimes(1)
    r.value++
    r.value++
    expect(getter).toHaveBeenCalledTimes(1)
    c.value
    expect(getter).toHaveBeenCalledTimes(2)
  })

  test('触发 effect', () => {
    const observed = reactive({ count: 0 })
    const c = computed(() => observed.count)
    let dummy
    effect(() => (dummy = c.value))
    expect(dummy).toBe(0)
    observed.count++
    expect(dummy).toBe(1)
  })

  test('链式调用', () => {
    const observed = reactive({ count: 0 })
    const c1 = computed(() => observed.count)
    const c2 = computed(() => c1.value + 1)
    expect(c2.value).toBe(1)
    expect(c1.value).toBe(0)
    observed.count++
    expect(c2.value).toBe(2)
    expect(c1.value).toBe(1)
  })

  test('链式调用时触发依赖', () => {
    const observed = reactive({ foo: 0 })
    const getter1 = jest.fn(() => observed.foo)
    const c1 = computed(getter1)
    const getter2 = jest.fn(() => c1.value)
    const c2 = computed(getter2)
    let dummy
    effect(() => (dummy = c2.value + 1))
    expect(dummy).toBe(1)
    expect(getter1).toHaveBeenCalledTimes(1)
    expect(getter2).toHaveBeenCalledTimes(1)
    observed.foo++
    expect(dummy).toBe(2)
    expect(getter1).toHaveBeenCalledTimes(2)
    expect(getter2).toHaveBeenCalledTimes(2)
  })

  test('支持 setter', () => {
    const n = ref(1)
    const plusOne = computed({
      get: () => n.value + 1,
      set: val => (n.value = val - 1)
    })

    expect(plusOne.value).toBe(2)
    n.value++
    expect(plusOne.value).toBe(3)
    plusOne.value = 0
    expect(n.value).toBe(-1)
  })

  it('setter 能够触发 effect', () => {
    const n = ref(1)
    const plusOne = computed({
      get: () => n.value + 1,
      set: val => {
        n.value = val - 1
      }
    })

    let dummy
    effect(() => {
      dummy = n.value
    })
    expect(dummy).toBe(1)

    plusOne.value = 0
    expect(dummy).toBe(-1)
  })
})
