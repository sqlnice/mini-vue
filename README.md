# `mini-vue`

⏳ 逐步实现 `Vue 3` 大部分功能

# 目录结构

- `scripts`

  - `rollup.config.dev.js` 本地开发
  - `rollup.config.port.js` 打包

- `src`
  - `examples` 本地开发默认打开此页面
  - `reactivity` 响应式系统
- `vue3`

  `Vue 3` 源码

# 响应系统

`reactive` 与 `effect`如何建立联系，核心就是在触发访问时，使用 `track` 进行依赖收集，在响应式对象的值变化时，触发更新 `trigger`

`依赖收集`就是保存副作用函数与响应式对象的关系

`触发更新`就是当响应式对象变化时找到并执行依赖于他的副作用函数

1. 执行副作用函数
2. 访问响应式对象过程中发现依赖，保存响应式对象所对应的副作用函数，依赖收集
3. 响应式对象的值发生变化时，触发更新

<details>
<summary>effect</summary>

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

</details>

<details>
<summary>reactive</summary>

### 代理对象

✅ **嵌套 `reactive(reactive(obj))`**

在 `get` 拦截器增加 `__v_isReactive`

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

</details>

<details>
<summary>computed</summary>

与 `reactive` 相似，不同点：

✅ **`computed` 中副作用函数不会立即执行**

`effect` 第二个参数增加 `options.lazy = true`

✅ **依赖改变时不会计算，只有取的时候才会去计算**

使用 `value`、`dirty`、`effect` 的 `scheduler` 参数来控制缓存和计算

✅ **`effect` 中使用 `computed` 的值引发 `effect` 嵌套**

当读取计算属性的值时，手动调用 `track` 进行追踪；当计算属性值变化时，手动调用 `trigger` 触发响应

</details>

<details>
<summary>watch</summary>

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

</details>

<details>
<summary>ref</summary>

本质是一个“包裹对象”。因为 `JavaScript` 的 `Proxy` 无法提供对原始值的代理，所以需要用一层对象来包裹，简介实现原始值的响应式方案。由于“包裹对象”本质上与普通对象没有任何区别，为了区分 `ref` 与普通对象，我们为“包裹对象”定义了 `__v_isRef` 为 `true` 的属性，用来表示 `ref`

✅ **普通 `ref`**
✅ **解决响应丢失问题**

增加 `toRef`、`toRefs`

✅ **自动脱 `ref`**

</details>

# 渲染器

<details>
<summary>渲染器设计</summary>

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

</details>

<details>
<summary>挂载与更新</summary>

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

</details>

<details>
<summary>简单 Diff 算法</summary>

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

</details>

<details>
<summary>双端 Diff 算法</summary>

✅ **双端比较的原理**

是一种对新旧两组子节点的两个端点进行比较的算法

判断是否符合 `while(oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx)` ，逐个进行下面四个条件分支

- `if(oldStartIdx.key === newStartIdx.key)`

新旧**头部节点**相同，只需要 `patch` 及更新索引

- `if(oldEndIdx.key === newEndIdx.key)`

新旧**尾部节点**相同，只需要 `patch` 及更新索引

- `if(oldStartIdx.key === newEndIdx.key)`

**新尾部节点**与**旧头部节点**相同，需要更新 `patch`、移动旧节点到 `oldEndVnode.el.nextSibling` 后、更新索引

- `if(oldEndIdx.key === newStartIdx.key)`

**新头部节点**与**旧尾部节点**相同，需要更新 `patch`、移动旧节点到 `oldStartVnode.el` 前、更新索引

✅ **双端比较的优势**

可以减少对 `DOM` 移动的操作

✅ **非理想状况的处理方式**

在旧节点中寻找 `node.key === newStartVNode.key` 的节点作为要移动的节点的索引 `idxInOld`

接下来进行 `patch`、移动到 `oldStartVNode.el` 前、将 `oldChildren[idxInOld]` 置为 `undefined`、更新索引

✅ **添加新元素**
在上一步基础上，增加 `idxInOld` 小于 0 ，也就是没找到的逻辑，也就是新增，调用 `patch(null, newStartVNode, container, oldStartVNode.el)`、更新索引

并且在 `while` 结束后，还要考虑 `oldEndIdx < oldStartIdx && newStartIdx <= newEndIdx` 的情况，说明更新过程中有遗漏新节点，所以循环遗漏的新节点进行挂载

✅ **移除不存在的元素**

在上一步的基础上，增加 `newEndIdx < newStartIdx && oldStartIdx <= oldEndIdx` 的情况，说明在更新过程中，有遗漏旧节点，说明应该进行卸载

</details>

<details>
<summary>快速 Diff 算法</summary>

