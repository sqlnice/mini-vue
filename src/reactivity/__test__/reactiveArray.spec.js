import { isReactive, reactive } from '../reactive'
import { effect } from '../effect'
describe('reactive array', () => {
  test('响应式数组', () => {
    const original = [{ foo: 1 }]
    const observed = reactive(original)
    expect(observed).not.toBe(original)
    expect(isReactive(observed)).toBeTruthy()
    expect(isReactive(original)).toBeFalsy()
    expect(isReactive(observed[0])).toBeTruthy()
    // get
    expect(observed[0].foo).toBe(1)
    // has
    expect(0 in observed).toBeTruthy()
    // ownKeys
    expect(Object.keys(observed)).toEqual(['0'])
  })

  test('数组元素能够正常响应', () => {
    const observed = reactive([])
    let dummy, length
    effect(() => {
      dummy = observed[3]
      length = observed.length
    })
    expect(dummy).toBeUndefined()
    expect(length).toBe(0)

    observed[3] = 3
    expect(dummy).toBe(3)
    expect(length).toBe(4)

    observed[3] = { count: 0 }
    expect(isReactive(dummy)).toBeTruthy()
    expect(dummy.count).toBe(0)

    observed.length = 0
    expect(dummy).toBeUndefined()
    expect(length).toBe(0)
  })

  test('push', () => {
    const observed = reactive([])
    let dummy, length
    effect(() => {
      dummy = observed[3]
      length = observed.length
    })
    observed.push(1)
    expect(dummy).toBeUndefined()
    expect(length).toBe(1)
  })

  test('数组元素能正常响应2', () => {
    const original = []
    const observed = reactive(original)
    let dummy
    effect(() => {
      dummy = observed[3]
    })
    expect(dummy).toBeUndefined()
    observed[3] = 3
    expect(dummy).toBe(3)
    observed[3] = { count: 0 }
    expect(isReactive(dummy)).toBe(true)
    expect(dummy.count).toBe(0)
  })

  test('cloned reactive Array should point to observed values', () => {
    const original = [{ foo: 1 }]
    const observed = reactive(original)
    const clone = observed.slice()
    expect(isReactive(clone[0])).toBe(true)
    expect(clone[0]).not.toBe(original[0])
    expect(clone[0]).toBe(observed[0])
  })

  test('observed value should proxy mutations to original (Array)', () => {
    const original = [{ foo: 1 }, { bar: 2 }]
    const observed = reactive(original)
    // set
    const value = { baz: 3 }
    const reactiveValue = reactive(value)
    observed[0] = value
    expect(observed[0]).toBe(reactiveValue)
    expect(original[0]).toBe(value)
    // delete
    delete observed[0]
    expect(observed[0]).toBeUndefined()
    expect(original[0]).toBeUndefined()
    // mutating methods
    observed.push(value)
    expect(observed[2]).toBe(reactiveValue)
    expect(original[2]).toBe(value)
  })

  test('Array identity methods should work if raw value contains reactive objects', () => {
    const raw = []
    const obj = reactive({})
    raw.push(obj)
    const arr = reactive(raw)
    expect(arr.includes(obj)).toBe(true)
  })

  test('delete on Array should not trigger length dependency', () => {
    const arr = reactive([1, 2, 3])
    const fn = jest.fn()
    effect(() => {
      fn(arr.length)
    })
    expect(fn).toHaveBeenCalledTimes(1)
    delete arr[1]
    expect(fn).toHaveBeenCalledTimes(1)
  })

  test('add existing index on Array should not trigger length dependency', () => {
    const array = new Array(3)
    const observed = reactive(array)
    const fn = jest.fn()
    effect(() => {
      fn(observed.length)
    })
    expect(fn).toHaveBeenCalledTimes(1)
    observed[1] = 1
    expect(fn).toHaveBeenCalledTimes(1)
  })

  test('add non-integer prop on Array should not trigger length dependency', () => {
    const array = new Array(3)
    const observed = reactive(array)
    const fn = jest.fn()
    effect(() => {
      fn(observed.length)
    })
    expect(fn).toHaveBeenCalledTimes(1)
    observed.x = 'x'
    expect(fn).toHaveBeenCalledTimes(1)
    observed[-1] = 'x'
    expect(fn).toHaveBeenCalledTimes(1)
    observed[NaN] = 'x'
    expect(fn).toHaveBeenCalledTimes(1)
  })

  // #2427
  test('track length on for ... in iteration', () => {
    const array = reactive([1])
    let length = ''
    effect(() => {
      length = ''
      for (const key in array) {
        length += key
      }
    })
    expect(length).toBe('0')
    array.push(1)
    expect(length).toBe('01')
  })
})
