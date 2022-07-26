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

虚拟 `DOM` 用 `virtual DOM` 来表达，简称 `vnode`

渲染器把虚拟 `DOM` 节点渲染为真实 `DOM` 节点的过程叫做挂载，用 `mount` 来表达

渲染器把内容挂载到目标元素，这个目标元素称为 `container`

在渲染时，可能会多次调用，由于传入前后的 `vnode` 值不同，我们需要 `patch` 函数来比较、剪裁传进来的 `vnode` ，再挂载

✅ **自定义渲染器**

以浏览器为渲染目标平台，编写 `vnode` 结构

将浏览器特有 `API` 抽离为配置项，该配置项可以作为 `createRenderer` 函数的参数

## ⚛️ 挂载与更新

✅ **挂载子节点和元素的属性**

挂载时，如果 `children` 子元素为数组，要遍历调用 `patch` 重新挂载

如果存在 `props` ，使用 `el[key] = vnode.props[key]` 直接设置 ？

✅ **HTML Attributes 与 DOM Properties**

**`HTML Attributes` 的作用是设置与之对应的初始值**。一旦值改变，那么 `DOM Properties` 始终存储当前值，而通过 `getAttribute` 函数得到的值依然是初始值

✅ **正确地设置元素属性**

先获取 `el` 本身 `key` 的类型，比如 `disabled`

如果 `disabled` 在 `el` 上存在，并且 `el[disabled]` 的类型是 `Boolean` 且 `vnode.props.disabled` 为空字符串，
则手动置为 `true`，否在直接使用 `el[key] = value` 设置。此步骤可抽象为 `shouldSetAsProps`

如果 `vnode.props` 中的属性不具有对应的 `DOM Properties`，则使用 `setAttribute` 来完成属性设置

✅ **class 的处理**

```js
class: 'foo bar'
class: { foo: true, bar: true }
class: ['foo', { bar: true }]
```

分别针对三种情况进行格式化，最后调用 `el.className = 'foo bar'` 进行设置

🟥 **style 的处理**

与 `class` 类似

✅ **卸载操作**

把 `el` 和 `vnode` 绑定起来，更新时如果无新 `vnode` ，则卸载

把卸载函数封装起来，因为后面要清除 `el` 事件、调用组件的生命周期等

✅ **区分 vnode 的类型**

在更新时判断 `vnode.type` 做不同的 `patch`

✅ **事件的处理**

约束在 `props` 中以 `on` 开头的都算作事件

伪造一个事件处理函数 `invoker` ，将 `invoker` 绑定到 `addEventListener` 上。在每次更新事件时更新 `invoker` 的 `value` 即可

使用 `invoker` 既可以提升性能也可以解决事件冒泡与事件更新直接相互影响的问题( 🍓 **invoker 相关代码极其巧妙，可以品尝一下** )

✅ **事件冒泡与更新时机问题**

可能存在子元素点击事件发生后冒泡到父元素，但父元素初始并没有绑定点击事件，而是在不确定的微任务队列中绑定的，所以会触发父元素的点击事件。

所以只要屏蔽绑定事件晚于事件触发时间的事件处理函数即可：

在绑定时使用 `performance.now()` 来记录绑定时间 (**记录从页面初始化完成到绑定时所经过的的时长，精度可达微秒级**) ，

在触发时使用 `e.timeStamp` 来获取触发时间 (**记录从页面初始化完成到用户点击的那一刻所经过的时长**) ，比较两者时间即可

✅ **更新子节点**

1️⃣ 根据新旧节点更新 `props`

2️⃣ 更新 `children`

- 新 `children` 类型为 `String`

  旧 `children` 类型为 `Array` ：遍历旧节点卸载后替换

  旧 `children` 类型为 `String`：直接替换

  旧 `children` 类型为 空 ：直接替换

- 新 `children` 类型为 `Array`

  旧 `children` 类型为 `Array` ：**Diff 算法**

  旧 `children` 类型为 `String`：直接替换

  旧 `children` 类型为 空 ：直接替换

- 新 `children` 类型为 空

  旧 `children` 类型为 `Array` ：遍历旧节点卸载

  旧 `children` 类型为 `String`：清空

  旧 `children` 类型为 空 ：都为空，什么也不做

✅ **文本节点和注释节点**

用 `Symbol()` 增加文本和注释节点的类型，在 `patch` 阶段做判断。对于使用到的 `DOM` 操作封装起来

✅ **Fragment**

- 为什么存在？

`Vue.js 2` 中必须且只有一个根节点，所以封装 `option` 这样的组件就只能外面加一层 `template`

