import { isArray, isObject, isString } from '../utils'

/**
 * 文本节点
 */
export const Text = Symbol()
/**
 * 注释节点
 */
export const Comment = Symbol()
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
    parent.appendChild(el, anchor)
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
      if (shouldSetAsProps) {
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
  function patch(n1, n2, container) {
    // 新旧节点类型不同 则直接卸载旧节点
    if (n1 && n1.type !== n2.type) {
      unmount(n1)
      n1 = null
    }
    const { type } = n2
    if (isString(type)) {
      if (!n1) {
        // 挂载节点
        mountElement(n2, container)
      } else {
        // 更新节点
        patchElement(n1, n2)
      }
    } else if (isObject(type)) {
      // TODO 更新组件
    } else if (type === Text) {
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
    } else if (type === Comment) {
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
    } else {
      // TODO 更新其他类型的 vnode
    }
  }

  function mountElement(vnode, container) {
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
    insert(el, container)
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
        n1.children.forEach(c => unmount(c))
        n2.children.forEach(c => patch(null, c, container))
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

  function unmount(vnode) {
    const parent = vnode.el.parentNode
    parent.removeChild(vnode.el)
  }

  return { render }
}
