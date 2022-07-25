import { isArray, isObject, isString } from '../utils'
import { Shape } from './vnode'
function shouldSetAsProps(el, key) {
  // 特殊处理
  if (key === 'form' && el.tagName === 'INPUT') return false
  // 兜底
  return key in el
}
const browserOptions = {
  // 创建元素
  createElement(tag) {
    return document.createElement(tag)
  },
  // 设置元素的文本节点
  setElementText(el, text) {
    el.textContent = text
  },
  // 在给定的 parent 下添加指定的元素
  insert(el, parent, anchor = null) {
    parent.insertBefore(el, anchor)
  },
  // 格式化 classNames
  // class: 'foo bar'
  // class: { foo: true, bar: true }
  // class: ['foo', { bar: true }]
  normalizeClass(classPropsValue) {
    let res = ''
    if (typeof classPropsValue === 'string') return classPropsValue + ' '
    if (isArray(classPropsValue)) {
      classPropsValue.forEach(classProp => {
        res += browserOptions.normalizeClass(classProp)
      })
      return res
    }
    if (typeof classPropsValue === 'object') {
      for (const key in classPropsValue) {
        res += classPropsValue[key] ? key + ' ' : ''
      }
      return res
    }
  },
  createText(text) {
    return document.createTextNode(text)
  },
  setText(el, text) {
    el.nodeValue = text
  },
  createComment(text) {
    return document.createComment(text)
  },

  // 处理 prop
  patchProps(el, key, prevValue, nextValue) {
    if (/^on/.test(key)) {
      console.log('key:', key)
      console.log('值:', nextValue)
      // 处理事件
      const name = key.slice(2).toLowerCase()

      const invokers = el._vei || (el._vei = {})
      // invokers 结构
      // {
      //   click: [],
      //   dbclick: ()=>{}
      // }

      let invoker = invokers[key]

      if (nextValue) {
        // 更新事件
        if (!invoker) {
          invoker = el._vei[key] = e => {
            // 如果事件被触发的时间 早于 事件被绑定的时间，说明那时还没有绑定
            console.log(e.timeStamp, invoker.attched)
            if (e.timeStamp < invoker.attched) return
            // 如果是数组，遍历逐个调用事件处理函数
            if (isArray(invoker.value)) {
              invoker.value.forEach(fn => fn(e))
            } else {
              invoker.value(e)
            }
          }
          invoker.value = nextValue
          // 事件绑定时添加 attched 属性，存储事件处理函数被绑定的时间
          invoker.attched = performance.now()
          el.addEventListener(name, invoker)
        } else {
          invoker.value = nextValue
        }
      } else {
        // 移除事件
        el.removeEventListener(name, prevValue)
      }
    } else if (key === 'class') {
      // el.className 这种方式性能最优
      el.className = nextValue || ''
    } else {
      if (shouldSetAsProps(el, key)) {
        const type = typeof el[key]
        if (type === 'boolean' && nextValue === '') {
          el[key] = true
        } else {
          el[key] = nextValue
        }
      } else {
        el.setAttribute(key, nextValue)
      }
    }
  },
}
export function createRenderer(options = browserOptions) {
  const { createElement, setElementText, insert, patchProps, normalizeClass, createText, setText, createComment } =
    options
  function render(vnode, container) {
    if (vnode) {
      // 挂载
      patch(container._vnode, vnode, container)
    } else {
      if (container._vnode) {
        // 调用 unmount 卸载 旧vnode
        unmount(container._vnode)
      }
    }
    // 更新 vnode 引用
    container._vnode = vnode
  }

  /**
   *
   * @param {VNode} n1 旧 vnode
   * @param {VNode} n2 新 vnode
   * @param {Element} container 挂载的目标节点
   */
  function patch(n1, n2, container, anchor) {
    // 新旧节点类型不同 则直接卸载旧节点
    if (n1 && n1.type !== n2.type) {
      unmount(n1)
      n1 = null
    }
    const { type } = n2
    if (isString(type)) {
      if (!n1) {
        // 挂载节点
        mountElement(n2, container, anchor)
      } else {
        // 更新节点
        patchElement(n1, n2)
      }
    } else if (isObject(type)) {
      // TODO 更新组件
    } else if (type === Shape.Text) {
      // 文本节点
      if (!n1) {
        // 没有旧节点，挂载
        const el = (n2.el = createText(n2.children))
        insert(el, container)
      } else {
        // 新旧都有，替换
        const el = (n2.el = n1.el)
        if (n2.children !== n1.children) {
          setText(el, n2.children)
        }
      }
    } else if (type === Shape.Comment) {
      // 注释节点
      if (!n1) {
        const el = (n2.el = createComment(n2.children))
        insert(el, container)
      } else {
        const el = (n2.el = n1.el)
        if ((n2, children !== n1.children)) {
          setText(el, n2.children)
        }
      }
    } else if (type === Shape.Fragment) {
      // Fragment 节点
      if (!n1) {
        // 无旧节点，直接挂载F
        n2.children.forEach(c => patch(null, c, container))
      } else {
        // 新旧都有，更新
        patchChildren(n1, n2, container)
      }
    } else {
      // TODO 更新其他类型的 vnode
    }
  }

  function mountElement(vnode, container, anchor) {
    // 创建元素
    const el = (vnode.el = createElement(vnode.type))
    if (isString(vnode.children)) {
      // 文本节点
      // 设置元素的文本节点
      setElementText(el, vnode.children)
    } else if (isArray(vnode.children)) {
      // 挂载时，如果 children 子元素为数组，要遍历调用 patch 重新挂载
      vnode.children.forEach(child => {
        patch(null, child, el)
      })
    }

    if (vnode.props) {
      for (const key in vnode.props) {
        if (key === 'class' && vnode.props.class) {
          patchProps(el, key, null, normalizeClass(vnode.props[key]))
        } else {
          patchProps(el, key, null, vnode.props[key])
        }
      }
    }

    // 在给定的 parent 下添加指定的元素
    insert(el, container, anchor)
  }

  /**
   * 更新节点
   * @param {*} n1
   * @param {*} n2
   */
  function patchElement(n1, n2) {
    const el = (n2.el = n1.el)
    const oldProps = n1.props
    const newProps = n2.props
    // 第一步：更新 props
    for (const key in newProps) {
      if (newProps[key] !== oldProps[key]) {
        // 新旧不相等
        patchProps(el, key, oldProps[key], newProps[key])
      }
    }
    for (const key in oldProps) {
      if (!key in newProps) {
        // 旧 props 的值不在新 props 中
        patchProps(el, key, oldProps[key], null)
      }
    }
    // 第二部：更新 children
    patchChildren(n1, n2, el)
  }

  /**
   * 更新子节点 children
   * @param {*} n1 旧节点
   * @param {*} n2 新节点
   * @param {*} container DOM
   */
  function patchChildren(n1, n2, container) {
    // 新 children 类型为 String
    if (isString(n2.children)) {
      if (isArray(n1.children)) {
        // 旧 children 类型为 Array ：遍历旧节点卸载后替换
        n1.children.forEach(c => unmount(c))
      }
      // 替换
      setElementText(container, n2.children)
    } else if (isArray(n2.children)) {
      // 新 children 类型为 Array
      if (isArray(n1.children)) {
        // TODO Diff 算法
        // 简单 Diff 算法 ⬇️
        // patchSimpleChildren(n1, n2, container)

        // 双端 Diff 算法 ⬇️
        patchKeyedChildren(n1, n2, container)
      } else {
        // 旧节点要么是文本要么为空
        // 清空
        setElementText(container, '')
        // 挂载新节点
        n2.children.forEach(c => patch(null, c, container))
      }
    } else {
      // 新 children 类型为 空
      if (isArray(n1.children)) {
        // 旧 children 类型为 Array ：遍历旧节点卸载
        n1.children.forEach(c => unmount(c))
      } else if (isString(n1.children)) {
        // 旧 children 类型为 String：清空
        setElementText(container, '')
      }
      // 旧 children 类型为 空 ：都为空，什么也不做
    }
  }

  /**
   * 双端 Diff 算法
   * 对新旧两组子节点的两个端点进行比较的算法
   */
  function patchKeyedChildren(n1, n2, container) {
    const oldChildren = n1.children
    const newChildren = n2.children

    // 四个索引值
    let oldStartIdx = 0
    let oldEndIdx = oldChildren.length - 1
    let newStartIdx = 0
    let newEndIdx = newChildren.length - 1

    // 四个索引指向的 vnode 节点
    let oldStartVNode = oldChildren[oldStartIdx]
    let oldEndVNode = oldChildren[oldEndIdx]
    let newStartVNode = newChildren[newStartIdx]
    let newEndVNode = newChildren[newEndIdx]

    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      if (oldStartVNode.key === newStartVNode.key) {
        // 新旧头部节点可复用
        patch(oldStartVNode, newStartVNode, container)
        oldStartVNode = oldChildren[++oldStartIdx]
        newStartVNode = newChildren[++newStartIdx]
      } else if (oldEndVNode.key === newEndVNode.key) {
        // 新旧尾部节点可复用
        patch(oldEndVNode, newEndVNode, container)
        oldEndVNode = oldChildren[--oldEndIdx]
        newEndVNode = newChildren[--newEndIdx]
      } else if (oldStartVNode.key === newEndVNode.key) {
        // 新尾部节点与旧头部节点可复用
        patch(oldStartVNode, newEndVNode, container)
        insert(oldStartVNode.el, container, oldEndVNode.el.nextSibliing)
        oldStartVNode = oldChildren[++oldStartIdx]
        newEndVNode = newChildren[--newEndIdx]
      } else if (newStartVNode.key === oldEndVNode.key) {
        // 新头部节点与旧尾部节点可复用
        patch(oldEndVNode, newStartVNode, container)
        insert(oldEndVNode.el, container, oldStartVNode.el)
        oldEndVNode = oldChildren[--oldEndIdx]
        newStartVNode = newChildren[++newStartIdx]
      } else {
        // 找到遗漏的节点索引
        const idxInOld = oldChildren.findIndex(vnode => vnode.key === newStartVNode.key)
        if (idxInOld > 0) {
          // 要移动的节点
          const vnodeToMove = oldChildren[idxInOld]
          patch(vnodeToMove, newStartVNode, container)
          // 将 vnodeToMove.el 移动到头部节点 oldStartVNode.el 之前
          insert(vnodeToMove.el, container, oldStartVNode.el)
          oldChildren[idxInOld] = undefined
        } else {
          // 添加新元素
          patch(null, newStartVNode, container, oldStartVNode.el)
        }
        // 更新索引
        newStartVNode = newChildren[++newStartIdx]
      }
    }
    // 添加新元素
    if (oldEndIdx < oldStartIdx && newStartIdx <= newEndIdx) {
      for (let i = newStartIdx; i < newEndIdx; i++) {
        const anchor = newChildren[newEndIdx + 1] ? newChildren[newEndIdx + 1].el : null
        patch(null, newChildren[i], container, anchor)
      }
    } else if (oldStartIdx <= oldEndIdx && newStartIdx > newEndIdx) {
      // 移除不存在的元素
      for (let i = oldStartIdx; i < oldEndIdx; i++) {
        unmount(oldChildren[i])
      }
    }
  }

  /**
   * 简单 Diff 算法
   * 根据 key 来寻找可复用的 DOM，并且移动
   */
  function patchSimpleChildren() {
    const oldChildren = n1.children
    const newChildren = n2.children
    let lastIndex = 0
    for (let i = 0; i < newChildren.length; i++) {
      const newVnode = newChildren[i]
      let find = false
      let j = 0
      for (j; j < oldChildren.length; j++) {
        const oldVnode = oldChildren[j]
        if (newVnode.key === oldVnode.key) {
          // 找到需要移动的元素
          find = true
          // 更新 DOM 的值
          patch(oldVnode, newVnode, container)
          if (j < lastIndex) {
            // 需要移动
            const preVnode = newChildren[i - 1]
            if (preVnode) {
              // 锚点 nextSibling 返回元素节点后的兄弟节点，就往这个兄弟节点前面插入
              const anchor = preVnode.el.nextSibliing
              insert(newVnode.el, container, anchor)
            }
          } else {
            lastIndex = j
          }
        }
      }
      if (!find) {
        // 未找到可复用，那就挂载
        // 也是挂载到最新节点的后面
        const preVnode = newChildren[i - 1]
        let anchor = null
        if (preVnode) {
          anchor = preVnode.el.nextSibliing
        } else {
          anchor = container.firstChild
        }
        patch(null, newVnode, container, anchor)
      }
      // 移除不存在的元素
      for (let i = 0; i < oldChildren.length; i++) {
        const oldVnode = oldChildren[i]
        const has = newChildren.find(vnode => vnode.key === oldVnode.key)
        if (!has) {
          // 如果没有找到相同的节点，则移除
          unmount(oldVnode)
        }
      }
    }
  }

  function unmount(vnode) {
    if (vnode.type === Shape.Fragment) {
      vnode.children.forEach(c => unmount(c))
      return
    }
    const parent = vnode.el.parentNode
    parent.removeChild(vnode.el)
  }

  return { render }
}