[inferno 所采用的核心 Diff 算法及原理](https://hcysunyang.github.io/vue-design/zh/renderer-diff.html#inferno-%E6%89%80%E9%87%87%E7%94%A8%E7%9A%84%E6%A0%B8%E5%BF%83-diff-%E7%AE%97%E6%B3%95%E5%8F%8A%E5%8E%9F%E7%90%86)

快速 `Diff` 算法包含预处理步骤，这是借鉴了纯文本 `Diff` 算法的思路

✅ **相同的前置元素和后置元素**

1. 从前往后依次对比，调用 `patch` 更新相同的**前置节点**

2. 从后往前依次对比，调用 `patch` 更新相同的**后置节点**

3. 如果旧节点遍历完 新节点没遍历完，需要挂载，用 `(j > oldEnd && j <= newEnd)` 来判断

4. 如果新节点遍历完 旧节点没遍历完，需要卸载，用 `(j > newEnd && j <= oldEnd)` 来判断

✅ **判断是否需要进行 DOM 移动操作**

5. 若都不符合上面的条件，新增 `else` 分支

采用传统 `Diff` 算法，但不真正的添加和移动，只是做标记和删除

定义 `source` 数组填充 `-1`

定义 `keyIndex` 索引表。循环 `j - newEnd` 以 `vnode.key` 为键，以索引为值构建索引表

创建变量 `moved` 作为标识，当值为 `true` 时说明需要进行移动，如果在遍历过程中遇到的索引值呈递增趋势，则说明不需要移动节点，反之则需要

除此之外，还需一个数量标识代表**已经更新过的节点数量**，已经更新的数量应该小于新的一组子节点需要更新的节点数量，如果超过则代表需要卸载

✅ **如何移动元素**

6. 根据 `source` 数组计算最长递增子序列 `seq`（`seq` 里面是递增的，所以符合的都不用移动）

从后往前循环 `source`

如果 `source[i] === -1` ，说明是新元素，进行挂载操作

如果 `seq[s] !== i` ，说明不在递增子序列里面，需要移动

否则 `s--`

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

快速 `Diff` 算法在实测中性能最优。它借鉴了文本 `Diff` 中的预处理思路，先处理新旧两组子节点中相同的前置节点和后置节点。当前置节点和后置节点全部处理完毕后，如果无法简单地通过挂载新节点或者卸载已经不存在的节点来完成更新，则需要根据节点的索引关系，构造出一个最长递增子序列。最长递增子序列所指向的节点即为不需要移动的节点

</details>

# 组件化

<details>
<summary>组件的实现原理</summary>

✅ **渲染组件**

- 如何描述组件

用虚拟节点的 `vnode.type` 来存储组件的选项对象

组件本身是对页面内容的描述，所以必须包含 `render` 函数

- 如何挂载与更新

在 `patch` 判断 `vnode.type` 是否为 `object`，并继续执行 `mountComponent` 或者 `patchComponent`

✅ **组件状态与自更新**

- 如何实现组件状态的初始化

1. 通过组件的选项对象取得 `data` 函数并执行，然后调用 `reactive` 函数将 `data` 函数返回的状态包装为响应式数据 `state`

2. 在调用 `render` 函数时，将其 `this` 指向 `state`

- 自更新

实现一个调度器，使得在一定时间内无论对响应式数据进行多少次修改，副作用函数只会执行一次

✅ **组件实例与生命周期**

组件实例是一个状态集合，它维护着组件运行过程中的所有信息，包括生命周期、组件渲染的子树（subTree）、是否已挂载等等

```js
const instance = {
  state, // 响应式数据 data
  isMounted: false, // 是否已挂载
  subTree: null // 子树
}
```

由于已经可以区分是否挂载和更新，因此，可以在合适的时机调用组件对应的生命周期钩子

✅ **props 与组件的被动更新**

1. 为组件传递的 `props` 数据，即组件的 `vnode.props`

2. 组件选项对象中定义需要接收的 `props` 选项，即 `MyComponent.props` 对象

对上述两个 `props` 进行合并处理，没有出现在 2 中的则挂载到 `attrs` 中

由父组件自更新引起的子组件更新叫做子组件的被动更新，当被动更新发生时需要做：

1. 使用 `hasPropsChanged` 检测子组件是否需要更新，因为子组件的 `props` 可能不变

2. 如果需要更新，则更新子组件的 `props、slots` 等

由于 `props` 数据与组件自身的状态都需要暴露在渲染函数中，并使得 `render` 能够通过 `this` 访问他们，所以需要封装一个渲染上下文对象（使用 `Proxy` 来代理 `state` 或者 `props`）

✅ **setup 函数的作用与实现**

`setup` 只会在挂载时执行一次，返回值可以有两种情况：

1. 返回一个函数，该函数将作为组件的 `render` 函数。这种方式常用语组件不是以模板来表达内容的情况，也就是说没有 `template` 或者 `render`，如果都存在那么就会产生冲突

```js
const Comp = {
  setup() {
    return () => ({ type: 'div', children: 'hello' })
  }
}
```

2. 返回一个对象，该对象中包含的对象将暴露给模板使用

```js
const Comp = {
  setup() {
    const count = ref(0)
    return { count }
  },
  render() {
    // 通过 this 访问 setup 暴露出来的响应式数据
    return { type: 'div', children: `count is ${this.count}` }
  }
}
```

在实现 `setup` 时，注意以下几点

1. `setup` 接收两个参数， `props` 和 `setupContext`

2. `setupContext` 是一个对象，由于还没到 `emit` 和 `slots` 篇章，因此 `setupContext` 暂时只包括 `attrs`

3. 通过检测 `setup` 的返回值类型来决定如何处理

4. 渲染上下文 `renderContext` 也应该正确处理 `setupState` ，因为 `setup` 函数返回的数据状态也应该暴露到渲染环境

✅ **组件事件与 `emit` 的实现**

定义一个 `emit` 函数，放在 `setupContext` 中

`emit` 函数用来寻找 `props` 中事件的名称，但是在处理 `props` 时，我们只处理了组件选项对象中显示声明为 `props` 的属性。所以我们在处理 `props` 时，还要加一个判断，当 `vnode.props.key` 以 `On` 开头时看做事件，也放到组件选项对象 `props` 中

✅ **插槽的工作原理与实现**

子组件 `MyComponent`

```HTML
<tempalte>
  <header><slot name="header"></slot></header>
</tempalte>
```

子组件 `MyComponent` 的模板会被编译为以下渲染函数：

```js
function render() {
  return [
    {
      type: 'header',
      children: [this.$slots.header()]
    }
  ]
}
```

父组件

```HTML
<MyComponent>
  <template #header>
    <h1>我是标题</h1>
  </template>
</MyComponent>
```

父组件模板会被编译为以下渲染函数：

```js
function render() {
  return {
    type: MyComponent,
    children: {
      header() {
        return { type: 'h1', children: '我是标题' }
      }
    }
  }
}
```

可以直观的看到，渲染插槽内容的过程就是调用插槽函数并渲染，同样我们需要在 `renderContext` 中对 `$slots` 的访问做代理

✅ **注册生命周期**

以 `onMounted` 为例，首先对于不同组件在 `setup` 实例化过程中注册各自的生命周期防止混乱的解决方式就是定义一个 `currentInstance` 变量，然后在 `onMounted` 函数内判断是否存在 `currentInstance` ，并保存在 `currentInstance.mounted` 数组中。调用时需要遍历执行

</details>

<details>
<summary>异步组件与函数式组件</summary>

✅ **异步组件要解决的问题**

本质也是一个组件，返回 `setup` 或者 `render` ，指以异步的方式加载并渲染一个组件，这在代码分割、服务端下发组件等场景中尤为重要。异步组件的实现用户可以自定义实现，但整体实现比较复杂，考虑的边界情况也比较多，所以需要在框架层面为异步组件提供更好的封装与支持：

- 允许用户指定组件加载失败或者超时，渲染的 `Error` 组件

- 允许用户指定 `Loading` 组件，以及该组件的延迟时间

- 允许用户设置加载组件的超时时长

- 组件加载失败时，为用户提供重试的能力

✅ **异步组件的实现原理**

```js
const LoadingComponent = {
  setup() {
    return { type: 'h2', children: 'Loading...' }
  }
}
const ErrorComponent = {
  setup() {
    return { type: 'h2', children: 'Error...' }
  }
}
const AsyncComp = defineAsyncComponent({
  loader: () => import('./Foo.vue'),

  loadingComponent: LoadingComponent,
  delay: 200,

  errorComponent: ErrorComponent,
  timeout: 3000
})
```

✅ **函数式组件**

使用

```js
function MyFuncComponent(props) {
  return { type: 'h1', children: props.title }
}
MyFuncComponent.props = {
  title: String
}
const CompVNode = {
  type: MyFuncComponent,
  props: { title: 'Title' }
}
effect(() => {
  renderer.render(CompVNode, document.getElementById('app'))
})
```

函数式组件和有状态组件基本一致，在 `Vue.js 3` 中，函数式组件改为上面的使用方法，所以我们只需要在 `mountComponent` 中判断 `type` 为 `Function` 时，重新组装一下 `vnode.type`

```js
// 获取组件的选项对象
let { type: componentOptions } = vnode
const isFunctional = isFunction(componentOptions)
if (isFunctional) {
  componentOptions = {
    render: vnode.type,
    props: vnode.type.props
  }
}
```

</details>

<details>
<summary>内建组件和模块</summary>

✅ **KeepAlive 组件的实现原理**

本质为一个 `VNode` ，里面包含 `setup` 、 `_isKeepAlive` ，实现需要渲染器层面的支持。

被 `KeepAlive` 包裹的组件成为“内部组件”，`KeepAlive` 会对“内部组件”进行操作并返回，主要操作是在“内部组件”的 `vnode` 对象上添加一些标记属性，以便渲染器能据此执行特定的逻辑。几个标记属性如下：

- `shouldKeepAlive`: 在渲染器卸载时，如果遇到此属性则代表不是真的卸载，而是执行 `vnode.keepAliveInstance._deActivate` 方法完成搬运工作（隐藏起来）

- `keepAliveInstacne`: 在 `unmount` 时，通过 `keepAliveInstance` 来访问 `_deActivate` 函数

- `keptAlive`: 当“内部组件”需要重新渲染时，并不是真的渲染，而是会调用 `vnode.keepAliveInstance._activate` 将其激活

支持根据规则进行缓存：定义 `include` 和 `exclude`，如果匹配到则不缓存

✅ **Teleport 组件的实现原理**

`Teleport` 也需要渲染器支持，不过 `Teleport` 组件的渲染逻辑要从渲染器中分离出来，这么做有两个好处

- 避免渲染器逻辑代码“膨胀”

- 当用户没有使用 `Teleport` 组件时，可以有效利用 `Tree-Shaking` 使得构建包体积变小

用户编写的模板

```html
<Teleport to="body">
  <h1>Title</h1>
  <p>Content</p>
</Teleport>
```

会被编译为：

```js
{
  type:Teleport,
  children:[
    {type:'h1',children:'Tille'},
    {type:'p',children:'Content'},
  ]
}
```

所以我们需要在组件挂载时判断为 `Teleport` 组件，调用组件选项中定义的 `process` 函数将渲染控制权完全交接过去

✅ **Transition 组件的实现原理**

核心原理

- 当 `DOM` 元素被挂载时，将动效附加到该 `DOM` 元素上

- 当 `DOM` 元素被卸载时，不要立即卸载，而是等到附加到该 `DOM` 元素上的动效执行完毕后再卸载它

用户编写的模板：

```html
<Transition>
  <h1>我是需要过渡的元素</h1>
</Transition>
```

会被编译为：

```js
{
  type: Transition,
  children: {
    default() {
      return { type:'div', children: '我是需要过渡的元素'}
    }
  }
}
```

在特定的 `mountElement` 和 `unmount` 时机，调用 `vnode.transition.beforeEnter` 等函数，把控制权交给 `Transition` 组件

`vnode.transition.beforeEnter` 函数做的也只是给 `DOM` 元素增加或者移除 `className`

</details>

# 编译器

[编译器相关流程图](https://docs.qq.com/s/Fa3eqX3yv0IztS1RxseXjG)

![完整编译过程流程图](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c244138f40d84e4991f54cdd9eaae494~tplv-k3u1fbpfcp-watermark.image?)

<details>
<summary>编译器核心技术概览</summary>

编译技术是一门包含内容非常多的学科，在 `JavaScript、C` 等通用用途语言的实现上需要掌握较多编译技术知识。但是 `Vue.js` 的模板和 `JSX` 都属于领域特定语言，实现难度属于中、低级别，在这篇章只要掌握基本的编译技术理论即可实现功能

✅ **模板 DSL 的编译器**

对于 `Vue.js` 模板编译器来说，源代码就是组件的模板，目标代码就是能在浏览器平台上运行的 `JavaScript` 代码。即 `Vue.js` 模板编译器的模板代码就是渲染函数 `render(){ /.../}`，大致流程为下图

![Vue.js 模板编译器工作流程](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5f1d0e07fd164e28960bf8af6e29e18f~tplv-k3u1fbpfcp-watermark.image?)

其中模板 `AST` 即用来描述模板的抽象语法树：

```html
<div>
  <h1 v-if="ok">Vue Template</h1>
</div>
```

上述模板会被编译为如下所示的 `AST`：

```js
const ast = {
  type: 'Root',
  children: [
    {
      type: 'Element',
      tag: 'div',
      children: [
        {
          type: 'Element',
          tag: 'h1',
          props: [
            {
              type: 'Directive',
              name: 'if',
              exp: {
                type: 'Expression',
                content: 'ok'
              }
            }
          ]
        }
      ]
    }
  ]
}
```

通过上面的 `AST` 可以得出

- 节点的类型是通过 `type` 来区分的

- 子节点存储在 `children` 中

- 不同节点拥有不同的对象属性

我们可以通过封装 `parse` 函数来完成对模板的词法分析和语法分析得到模板 `AST` ，然后进行语义分析。**语义分析是指分析属性值是否为静态、检查 `v-else` 是否存在配合的 `v-if` 指令等**

然后封装 `transform` 函数来完成模板 `AST` 到 `JavaScript AST` 的转换工作

最后封装 `generate` 函数来生成渲染函数

用代码表示：

```js
const templateAST = parse(template)
const jsAST = transform(templateAST)
const code = generate(jsAST)
```

用流程图表示：

![将 Vue.js 模板编译为渲染函数的完整流程](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/71f4175547aa4b15a94dcdf00e934bb7~tplv-k3u1fbpfcp-watermark.image?)

✅ **parse 的实现原理与状态机**

- 对模板的标记化

使用**有限状态自动机**切割 `Token`

后续可以通过正则表达式来精简 `tokenzie` 函数的代码，正则表达式的本质就是有限状态机

对于一段模板可以通过 `tokenzie` 求出 `Token` 的集合

```js
const tokens = tokenzie('<div><p>Vue</p><p>Template</p></div>')
```

⬇️

```js
const tokens = [
  { type: 'tag', name: 'div' },
  { type: 'tag', name: 'p' },
  { type: 'text', name: 'Vue' },
  { type: 'tagEnd', name: 'p' },
  { type: 'tag', name: 'p' },
  { type: 'text', name: 'Template' },
  { type: 'tagEnd', name: 'p' },
  { type: 'tagEnd', name: 'div' }
]
```

✅ **构造 AST**

我们的模板最终对应的 `AST` 结构为：

```js
const ast = {
  type: 'Root',
  children: [
    {
      type: 'Element',
      tag: 'div',
      children: [
        {
          type: 'Element',
          tag: 'p',
          children: [{ type: 'Text', content: 'Vue' }]
        },
        {
          type: 'Element',
          tag: 'p',
          children: [{ type: 'Text', content: 'Template' }]
        }
      ]
    }
  ]
}
```

所以我们在构造 `AST` 过程，就是对 `Token` 列表进行扫描。定义 `elementStack` 用来维护元素间的父子关系。每遇到**开始标签节点**就创建一个 `Element` 类型的 `AST` 节点

✅ **AST 的转换与插件化架构**

`AST` 转换指对 `AST` 进行一系列操作，将其转换为新的 `AST` 的过程。新的 `AST` 可以是原语言或者原 `DSL` 的描述，也可以是其他语言或者其他 `DSL` 的描述。例如我们对模板 `AST` 进行转换为 `JavaScript AST`。在编译器一开始的流程图中， `transform` 函数就是用来完成 `AST` 转换工作的

- 节点的访问

从 `AST` 根节点开始，进行深度优先遍历 **回溯**

下面是最简实现，将节点操作注册在 `nodeTransforms` 数组中

```js
/**
 * 转换函数
 * @param {*} ast
 */
export const transform = ast => {
  const context = {
    nodeTransforms: [transformElement, transformText]
  }
  traverseNode(ast, context)
  dump(ast)
}
/**
 * 深度优先遍历访问节点
 * @param {*} ast
 * @param {*} context
 */
export const traverseNode = (ast, context) => {
  const currentNode = ast
  const transforms = context.nodeTransforms
  if (transforms.length) {
    for (let i = 0; i < transforms.length; i++) {
      transforms[i](currentNode, context)
    }
  }
  const children = currentNode.children
  if (children) {
    for (let i = 0; i < children.length; i++) {
      traverseNode(children[i], context)
    }
  }
}
```

- 转换上下文与节点操作

1. 为什么需要 `context` 而不是直接把 `nodeTransforms` 作为参数传进去？

`Context` 可以视作程序在某个范围内的“全局变量”，比如我们在 `Vue` 中使用的 `provide/inject` ，也可以看作为全局上下文

```js
const context = {
  // 当前正在转换的节点
  currentNode: null,
  // 用来存储当前节点在父节点中的位置索引
  childIndex: 0,
  // 父节点
  parent: null,
  nodeTransforms: []
}
```

2. 节点替换操作

在 `context` 中定义 `replaceNode` 函数，通过 `context.parent.children[chilIndex] = node` 来替换

3. 节点移除操作

在 `context` 中定义 `removeNode` 函数，通过 `context.parent.children.splice(context.childIndex,1)` 来移除

由于被移除，所以在执行完毕后要判断 `context.context.currentNode` 不存在的话直接返回

- 进入与退出

我们需要知道每次转换完成之后，在这个基础上还要做特定的一些操作。目前的实现只能挨个执行没有退出机制，满足不了。所以我们这样设计：

```js
export const traverseNode = (ast, context) => {
  const currentNode = ast
  // 用来解决 进入与退出 的问题
  const exitFns = []
  const transforms = context.nodeTransforms

  if (transforms.length) {
    for (let i = 0; i < transforms.length; i++) {
      const onExit = transforms[i](currentNode, context)
      // 存起来
      if (onExit) {
        exitFns.push(onExit)
      }
      if (!context.currentNode) return
    }
  }

  const children = currentNode.children
  if (children) {
    for (let i = 0; i < children.length; i++) {
      context.parent = currentNode
      context.childIndex = i
      traverseNode(children[i], context)
    }
  }

  // 节点处理的最后阶段执行缓存到 exitFns 中的回调
  let i = exitFns.length
  while (i--) {
    exitFns[i]()
  }
}
```

✅ **将模板 AST 转换为 `JavaScript AST`**

为什么要将模板 `AST` 转换为 `JavaScript AST`？

我们最终要实现将模板 `AST` (`<div><p>Vue</p><p>Template</p><div>`)转换为渲染函数，也就是下面的代码

```js
function render() {
  return h('div', [h('p', 'Vue'), h('p', 'Template')])
}
```

可以看出 `JavaScript AST` 是 `JavaScript` 代码的描述，所以本质上需要设计一些数据结构来描述渲染函数的代码

- 函数声明

```js
const FunctionDeclNode = {
  type: 'FunctionDecl', // 代表该节点是函数声明
  id: {
    type: 'Identifier', // 标识符
    name: 'render' // 渲染函数的名称
  },
  params: [], // 参数
  body: [
    {
      type: 'ReutrnStatement',
      return: null
    }
  ]
}
```

- 返回值

```js
const callExp = {
  type: 'CallExpression',
  // 被调用函数的名称，是一个标识符
  callee: {
    type: 'Identifier',
    name: 'h'
  },
  // 参数
  arguments: []
}
```

- 字符串

```js
const Str = {
  // 字符串字面量
  type: 'StringLiteral',
  value: 'div'
}
```

- 数组

```js
const Arr = {
  type: 'ArrayExperssion',
  // 数组中的元素
  elements: []
}
```

所以最终的函数声明为：

```js
const FunctionDeclNode = {
  type: 'FunctionDecl', // 代表该节点是函数声明
  id: {
    type: 'Identifier',
    name: 'render' // 渲染函数的名称
  },
  params: [], // 参数
  body: [
    {
      type: 'ReutrnStatement',
      // 最外层 h 函数的调用
      return: {
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'h' },
        arguments: [
          // 字符串字面量 div
          {
            type: 'StringLiteral',
            value: 'div'
          },
          {
            type: 'ArrayExpression',
            elements: [
              // h 函数的调用
              {
                type: 'CallExpression',
                callee: { type: 'Identifier', name: 'h' },
                arguments: [
                  { type: 'StringLiteral', value: 'p' },
                  { type: 'StringLiteral', value: 'Vue' }
                ]
              },
              {
                type: 'CallExpression',
                callee: { type: 'Identifier', name: 'h' },
                auguments: [
                  { type: 'StringLiteral', value: 'p' },
                  { type: 'StringLiteral', value: 'Vue' }
                ]
              }
            ]
          }
        ]
      }
    }
  ]
}
```

除此之外我们还需要创建 `JavaScript AST` 节点的辅助函数

```js
// 创建 StringLiteral 节点
export const createStringLiteral = value => {
  return {
    type: 'StringLiteral',
    value
  }
}

// 创建 Identifier 节点
export const createIdentifier = name => {
  return {
    type: 'Identifier',
    name
  }
}

// 创建 ArrayExpression 节点
export const createArrayExpression = elements => {
  return {
    type: 'ArrayExpression',
    elements
  }
}

// 创建 CallExpression 节点
export const createCallExpression = (callee, args) => {
  return {
    type: 'CallExpression',
    callee: createIdentifier(callee),
    arguments: args
  }
}
```

为了把模板 `AST` 转换为 `JavaScript AST`，还要更新 `transformElement` 和 `transformText` 函数，分别用来处理标签节点和文本节点

```js
// 转换标签节点
const transformElement = node => {
  return () => {
    if (node.tpye !== 'Element') return

    // 1.创建 h 函数调用语句
    const callExp = createCallExpression('h', [createStringLiteral(node.tag)])

    // 2.处理 h 函数的参数
    node.children.length === 1
      ? // 如果当前标签节点只有一个子节点，则直接使用子节点的 jsNode 参数
        callExp.arguments.push(node.children[0].jsNode)
      : // 否则创建一个 ArrayExpression 节点作为参数
        callExp.arguments.push(
          createArrayExpression(node.children.map(c => c.jsNode))
        )
    node.jsNode = callExp
  }
}

// 转换文本节点
const transformText = node => {
  if (node.type !== 'Text') return
  // 文本节点对应的 `JavaScript AST` 节点就是字符串字面量
  node.jsNode = createStringLiteral(node.content)
}
```

使用上面两个转换函数即可把模板 `AST` 转换为 `h` 函数的调用。最后还需要把用来描述 `render` 函数本身的函数声明语句节点附加到 `JavaScript AST` 中，所以需要编写 `transformRoot` 函数来实现对 `Root` 根节点的转换

```js
// 转换 Root 根节点
export const transformRoot = node => {
  return () => {
    if (node.type !== 'Root') return
    const vnodeJSAST = node.children[0].jsNode
    node.jsNode = {
      type: 'FunctionDecl',
      id: { type: 'Identifier', name: 'render' },
      params: [],
      body: [{ type: 'ReturnStatement', return: vnodeJSAST }]
    }
  }
}
```

经过这一步后，模板 `AST` 将转换为对应的 `JavaScript AST` ，并且可以通过根节点的 `node.jsNode` 来访问转换后的 `JavaScript AST`

✅ **代码生成**

代码生成本质上是字符串拼接的艺术

代码生成也需要上下文对象

```js
export function generate(node) {
  const context = {
    // 最终生成的代码
    code: '',
    push(code) {
      context.code += code
    },
    // 当前缩进
    currentIndent: 0,
    // 换行函数
    newLine() {
      context.code += `\n${'  '.repeat(context.currentIndent)}`
    },
    // 控制缩进
    ident() {
      context.currentIndent++
      context.newLine()
    },
    // 取消缩进
    deIdent() {
      context.currentIndent--
      context.newLine()
    }
  }

  genNode(node, context)
  return context.code
}
```

在 `genNode` 函数中，只需要匹配各种类型的 `JavaScript AST` 节点并调用对应的生成函数即可，下面为简单示例

```js
function genNode(node, context) {
  switch (node.type) {
    case 'FunctionDecl':
      genFunctionDecl(node, context)
      break
    case 'ReturnStatement':
      genReturnStatement(node, context)
      break
    case 'CallExpression':
      genCallExpression(node, context)
      break
    case 'StringLiteral':
      genStringLiteral(node, context)
      break
    case 'ArrayExpression':
      genArrayExpression(node, context)
      break
  }
}
function genFunctionDecl(node, context) {
  const { push, ident, deIdent } = context
  console.log(node)
  push(`function ${node.id.name}`)
  push('(')
  // 设置参数
  genNodeList(node.params, context)
  push(') ')
  push('{')
  // 缩进
  ident()
  // 函数体生成代码
  node.body.forEach(n => genNode(n, context))
  deIdent()
  push('}')
}
function genReturnStatement(node, context) {
  const { push } = context
  push('return ')
  genNode(node.return, context)
}

// ...
```

</details>

<details>
<summary>解析器</summary>

解析器（`parser`）本质是一个状态机，下面将更多的利用正则表达式来实现 `HTML` 解析器

关于 `HTML` 文本解析， `WHATWG` 定义了完整的错误处理和状态机的状态迁移流程，例如 `DATA`、`CDATA`、`RCDATA`、`RAWTEXT` 等

✅ **文本模式及其对解析器的影响**

文本模式指的是**解析器**在工作时进入的一种特殊状态，在不同的特殊状态下，解析器对文本的解析行为会有所不同

- 默认 `DATA` 模式

在默认的 `DATA` 模式下，解析器遇到字符 `<` 时，会切换到**标签开始状态**。当遇到字符 `&` 时，会切换到**字符引用状态**

- `<title>`标签、`<textarea>`标签，当解析器遇到这两个时，会切换到 `RCDATA` 模式

在 `RCDATA` 模式下，解析器不能识别标签元素，也就是在 `<textarea>` 内可以将字符 `<` 作为普通文本

- `<style>`、`<xmp>`、`<iframe>`、`<noembed>`、`<noscript>`等标签会切换到 `RAWTEXT` 模式

与 `RCDATA` 类似，但是不再支持 `HTML` 实体

- 当遇到`<![CDATA][`字符串时，会进入 `CDATA` 模式

将任何字符都作为普通字符处理

| 模式      | 能否解析标签 | 是否支持 HTML 实体 |
| --------- | ------------ | ------------------ |
| `DATA`    | **能**       | **是**             |
| `RCDATA`  | 否           | **是**             |
| `RAWTEXT` | 否           | 否                 |
| `CDATA`   | 否           | 否                 |

✅ **递归下降算法构造模板 AST**

解析器的基本架构模型

```js
export function parse(str) {
  // 上下文对象
  const context = {
    // 模板内容，用于消费
    source: str,
    // 初始模式为 DATA
    mode: TextModes.DATA
  }
  // 节点栈，初始为空
  const nodes = parseChildren(context, [])
  // 返回 Root 根节点
  return { type: 'Root', children: nodes }
}
```

`parseChildren` 本质也是状态机，其有多少种状态取决于子节点的类型数量，在 `Vue` 模板中，子节点可以是以下几种：

1. 标签节点 `<div>`

2. 文本插值节点 `{{ val }}`

3. 普通文本节点 `'text'`

4. 注释节点 `<!---->`

5. CDATA 节点 `<![CDATA[ xxx ]]>`

`parseChildren` 函数在解析模板过程中的状态迁移过程：

![parseChildren 函数在解析模板过程中的状态迁移过程](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f26e88269091489fa6a7b646d029aaf0~tplv-k3u1fbpfcp-watermark.image?)

```js
function parseChildren(context, ancestors) {
  // 用于存储子节点，是最终的返回值
  const nodes = []
  const { source, mode } = context
  while (!isEnd(context, ancestors)) {
    let node
    // 只有这两个模式才支持 HTML 实体
    if ([TextModes.DATA, TextModes.RCDATA].includes(mode)) {
      // 只有 DATA 模式才支持标签节点的解析
      if (mode === TextModes.data && source[0] === '<') {
        if (source[1] === '!') {
          if (source.startsWith('<!--')) {
            // 注释
            node = parseComment(context)
          } else if (source.startsWith('<![CDATA[')) {
            // CDATA
            node = parseCDATA(context, ancestors)
          }
        } else if (source[1] === '/') {
          // 结束标签
        } else if (/[a-z]/i.test(source[1])) {
          // 标签
          node = parseElement(context, ancestors)
        }
      } else if (source.startsWith('{{')) {
        // 解析插值
        node = parseInterpolation(context)
      }
    }

    // node 不存在，说明处于其他模式，直接作为文本处理
    if (!node) {
      node = parseText(context)
    }
    nodes.push(node)
  }
  return nodes
}
```

`parseElement` 做三件事：

1. 解析开始标签

2. 解析子标签

3. 解析结束标签

```js
function parseElement(context, ancestors) {
  // 解析开始标签
  const element = parseTag()
  // 递归调用 parseChildren 解析子标签
  element.children = parseChildren(context, ancestors)
  parseTag('end')
  return element
}
```

从上面的两段代码可以看到 `parseChildren` 是核心，在 `parseChildren` 运行过程中，为了处理标签节点，会调用 `parseElement` 解析函数，这会间接调用 `parseChildren` ，并产生新的状态机。随着标签嵌套层次的增加，会一直调用 `parseChildren` ，这就是“递归下降”中“递归”的含义。而上下级 `parseChildren` 会各自创建自己的模板 `AST` ，最终会构造出一棵树结构的 `AST` ，这就是“下降”的含义

✅ **状态机的开启与停止**

当解析器遇到开始标签时，会将该标签压入父级节点栈，同时开启新的状态机

当解析器遇到结束标签，并且父级节点栈中存在于该标签同名的开始标签节点时，会停止正在运行的状态机

```js
function isEnd(context, ancestors) {
  // 解析完毕直接返回
  if (!context.source) return true
  // 与父级节点栈内所以节点做比较
  for (let i = ancestors.length - 1; i >= 0; --i) {
    // 只要栈中存在于当前结束标签同名的节点，就停止
    if (context.source.startsWith(`</${ancestors[i].tag}`)) {
      return true
    }
  }
}
```

✅ **解析标签节点**

```js
function parseElement(context, ancestors) {
  // 解析开始标签
  const element = parseTag(context)
  // 自闭和标签
  if (element.isSelfClosing) return element

  // 切换到正确的模式
  if (['textarea', 'title'].includes(element.tag)) {
    context.mode = TextModes.RCDATA
  } else if (/style|xmp|iframe|noembed|noframes|noscript/.test(element.tag)) {
    context.mode = TextModes.RAWTEXT
  } else {
    context.mode = TextModes.DATA
  }

  // 回溯
  ancestors.push(element)
  // 递归调用 parseChildren 解析子标签
  element.children = parseChildren(context, ancestors)
  ancestors.pop()

  // 理论来说消费完子标签后最后应该最剩下的应该是 </div>
  if (context.source.startsWith(`</${element.tag}`)) {
    parseTag(context, 'end')
  } else {
    console.error(`${element.tag} 标签缺少闭合标签`)
  }
  return element
}

function parseTag(context, type = 'start') {
  const { advanceBy, advanceSpaces } = context

  const match =
    type === 'start'
      ? // 匹配开始标签
        /^<([a-z][^\t\r\n\f  />]*)/i.exec(context.source)
      : // 匹配结束标签
        /^<\/([a-z][^\t\r\n\f  />]*)/i.exec(context.source)
  // 标签名称
  const tag = match[1]
  // 消费正则表达式匹配到的全部内容，例如 <div>
  advanceBy(match[0].length)
  // 消费空白字符
  advanceSpaces()
  const isSelfClosing = context.source.startsWith('/>')
  // 如果自闭和标签，消费 /> 否则消费 >
  advanceBy(isSelfClosing ? 2 : 1)
  return {
    type: 'Element',
    tag,
    // 标签属性
    props: [],
    // 子节点
    children: [],
    // 是否为自闭和标签
    isSelfClosing
  }
}
```

✅ **解析属性**

上一节的 `parseTag` 会消费整个开始标签，意味着解析属性的过程也要放在这个过程中

```HTML
<div id="foo" v-show="display"/>
```

`parseAttributes` 函数消费模板内容的过程，就是不断地解析属性名称、等于号、属性值的过程

![parse 解析器 - 解析属性](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f128cc327ad7458890cb5b7ccf7a679d~tplv-k3u1fbpfcp-watermark.image?)

```js
function parseAttributes(context) {
  const { advanceBy, advanceSpaces } = context
  const props = []
  // 不断消费模板内容，直到遇到标签的结束部分
  while (!context.source.startsWith('>' && !context.source.startsWith('/>'))) {
    //
  }
  return props
}
```

```HTML
<div id="foo" v-show="display"/>
```

经过解析后的属性为：

```js
const ast = {
  type: 'Root',
  children: [
    {
      type: 'Element',
      tag: 'div',
      props: [
        { type: 'Attribute', name: 'id', value: 'foo' },
        { type: 'Directive', name: 'v-show', value: 'display' }
      ],
      children: [],
      isSelfClosing: false
    }
  ]
}
```

✅ **解析文本与解析 HTML 实体**

- 解析文本

```js
function parseText(context) {
  // 默认整个模板剩余部分都作为文本内容
  let endIndex = context.source.length
  // 寻找字符 < 的位置索引
  const ltIndex = context.source.indexOf('<')
  // 寻找插值 {{ 的位置索引
  const delimiterIndex = context.source.indexOf('{{')
  if (ltIndex > -1 && ltIndex < endIndex) {
    endIndex = ltIndex
  }
  if (delimiterIndex > -1 && delimiterIndex < endIndex) {
    endIndex = delimiterIndex
  }
  // 截取文本内容
  const content = context.source.slice(0, endIndex)
  // 消费文本内容
  context.advanceBy(content.length)

  return {
    type: 'Text',
    content
  }
}
```

- 解析 `HTML` 实体

`HTML` 实体是以一段以字符 `&` 开始文本内容。实体用来描述 `HTML` 中的保留字符和一些难以通过键盘输入的字符，以及一些不可见的字符，例如 `<` 。`HTML` 实体有两类，分别叫**命名字符引用**和**数字字符引用**

为什么 `Vue.js` 模板的解析器会对文本节点中的 `HTML` 实体进行解码？

在 `Vue.js` 模板中，文本节点包含的 `HTML` 内容不会被浏览器解析，是因为模板中的文本最终通过 `el.textContent = '&lt;'` 来设置的，在这里只是字符串，并不是理想中的 `<` 。所以我们应该在解析的时候对文本节点中存在的 `HTML` 实体进行解码

```js
// rawText 被解码的文本内容
// asAttr 是否作为属性值
function decodeHtml(rawText, asAttr = false) {
  let offset = 0
  const end = rawText.length
  // 最终返回值
  let decodedText = ''
  // 引用表中实体名称的最大长度
  let maxCRNameLength = 0

  // 用于消费指定长度的文本
  function advance(length) {
    offset += length
    rawText = rawText.slice(length)
  }

  // 消费字符串，直到处理完毕
  while (offset < end) {
    // 匹配字符引用的开始部分，如果匹配成功，那么 head[0] 的值将有三种可能
    // 1. head[0] === '&' 说明该字符引用是命名字符引用
    // 2. head[0] === '&#' 说明该字符引用是用十进制表示的数字字符引用
    // 2. head[0] === '&#x' 说明该字符引用是用十六进制表示的数字字符引用
    const head = /&(?:#x?)?/i.exec(rawText)
    // 没有匹配，说明已经没有需要解码的内容了
    if (!head) {
      // 计算剩余内容的长度
      const remaining = end - offset
      decodedText += rawText.slice(0, remaining)
      // 消费剩余内容
      advance(remaining)
      break
    }

    // head.index 为匹配的字符 & 在 rawText 中的索引
    // 截取字符 & 之前的内容加到 decodedText 上
    decodedText += rawText.slice(0, head.index)
    // 消费字符 & 之前的内容
    advance(head.index)

    // 满足条件则说明是命名字符引用，否则为数字字符引用
    if (head[0] === '&') {
      // Named character reference.
      let name = ''
      let value
      // 字符 & 的下一个字符必须是 ASCII 字母或数字
      if (/[0-9a-z]/i.test(rawText[1])) {
        // 根据引用表计算实体名称的最大长度
        if (!maxCRNameLength) {
          maxCRNameLength = Object.keys(namedCharacterReferences).reduce(
            (max, name) => Math.max(max, name.length),
            0
          )
        }
        // 从最大长度开始对文本进行截取，并试图去引用表中找到此项
        for (let length = maxCRNameLength; !value && length > 0; --length) {
          name = rawText.substr(1, length)
          value = namedCharacterReferences[name]
        }
        // 有值则解码成功
        if (value) {
          // 检查最后是否为分号
          const semi = name.endsWith(';')
          // 如果解码的文本作为属性值，最后一个匹配的字符不是分号，
          // 并且最后一个匹配字符的下一个字符是等于号、ASCII 字母或数字，
          // 由于历史原因，将字符 & 和实体名称 name 作为普通文本
          if (
            asAttr &&
            !semi &&
            /[=a-z0-9]/i.test(rawText[name.length + 1] || '')
          ) {
            decodedText += '&' + name
            advance(1 + name.length)
          } else {
            // 其他情况下，将解码后的内容拼接
            decodedText += value
            advance(1 + name.length)
          }
        } else {
          // 没找到，解码失败
          decodedText += '&' + name
          advance(1 + name.length)
        }
      } else {
        // 如果字符 & 的下一个字符不是 ASCII 字母或数字，则将字符 & 看做普通文本
        decodedText += '&'
        advance(1)
      }
    } else {
      // 判断是十进制表示还是十六进制表示
      const hex = head[0] === '&#x'
      // 根据不同进制表示法，选用不同的正则
      const pattern = hex ? /^&#x([0-9a-f]+);?/i : /^&#([0-9]+);?/
      // 最终，body[1] 的值就是 Unicode 码点
      const body = pattern.exec(rawText)

      // 如果匹配成功，则调用 String.fromCodePoint 函数进行解码
      if (body) {
        // 将码点字符串转为十进制数字
        let cp = Number.parseInt(body[1], hex ? 16 : 10)
        // 码点的合法性检查
        if (cp === 0) {
          // 如果码点值为 0x00，替换为 0xfffd
          cp = 0xfffd
        } else if (cp > 0x10ffff) {
          // 如果码点值超过了 Unicode 的最大值，替换为 0xfffd
          cp = 0xfffd
        } else if (cp >= 0xd800 && cp <= 0xdfff) {
          // 如果码点值处于 surrogate pair 范围，替换为 0xfffd
          cp = 0xfffd
        } else if ((cp >= 0xfdd0 && cp <= 0xfdef) || (cp & 0xfffe) === 0xfffe) {
          // 如果码点值处于 `noncharacter` 范围，则什么都不做，交给平台处理
          // noop
        } else if (
          // 控制字符集的范围是：[0x01, 0x1f] 加上 [0x7f, 0x9f]
          // 却掉 ASICC 空白符：0x09(TAB)、0x0A(LF)、0x0C(FF)
          // 0x0D(CR) 虽然也是 ASICC 空白符，但需要包含
          (cp >= 0x01 && cp <= 0x08) ||
          cp === 0x0b ||
          (cp >= 0x0d && cp <= 0x1f) ||
          (cp >= 0x7f && cp <= 0x9f)
        ) {
          // 在 CCR_REPLACEMENTS 表中查找替换码点，如果找不到则使用原码点
          cp = CCR_REPLACEMENTS[cp] || cp
        }
        // 解码后追加到 decodedText 上
        decodedText += String.fromCodePoint(cp)
        // 消费掉整个数字字符引用的内容
        advance(body[0].length)
      } else {
        // 如果没有匹配，则不进行解码操作，只是把 head[0] 追加到 decodedText 并消费掉
        decodedText += head[0]
        advance(head[0].length)
      }
    }
  }
  return decodedText
}
```

✅ **解析插值与注释**

解析器在解析插值时，只需要将文本插值的开始定界符与结束定界符之间的内容提取出来，作为 `JavaScript` 表达式即可

</details>

<details>
<summary>编译优化</summary>

编译优化指的是编译器将模板编译为渲染函数的过程中，尽可能的区分动态内容和静态内容，并针对不同的内容采用不同的策略

✅ **动态节点收集与补丁标志**

- 传统 `Diff` 算法的问题

```js
<div id="foo">
  <p class="bar">{{ text }}</p>
</div>
```

对于上面的代码实例，最理想的状态是直接更新 `p` 标签的插值内容。但是在传统 `Diff` 算法中，会逐层级比较差异然后更新差异，会存在很多无意义的比对操作

`Vue.js 3` 的编译器会将编译时得到的关键信息“附着”在它生成的虚拟 `DOM` 上，这些信息会通过虚拟 `DOM` 传递给渲染器，最终渲染器根据这些关键信息执行“快捷路径”，从而提升运行时的性能

- `Block` 与 `PatchFlags`

```js
<div>
  <div>foo</div>
  <p>{{ bar }}</p>
</div>
```

对于以上代码传统虚拟 `DOM` 是如何描述的：

```js
const vnode = {
  type: 'div',
  children: [
    { type: 'div', children: 'foo' },
    { type: 'p', children: ctx.bar }
  ]
}
```

经过编译优化后，编译器将提取到的关键信息“附着”到虚拟 `DOM` 节点上，如下所示：

```js
const vnode = {
  type: 'div',
  children: [
    { type: 'div', children: 'foo' },
    { type: 'p', children: ctx.bar, patchFlag: 1 } // 代表动态节点
  ]
}
```

我们可以认为，只要虚拟节点存在 `patchFlag` 属性即是一个动态节点， `patchFlag` 可以定位为以下几种类型：

```js
const PatchFlags = {
  TEXT: 1, // 动态的 textContent
  CLASS: 2, // 动态的 class 绑定
  STYLE: 3 // 动态的 style 绑定
  // 其他
}
```

有了 `patchFlag` 补丁标志后，我们就可以在虚拟节点的创建节点，把动态子节点提取出来，方便后面使用：

```js
const vnode = {
  type: 'div',
  children: [
    { type: 'div', children: 'foo' },
    { type: 'p', children: ctx.bar, patchFlag: PatchFlags.TEXT } // 代表动态节点
  ],
  // 将动态节点全部提取到 dynamicChildren 中
  dynamicChildren: [
    { type: 'p', children: ctx.bar, patchFlag: PatchFlags.TEXT } // 代表动态节点
  ]
}
```

对于虚拟 `DOM` 节点来说，如果拥有 `dynamicChildren` 属性，即认为它是 `Block` `，Block` 本质上也是一个虚拟 `DOM` 节点。这里需要注意，一个 `Block` 不仅能收集直接动态子节点，还能收集子孙动态子节点

有了 `Block` 概念后，渲染器的更新操作将会以 `Block` 为维度，更新时忽略 `children` ，直接找到该虚拟节点的 `dynamicChildren` 数组并更新，这样就跳过了静态节点

那么什么情况下一个普通的虚拟 `DOM` 节点会变成 `Block` 节点呢？

在我们编写模板时，只有根节点才会变成 `Block` 节点，实际上还有带有 `v-if` 、 `v-for` 等指令的节点也都需要作为 `Block` 节点

```HTML
<template>
  <!-- div 是 Block -->
  <div>
    <!-- p 不是，因为不是根节点 -->
    <p>{{ bar }}</p>
  </div>

  <!-- h1 是 Block -->
  <h1>
    <!-- span 不是，因为不是根节点 -->
    <span :id="dynamicId"></span>
  </h1>
</template>
```

- 收集动态节点

在编译器生成的渲染函数如下：

```js
render() {
  return createVNode('div',{id:'foo'},[
    createVNode('p',null,text,PatchFlags.TEXT)
  ])
}
```

`createVNode` 函数是用来创建虚拟 `DOM` 节点的辅助函数，我们可以在 `createVNode` 函数中进行收集。可以看到 `render` 函数的执行顺序是“内层先执行，外层后执行”，所以需要一个栈结构来存储，详见 [vnode.js](https://github.com/sqlnice/mini-vue/blob/main/src/runtime/vnode.js)

- 渲染器的运行时支持

在传统的节点更新方式 `patchElement` 中，我们增加对 `dynamicChildren` 的支持

```js
function patchElement(n1, n2) {
  const el = (n2.el = n1.el)
  const oldProps = n1.props
  const newProps = n2.props

  if (n2.patchFlags) {
    // 靶向更新
    if (n2.patchFlags === 2) {
      // 更新 class
      patchProps(el, 'class', oldProps.class, newProps.class)
    } else if (n2.patchFlags === 3) {
      // 更新 style
    }
  } else {
    // 第一步：更新 props
    for (const key in newProps) {
      if (newProps[key] !== oldProps[key]) {
        // 新旧不相等
        patchProps(el, key, oldProps[key], newProps[key])
      }
    }
    for (const key in oldProps) {
      if (!(key in newProps)) {
        // 旧 props 的值不在新 props 中
        patchProps(el, key, oldProps[key], null)
      }
    }
  }
  // 第二步：更新 children
  if (n2.dynamicChildren) {
    // 只更新动态节点
    patchBlockChildren(n1, n2)
  } else {
    patchChildren(n1, n2, el)
  }
}

function patchBlockChildren(n1, n2) {
  for (let i = 0; i < n2.dynamicChildren.length; i++) {
    patchElement(n1.dynamicChildren[i], n2.dynamicChildren[i])
  }
}
```

✅ **Block 树**

根节点、`v-if`、`v-for` 等会组成 `Block` 树

由于 `Block` 树会收集所有的动态子孙节点，所以对动态节点的操作是忽略 `DOM` 层级结构的。这会带来额外的问题，即 `v-if`、`v-for` 等结构化指令会影响 `DOM` 层级结构，也会简介导致基于 `Block` 树的比对算法失效，解决方法就是让带有 `v-if`、`v-for` 等指令的节点也作为 `Block` 角色即可

✅ **静态提升**

有如下模板：

```HTML
<div>
  <p>Static Text</p>
  <p class="foo">{{ title }}</p>
</div>
```

在没有静态提升的情况下，对应的渲染函数为：

```js
function render() {
  return (
    openBlock(),
    createBlock('div', null, [
      createVNode('p', null, 'Static Text'),
      createVNode('p', { class: 'foo' }, ctx.title, 1 /* TEXT */)
    ])
  )
}
```

当 `title` 变化时，整个渲染函数都会重新执行，并产生新的**虚拟 DOM**，但是对于第一个 `p` 来说没必要更新，所以把他单独保存起来，第二个 `p` 的 `class` 同理，所以有静态提升后为：

```js
// 静态节点
const hoist1 = createVNode('p', null, 'Static Text')
// 静态 props 对象
const hoistProp = { class: 'foo' }
function render() {
  return (
    openBlock(),
    createBlock('div', null, [
      hoist1, // 静态节点
      createVNode('p', hoistProp, ctx.title, 1 /* TEXT */)
    ])
  )
}
```

✅ **预字符串化**

试想这样的模板：

```HTML
<div>
  <p></p>
  <p></p>
  <p></p>
  <!-- 20个 P 标签 -->
  <p></p>
  <p></p>
  <p></p>
</div>
```

当我们采用静态提升之后，编译后的代码如下所示：

```js
const hoist1 = createVNode('p', null, null, PatchFlags.HOISTED)
const hoist2 = createVNode('p', null, null, PatchFlags.HOISTED)
const hoist3 = createVNode('p', null, null, PatchFlags.HOISTED)
// 省略 20 个
function render() {
  return (
    openBlock(), createBlock('div', null, [hoist1, hoist2, hoist3 /* ... */])
  )
}
```

预字符串化可以将这些节点序列化为字符串，并生成一个 `Static` 类型的 `VNode`：

```js
const hoistStatic = createStaticVNode(
  '<p></p><p></p><p></p>...20个<p></p><p></p>'
)
// 省略 20 个
function render() {
  return openBlock(), createBlock('div', null, [hoistStatic])
}
```

这样做有几个明显的优势：

- 大块的静态内容可以通过 `innerHTML` 进行设置，在性能上具有一定优势

- 减少创建虚拟节点产生的性能开销

- 减少内存占用

✅ **缓存内联事件处理函数**

```HTML
<Comp @change="a + b"></Comp>
```

以上模板会被编译为：

```js
function render(ctx) {
  return h(Comp, {
    onChange: () => ctx.a + ctx.b
  })
}
```

由于每次渲染时都会重新创建 `props` 对象，`props.onChange` 也是全新的函数，这会造成额外的性能开销，所以需要对内联事件处理函数进行缓存

```js
function render(ctx, cache) {
  return h(Comp, {
    onChange: cache[0] || (cache[0] = $event => ctx.a + ctx.b)
  })
}
```

✅ **v-once**

```HTML
<section>
  <div v-once>{{ foo }}</div>
</section>
```

以上模板会被编译为：

```js
function render(ctx, cache) {
  return openBlock(), createBlock('section', null, [cache[1]||cache[1]=createVNode('div',null,ctx.foo,1 /*TEXT*/)])
}
```

既然已经被缓存，那么后续更新导致渲染函数重新执行时，会优先读取缓存的内容。同时，这些被缓存的虚拟节点不会参与 `Diff` 操作，所以实际编译后的代码可能如下：

```js
function render(ctx, cache) {
  return (
    openBlock(),
    createBlock('section', null, [
      cache[1] ||
        (setBlockTracking(-1), // 阻止这段 VNode 被 Block 收集
        (cache[1] = createVNode('div', null, ctx.foo, 1 /*TEXT*/)),
        setBlockTracking(1), // 恢复
        cache[1]) // 整个表达式的值
    ])
  )
}
```

`setBlockTracking(-1)` 用来暂停节点收集，即使用 `v-once` 包裹的动态节点不会被父级 `Block` 收集，也就不会参与 `Diff` 操作了。`v-once` 指令能从两个方面提升性能：

- 避免组件更新时重新创建虚拟 `DOM` 带来的性能开销。因为虚拟 `DOM` 被缓存了，所以无需重新创建

- 避免无用的 `Diff` 开销。因为被 `v-once` 包裹的虚拟 `DOM` 不会被父级 `Block` 节点收集

</details>

# 服务端渲染

<details>
<summary>同构渲染</summary>

暂时不更

🟥 **CSR、SSR 以及同构渲染**

🟥 **将虚拟 DOM 渲染为 HTML 字符串**

🟥 **将组件渲染为 HTML 字符串**

🟥 **客户端激活的原理**

🟥 **编写同构的代码**

</details>
