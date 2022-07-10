# mini-vue

逐渐实现 Vue.js 大部分功能

# 目录结构

- scripts

  - rollup.config.dev,.js
    本地开发
  - rollup.config.port.js
    打包

- src
  - examples
    index.html 本地开发默认打开此页面
  - reactivity
    响应式系统
- vue3

  Vue.js 3 完整代码以及对应的测试代码

# reactive 与 effect

`reactive` 与 `effect`如何建立联系，核心就是在触发访问时，使用 `track` 进行依赖收集，在响应式对象的值变化时，触发更新 `trigger`

`依赖收集`就是保存副作用函数与响应式对象的关系

`触发更新`就是当响应式对象变化时找到并执行依赖于他的副作用函数

1. 执行副作用函数
2. 访问响应式对象过程中发现依赖，保存响应式对象所对应的副作用函数，依赖收集
3. 响应式对象的值发生变化时，触发更新

### targetMap

```js
// targetMap:{ // WeakMap 对象
//   [target]: {
//     [key]: []
//   }
// }
```

- 为什么使用 WeakMap
  当 reactiveObject 不再使用后，不必手动去 WeakMap 里删除，垃圾回收系统可以自动回收

### reactive

- [x] 嵌套 reactive(reactive(obj))
- [x] 代理多次 let a = reactive(obj), b = reactive(obj)
- [x] 深层对象代理
- [x] 劫持 key in obj 操作
- [x] 使用 for...in 循环遍历对象 新增 key 用 ownKeys 拦截，修改 key 在 set 里做判断是设置还是添加
- [x] 浅响应与深响应
- [x] 只读与浅只读
- [x] 数组

  - [x] 通过索引访问数组元素：arr[0]
  - [x] 访问数组的长度：arr.length
  - [x] 把数组作为对象，使用 for...in 循环遍历
  - [x] 使用 for...of 迭代遍历数组
  - [x] 数组的原型方法，concat/join/every/some/find/findIndex/includes 等

  - [x] 通过索引修改数组元素值：arr[1] = 3
  - [x] 修改数组长度：arr.length = 0
  - [x] 数组的栈方法：push/pop/shift/unshift
  - [x] 修改数组的原型方法：splice/fill/sort 等

### effect

- [x] hasChanged
- [x] 嵌套 effect

### computed

与 reactive 相似，不同点：

- [x] computed 中副作用函数不会立即执行
- [x] 依赖改变时不会计算，只有取的时候才会去计算，lazy
- [x] 计算过的值会有缓存

### watch

本质是观测一个响应式数据，当数据发生变化时通知并执行相应的回调函数

- [x] 深度观测对象 （递归访问）
- [x] 支持接收 getter 函数
- [x] 回调函数接收旧值与新值
- [x] 立即执行的 watch
- [x] 回调执行时机
- [x] 过期的副作用
