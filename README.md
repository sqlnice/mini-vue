# `mini-vue`

⏳ 逐渐实现 `Vue.js` 大部分功能

# 目录结构

- `scripts`

  - `rollup.config.dev.js` 本地开发
  - `rollup.config.port.js` 打包

- `src`
  - `examples` 本地开发默认打开此页面
  - `reactivity` 响应式系统
- `vue3`

  `Vue.js 3` 完整代码以及对应的测试代码

# 响应系统

`reactive` 与 `effect`如何建立联系，核心就是在触发访问时，使用 `track` 进行依赖收集，在响应式对象的值变化时，触发更新 `trigger`

`依赖收集`就是保存副作用函数与响应式对象的关系

`触发更新`就是当响应式对象变化时找到并执行依赖于他的副作用函数

1. 执行副作用函数
2. 访问响应式对象过程中发现依赖，保存响应式对象所对应的副作用函数，依赖收集
3. 响应式对象的值发生变化时，触发更新

## ⚛️ effect

```js
// targetMap:{ // WeakMap 对象
//   [target]: {
//     [key]: []
//   }
// }
```

✅ **为什么使用 `WeakMap`**

当 `reactiveObject` 不再使用后，不必手动去 `WeakMap` 里删除，垃圾回收系统可以自动回收

✅ **分支切换 `cleanup`**

✅ **嵌套 `effect` 与 `effect` 栈**

新建 `effectStack` 栈结构来存储 `effectFn`

✅ **避免无限递归循环**

如果 `trigger` 触发执行的副作用函数与当前正在执行的副作用函数不同，才触发执行

`if (effectFn !== activeEffect) effectsToRun.add(effectFn)`

✅ **调度执行**

所谓可调度，就是当 trigger 动作触发副作用函数重新执行时，有能力决定副作用函数执行的时间、次数及方式

`effect(()=>{},{ scheduler(fn) { /* */ } })`

✅ **hasChanged**

`set` 拦截时比较新旧值，不相同才触发更新

## ⚛️ reactive

### 代理对象

✅ **嵌套 `reactive(reactive(obj))`**

在 `get` 拦截器增加 `__isReactive`

✅ **代理多次 `let a = reactive(obj), b = reactive(obj)`**

通过 `proxyMap` 缓存已代理过的 `target`

✅ **劫持 `key in obj` 操作**

通过 `has` 拦截函数代理

✅ **使用 `for...in` 循环遍历对象**

如果新增 `key` 则用 `ownKeys` 拦截，如果修改 `key` 在 `set` 里做判断是设置还是添加

✅ **浅响应与深响应**

浅响应直接返回原始值，深响应调用 `reactive` 将结果包装成响应式数据后返回

✅ **只读与浅只读**

同上条，但要在 `set`、`deleteProperty`、`get` 拦截函数分别处理

### 代理数组

✅ **通过索引访问数组元素：`arr[0]`**

在 `trigger` 中，如果是 `ADD`，则在 `depsMap` 中取出 `key` 为 `length` 的 `effectFn` 添加到 `effectsToRun` 中

✅ **访问修改数组的长度：`arr.length`**

在 `trigger` 中，如果是数组且 `key` 为 `length`，则在 `depsMap` 中取出 `newLength < key` 的 `effects` 遍历添加到 `effectsToRun` 中

✅ **把数组作为对象，使用 `for...in` 循环遍历**

如果是数组则在 `ownKeys` 拦截函数中，用 `length` 作为 `key` 并建立响应联系

✅ **使用 `for...of` 迭代遍历数组**

只要在副作用函数与数组的长度和索引直接建立响应联系即可，上面几条已实现

✅ **数组的原型方法，`concat/join/every/some/find/findIndex/includes` 等**

重写此类方法，先在 代理对象上查找，未找到再到 raw 原始数组里查找 Ï

✅ **隐式修改数组长度的栈方法：`push/pop/shift/unshift/splice`**