```js
<template>
  <li>1</li>
  <li>2</li>
  <li>3</li>
</template>
```

或者

```js
 <Li v-for="item in list">
```

用 `Symbol()` 增加 `Fragment` 的类型，在 `patch` 阶段做判断

- 旧 `vnode` 不存在

  只需将 `Fragment` 的 `children` 逐个挂载

- 存在

  只需更新 `Fragment` 的 `children` 即可

📢 `unmount` 函数也要支持对 `Fragment` 类型的处理

## ⚛️ 简单 Diff 算法

```js
const oldVnode = [
  {
    type: 'p',
    key: 1,
    children: '1'
  },
  {
    type: 'p',
    key: 2,
    children: '2'
  },
  {
    type: 'p',
    key: 3,
    children: '3'
  }
]

const newVnode = [
  {
    type: 'p',
    key: 3,
    children: '3'
  },
  {
    type: 'p',
    key: 1,
    children: '2'
  },
  {
    type: 'p',
    key: 2,
    children: '2'
  }
]
```

✅ **减少 DOM 操作的性能开销**

不要重复的销毁和创建 `DOM` ，要找到可以复用的 `DOM` 节点

✅ **DOM 复用与 key 的作用**

用 `key` 是否相等来代表这个 `DOM` 可以复用

循环新节点，在旧节点中找到 `key` 相同的节点，就代表可以此旧节点可以复用。

- 如果 `key` 相同，则 `patch` ，更新内容

✅ **找到需要移动的元素**

在循环开始前定义 `lastIndex`

- 每次循环如果 `index < lastIndex` ，说明此节点需要移动
- 否则 `lastIndex = index`

✅ **如何移动元素**

找到上一个节点，如果上一个节点存在，则调用 `insert`

✅ **添加新元素**

在循环新节点时，每层都定义 `find = false`

如果找到 `key` 相等的则说明有可以复用的节点， `find = true` 。否则执行 `patch` 挂载

✅ **移除不存在的元素**

新节点循环结束后，单独循环旧节点，如果找不到 `key` 相等的，说明此旧节点不需要复用，执行卸载操作

## ⚛️ 双端 Diff 算法

✅ **双端比较的原理**

是一种对新旧两组子节点的两个端点进行比较的算法

判断是否符合 while(oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) ，逐个进行下面四个条件分支

- if(oldStartIdx.key === newStartIdx.key)

新旧**头部节点**相同，只需要 patch 及更新索引

- if(oldEndIdx.key === newEndIdx.key)

新旧**尾部节点**相同，只需要 patch 及更新索引

- if(oldStartIdx.key === newEndIdx.key)

**新尾部节点**与**旧头部节点**相同，需要更新 patch、移动旧节点到 oldEndVnode.el.nextSibling 后、更新索引

- if(oldEndIdx.key === newStartIdx.key)

**新头部节点**与**旧尾部节点**相同，需要更新 patch、移动旧节点到 oldStartVnode.el 前、更新索引

✅ **双端比较的优势**

可以减少对 DOM 移动的操作

✅ **非理想状况的处理方式**

在旧节点中寻找 node.key === newStartVNode.key 的节点作为要移动的节点的索引 idxInOld

接下来进行 patch、移动到 oldStartVNode.el 前、将 oldChildren[idxInOld] 置位 undefined、更新索引

✅ **添加新元素**
在上一步基础上，增加 idxInOld 小于 0 ，也就是没找到的逻辑，也就是新增，调用 patch(null, newStartVNode, container, oldStartVNode.el)、更新索引

并且在 while 结束后，还要考虑 oldEndIdx < oldStartIdx && newStartIdx <= newEndIdx 的情况，说明更新过程中有遗漏新节点，所以循环遗漏的新节点进行挂载

✅ **移除不存在的元素**

在上一步的基础上，增加 newEndIdx < newStartIdx && oldStartIdx <= oldEndIdx 的情况，说明在更新过程中，有遗漏旧节点，说明应该进行卸载

## ⚛️ 快速 Diff 算法

