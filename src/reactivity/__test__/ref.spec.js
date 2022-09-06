import { effect } from '../effect'
import { reactive } from '../reactive'
import { ref, isRef, toRef, toRefs } from '../ref'

describe('ref', () => {
  test('isRef', () => {
    let r = undefined
    expect(isRef(r)).toBeFalsy()
    r = ref(null)
    expect(isRef(r)).toBeTruthy()
  })

  test('基本使用', () => {
    const r = ref(0)
    let dummy
    effect(() => (dummy = r.value))
    expect(dummy).toBe(0)
    r.value++
    expect(dummy).toBe(1)
  })

  test('多个 ref', () => {
    const r1 = ref(0)
    const r2 = ref(10)
    let dummy
    effect(() => (dummy = r1.value + r2.value))
    expect(dummy).toBe(10)
    r1.value++
    expect(dummy).toBe(11)
    r2.value = 20
    expect(dummy).toBe(21)
  })

  test('ref 值为对象', () => {
    const r = ref({ count: 0 })
    let dummy
    expect(r.value.count).toBe(0)
    effect(() => (dummy = r.value.count))
    expect(dummy).toBe(0)
    r.value.count++
    expect(dummy).toBe(1)
  })

  test('重赋 ref', () => {
    const r1 = ref()
    const r2 = ref(r1)
    expect(r1).toBe(r2)
  })

  test('toRef', () => {
    const observed = reactive({ foo: 1, bar: 2 })
    const foo = toRef(observed, 'foo')
    const bar = toRef(observed, 'bar')
    expect(foo.value).toBe(observed.foo)
    expect(bar.value).toBe(observed.bar)
  })

  test('toRefs', () => {
    const observed = reactive({ foo: 1, bar: 2 })
    const newObj = {
      ...toRefs(observed)
    }
    expect(isRef(newObj.foo)).toBeTruthy()
    expect(isRef(newObj.bar)).toBeTruthy()
    expect(isRef(newObj.c)).toBeFalsy()

    const a = reactive({
      x: 1,
      y: 2
    })

    const { x, y } = toRefs(a)

    expect(isRef(x)).toBe(true)
    expect(isRef(y)).toBe(true)
    expect(x.value).toBe(1)
    expect(y.value).toBe(2)

    // source -> proxy
    a.x = 2
    a.y = 3
    expect(x.value).toBe(2)
    expect(y.value).toBe(3)

    // proxy -> source
    x.value = 3
    y.value = 4
    expect(a.x).toBe(3)
    expect(a.y).toBe(4)

    // reactivity
    let dummyX, dummyY
    effect(() => {
      dummyX = x.value
      dummyY = y.value
    })
    expect(dummyX).toBe(x.value)
    expect(dummyY).toBe(y.value)

    // mutating source should trigger effect using the proxy refs
    a.x = 4
    a.y = 5
    expect(dummyX).toBe(4)
    expect(dummyY).toBe(5)
  })
})