重写此类方法，因为会改变长度，所以只收集数组自身的变化产生的依赖。定义 `shouldTrack`，在执行前后赋值 `true` 和 `false`，同时在 `track` 中判断是否应该收集依赖

## ⚛️ computed

与 `reactive` 相似，不同点：

✅ **`computed` 中副作用函数不会立即执行**

`effect` 第二个参数增加 `options.lazy = true`

✅ **依赖改变时不会计算，只有取的时候才会去计算**

使用 `value`、`dirty`、`effect` 的 `scheduler` 参数来控制缓存和计算

✅ **`effect` 中使用 `computed` 的值引发 `effect` 嵌套**

当读取计算属性的值时，手动调用 `track` 进行追踪；当计算属性值变化时，手动调用 `trigger` 触发响应

## ⚛️ watch

本质是观测一个响应式数据，当数据发生变化时通知并执行相应的回调函数

✅ **深度观测对象**

递归访问

✅ **支持接收 `getter` 函数**

判断是否为函数

✅ **回调函数接收旧值与新值**
✅ **立即执行的 `watch`**

提取 `scheduler` 为单独的 `job` 函数，当 `options.immediate` 为 `true` 时立即执行 `job`

✅ **回调执行时机**

增加 `options.flush` 参数，当为 `post` 时，使用 `Promise.resolve().then(job)` 执行 `job`，
默认 `sync` 为立即执行

✅ **过期的副作用**

增加 `onInvalidte` 函数，调用回调函数之前先调用过期回调

## ⚛️ ref

本质是一个“包裹对象”。因为 `JavaScript` 的 `Proxy` 无法提供对原始值的代理，所以需要用一层对象来包裹，简介实现原始值的响应式方案。由于“包裹对象”本质上与普通对象没有任何区别，为了区分 `ref` 与普通对象，我们为“包裹对象”定义了 `__v_isRef` 为 `true` 的属性，用来表示 `ref`

✅ **普通 `ref`**
✅ **解决响应丢失问题**

增加 `toRef`、`toRefs`

✅ **自动脱 `ref`**

# 渲染器

## ⚛️ 渲染器设计

✅ **渲染器与响应系统的结合**

利用响应系统的能力，自动调用渲染器完成页面的渲染与更新

✅ **渲染器的基本概念**

虚拟 DOM 用 virtual DOM 来表达，简称 vnode

渲染器把虚拟 DOM 节点渲染为真实 DOM 节点的过程叫做挂载，用 mount 来表达

渲染器把内容挂载到目标元素，这个目标元素称为 container

在渲染时，可能会多次调用，由于传入前后的 vnode 值不同，我们需要 patch 函数来比较、剪裁传进来的 vnode，再挂载

🟥 **自定义渲染器**

以浏览器为渲染目标平台，编写 vnode 结构

将浏览器特有 API 抽离为配置项，该配置项可以作为 createRenderer 函数的参数

## ⚛️ 挂载与更新

🟥 **挂载子节点和元素的属性**

🟥 **HTML Attributes 与 DOM Properties**

🟥 **正确地设置元素属性**

🟥 **class 的处理**

🟥 **卸载操作**

🟥 **区分 vnode 的类型**

🟥 **事件的处理**

🟥 **事件冒泡与更新时机问题**

🟥 **更新子节点**

🟥 **文本节点和注释节点**

🟥 **Fragment**

## ⚛️ 简单 Diff 算法

🟥 **减少 DOM 操作的性能开销**

🟥 **DOM 复用与 key 的作用**

🟥 **找到需要移动的元素**

🟥 **如何移动元素**

🟥 **添加新元素**

🟥 **移除不存在的元素**

## ⚛️ 双端 Diff 算法

🟥 **双端比较的原理**

🟥 **双端比较的优势**

🟥 **非理想状况的处理方式**

🟥 **添加新元素**

🟥 **移除不存在的元素**

## ⚛️ 快读 Diff 算法

🟥 **相同的前置元素和后置元素**

🟥 **判断是否需要进行 DOM 移动操作**

🟥 **如何移动元素**
