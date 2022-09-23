import { effect } from '../effect'
import {
  reactive,
  isReactive,
  shallowReactive,
  readonly,
  shallowReadonly
} from '../reactive'
describe('reactive', () => {
  test('isReactive', () => {
    const original = { count: 0 }
    const observed = reactive(original)
    expect(isReactive(original)).toBe(false)
    expect(isReactive(observed)).toBe(true)
  })
  test('子对象也会被代理', () => {
    const original = { obj: { count: 0 } }
    const observed = reactive(original)
    expect(isReactive(observed.obj)).toBe(true)
  })
  test('不会被代理两次', () => {
    const original = { count: 0 }
    const observed = reactive(original)
    const observed2 = reactive(observed)
    expect(observed).toBe(observed2)
  })
  test('重复设置会返回相同值', () => {
    const original = { count: 0 }
    const observed = reactive(original)
    const observed2 = reactive(original)
    expect(observed).toBe(observed2)
  })
  test('shallowReactive', () => {
    const original = { obj: { count: 0 } }
    const shallowObserved = shallowReactive(original)
    const spy = jest.fn(() => console.log(shallowObserved.obj.count))
    effect(spy)
    expect(spy).toHaveBeenCalledTimes(1)
    shallowObserved.obj.count = 1
    expect(spy).toHaveBeenCalledTimes(1)
    shallowObserved.obj = {}
    expect(spy).toHaveBeenCalledTimes(2)
  })
  test('readonly', () => {
    const original = { count: 0 }
    const readonlyObserved = readonly(original)
    const spy = jest.fn(() => console.log(readonlyObserved.count))
    effect(spy)
    expect(spy).toHaveBeenCalledTimes(1)
    readonlyObserved.count++
    expect(spy).toHaveBeenCalledTimes(1)
    delete readonlyObserved.count
    expect(spy).toHaveBeenCalledTimes(1)
  })
  test('shallowReadonly', () => {
    const original = { obj: { count: 0 }, age: 18 }
    const shallowReadonlyObserved = shallowReadonly(original)
    const spy = jest.fn(() => console.log(shallowReadonlyObserved.obj.count))
    effect(spy)
    expect(spy).toHaveBeenCalledTimes(1)
    shallowReadonlyObserved.obj.count++
    expect(spy).toHaveBeenCalledTimes(1)
    expect(shallowReadonlyObserved.obj.count).toBe(1)
    shallowReadonlyObserved.age++
    expect(shallowReadonlyObserved.age).toBe(18)
  })
})
