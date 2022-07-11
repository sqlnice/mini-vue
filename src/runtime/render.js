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
}
export function createRenderer(options = browserOptions) {
  const { createElement, setElementText, insert } = options
  function render(vnode, container) {
    if (vnode) {
      // 更新
      patch(container._vnode, vnode, container)
    } else {
      if (container._vnode) {
        // 之前有，现在无
        container.innerHTML = ''
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
    if (!n1) {
      // 初始挂载
      mountElement(n2, container)
    } else {
      // 两个节点都存在，打补丁
      console.log('更新')
    }
  }

  function mountElement(vnode, container) {
    // 创建元素
    const el = createElement(vnode.type)

    if (typeof vnode.children === 'string') {
      // 文本节点
      // 设置元素的文本节点
      setElementText(el, vnode.children)
    }
    // 在给定的 parent 下添加指定的元素
    insert(el, container)
    console.log('挂载', el)
  }

  return { render }
}
