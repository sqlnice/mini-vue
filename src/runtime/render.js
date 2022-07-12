import { isArray, isObject, isString } from '../utils'
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
  // 处理 prop
  patchProps(el, key, prevValue, nextValue) {
    if (key === 'class') {
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
  const { createElement, setElementText, insert, patchProps, normalizeClass } = options
  function render(vnode, container) {
    if (vnode) {
      // 更新
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
        // 初始挂载
        mountElement(n2, container)
      } else {
        // 两个节点都存在，打补丁
        patchElement(n1, n2)
      }
    } else if (isObject(type)) {
      // TODO 更新组件
    } else {
      // TODO 更新其他类型的 vnode
    }
  }

  function mountElement(vnode, container) {
    // 创建元素
    const el = (vnode.el = createElement(vnode.type))

    if (typeof vnode.children === 'string') {
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
          console.log(normalizeClass(vnode.props[key]))
          patchProps(el, key, null, normalizeClass(vnode.props[key]))
        } else {
          patchProps(el, key, null, vnode.props[key])
        }
      }
    }

    // 在给定的 parent 下添加指定的元素
    insert(el, container)
    console.log('挂载', el)
  }

  function patchElement(n1, n2) {}

  function unmount(vnode) {
    const parent = vnode.el.parentNode
    parent.removeChild(vnode.el)
  }

  return { render }
}
