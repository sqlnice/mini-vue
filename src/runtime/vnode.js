export const Shape = {
  Text: Symbol('Text'),
  Comment: Symbol('Comment'),
  Fragment: Symbol('Fragment')
}
export function h(tag, props, children, flags) {
  if (!tag) return null
  const key = props && props.key
  props && delete props.key

  const vnode = {
    type: tag,
    tag,
    props,
    children,
    key,
    patchFlags: flags
  }

  if (typeof flags !== 'undefined' && currentDynamicChildren) {
    // 动态节点
    currentDynamicChildren.push(vnode)
  }

  return vnode
}
// 动态节点栈
const dynamicChildrenStack = []
// 当前动态节点集合
let currentDynamicChildren = null

// openBlock 用来创建一个新的动态节点集合，并将该集合压入栈中
export function openBlock() {
  dynamicChildrenStack.push((currentDynamicChildren = []))
}

function closeBlock() {
  currentDynamicChildren = dynamicChildrenStack.pop()
}

export function createBlock(tag, props, children) {
  const block = h(tag, props, children)
  block.dynamicChildren = currentDynamicChildren
  closeBlock()
  return block
}
