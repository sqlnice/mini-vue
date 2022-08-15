import { isNumber, isString } from '../utils'
import { isReactive } from '../reactivity/index'
export const Shape = {
  Text: Symbol('Text'),
  Comment: Symbol('Comment'),
  Fragment: Symbol('Fragment')
}

export const ShapeFlags = {
  ELEMENT: 1,
  TEXT: 1 << 1,
  FRAGMENT: 1 << 2,
  COMPONENT: 1 << 3,
  TEXT_CHILDREN: 1 << 4,
  ARRAY_CHILDREN: 1 << 5,
  CHILDREN: (1 << 4) | (1 << 5)
}

/**
 * vnode 有四种类型：
 * dom 元素
 * 纯文本
 * Fragment
 * 组件
 * @param {string | Text | Fragment | Object} type
 * @param {Object | null} props
 * @param {string | Array | null} children
 * @param {Number} flags
 * @returns
 */
export function h(type, props, children, flags) {
  if (!type) return null

  let shapeFlag = 0

  if (isString(type)) {
    shapeFlag = ShapeFlags.ELEMENT
  } else if (type === Shape.Text) {
    shapeFlag = ShapeFlags.TEXT
  } else if (type === Shape.Fragment) {
    shapeFlag = ShapeFlags.FRAGMENT
  } else {
    shapeFlag = ShapeFlags.COMPONENT
  }

  if (isString(children) || isNumber(children)) {
    shapeFlag |= ShapeFlags.TEXT_CHILDREN
    children = children.toString()
  }
  if (props) {
    // 其实是因为，vnode要求immutable，这里如果直接赋值的话是浅引用
    // 如果使用者复用了props的话，就不再immutable了，因此这里要复制一下。style同理
    // for reactive or proxy objects, we need to clone it to enable mutation.
    if (isReactive(props)) {
      props = Object.assign({}, props)
    }
    // reactive state objects need to be cloned since they are likely to be
    // mutated
    if (isReactive(props.style)) {
      props.style = Object.assign({}, props.style)
    }
  }

  const vnode = {
    type,
    props,
    children,
    shapeFlag,
    key: props && (props.key != null ? props.key : null),
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

export function createBlock(type, props, children) {
  const block = h(type, props, children)
  block.dynamicChildren = currentDynamicChildren
  closeBlock()
  return block
}