[inferno 所采用的核心 Diff 算法及原理](https://hcysunyang.github.io/vue-design/zh/renderer-diff.html#inferno-%E6%89%80%E9%87%87%E7%94%A8%E7%9A%84%E6%A0%B8%E5%BF%83-diff-%E7%AE%97%E6%B3%95%E5%8F%8A%E5%8E%9F%E7%90%86)

快速 Diff 算法包含预处理步骤，这是借鉴了纯文本 Diff 算法的思路

✅ **相同的前置元素和后置元素**

1. 从前往后依次对比，调用 patch 更新相同的**前置节点**

2. 从后往前依次对比，调用 patch 更新相同的**后置节点**

3. 如果旧节点遍历完 新节点没遍历完，需要挂载，用 (j > oldEnd && j <= newEnd) 来判断

4. 如果新节点遍历完 旧节点没遍历完，需要卸载，用 (j > newEnd && j <= oldEnd) 来判断

✅ **判断是否需要进行 DOM 移动操作**

5. 若都不符合上面的条件，新增 else 分支

采用传统 Diff 算法，但不真正的添加和移动，只是做标记和删除

定义 source 数组填充 -1

定义 keyIndex 索引表。循环 j - newEnd 以 vnode.key 为键，以索引为值构建索引表

创建变量 moved 作为标识，当值为 true 时说明需要进行移动，如果在遍历过程中遇到的索引值呈递增趋势，则说明不需要移动节点，反之则需要

除此之外，还需一个数量标识代表**已经更新过的节点数量**，已经更新的数量应该小于新的一组子节点需要更新的节点数量，如果超过则代表需要卸载

✅ **如何移动元素**

6. 根据 source 数组计算最长递增子序列 seq（seq 里面是递增的，所以符合的都不用移动）

从后往前循环 source

如果 source[i] === -1 ，说明是新元素，进行挂载操作

如果 seq[s] !== i ，说明不在递增子序列里面，需要移动

否则 s--

✅ **最长递增子序列**

```js
// 动态规划 O(n^2)
function lengthOfLIS(nums: number[]): number {
  const dp = new Array(nums.length).fill(1)
  let max = 1
  for (let i = 0; i < nums.length; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[i] > nums[j]) {
        dp[i] = Math.max(dp[j] + 1, dp[i])
      }
    }
    max = Math.max(max, dp[i])
  }

  return max
}
// 贪心 O(n^2)
// 保持局部递增，则全局递增
function lengthOfLIS(nums: number[]): number {
  const arr = [nums[0]]
  for (let i = 1; i < nums.length; i++) {
    // 比已保存的最后一个 小
    if (nums[i] <= arr[arr.length - 1]) {
      for (let j = 0; j < arr.length; j++) {
        if (arr[j] >= nums[i]) {
          arr[j] = nums[i]
          break
        }
      }
    } else {
      arr.push(nums[i])
    }
  }
  return arr.length
}
// 贪心 + 二分 O(nlogn)
function lengthOfLIS(nums: number[]): number {
  const arr = [nums[0]]
  for (let i = 1; i < nums.length; i++) {
    // 比已保存的最后一个 小
    if (nums[i] <= arr[arr.length - 1]) {
      let l = 0
      let r = arr.length - 1
      while (l <= r) {
        const mid = Math.round((r + l) / 2)
        if (arr[mid] < nums[i]) {
          // 要找的数字在右半区
          l = mid + 1
        } else if (arr[mid] > nums[i]) {
          // 要找的数字在左半区
          r = mid - 1
        } else {
          // 找到这个数字了
          l = mid
          break
        }
      }
      arr[l] = nums[i]
    } else {
      arr.push(nums[i])
    }
  }
  return arr.length
}

// 适用于 Diff 算法的寻找最长子序列
function getSequence(nums) {
  let arr = []
  let position = []
  for (let i = 0; i < nums.length; i++) {
    // 对需要挂载的 -1 做了处理
    if (nums[i] === -1) {
      continue
    }
    // arr[arr.length - 1]可能为undefined，此时nums[i] > undefined为false
    if (nums[i] > arr[arr.length - 1]) {
      arr.push(nums[i])
      position.push(arr.length - 1)
    } else {
      let l = 0,
        r = arr.length - 1
      while (l <= r) {
        let mid = ~~((l + r) / 2)
        if (nums[i] > arr[mid]) {
          l = mid + 1
        } else if (nums[i] < arr[mid]) {
          r = mid - 1
        } else {
          l = mid
          break
        }
      }
      arr[l] = nums[i]
      position.push(l)
    }
  }
  let cur = arr.length - 1
  // 这里复用了arr，它本身已经没用了
  for (let i = position.length - 1; i >= 0 && cur >= 0; i--) {
    if (position[i] === cur) {
      arr[cur--] = i
    }
  }
  return arr
}
```

✅ **总结**

快速 Diff 算法在实测中性能最优。它借鉴了文本 Diff 中的预处理思路，先处理新旧两组子节点中相同的前置节点和后置节点。当前置节点和后置节点全部处理完毕后，如果无法简单地通过挂载新节点或者卸载已经不存在的节点来完成更新，则需要根据节点的索引关系，构造出一个最长递增子序列。最长递增子序列所指向的节点即为不需要移动的节点
