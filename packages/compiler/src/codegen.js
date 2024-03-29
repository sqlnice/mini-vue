import { ElementTypes, NodeTypes } from './ast'
import { capitalize } from '@mini-vue/shared'
export function generate(ast) {
  const returns = traverseNode(ast)
  const code = `
    with (_ctx) {
        const { h, Shape, renderList, resolveComponent, withModel } = MiniVue
        return ${returns}
    }`
  return code
}

export function traverseNode(node, parent) {
  switch (node.type) {
    case NodeTypes.ROOT:
      if (node.children.length === 1) {
        return traverseNode(node.children[0], node)
      }
      // eslint-disable-next-line
      const result = traverseChildren(node)
      return node.children.length > 1 ? `[${result}]` : result
    case NodeTypes.ELEMENT:
      return resolveElementASTNode(node, parent)
    case NodeTypes.TEXT:
      return createTextVNode(node)
    case NodeTypes.INTERPOLATION:
      return createTextVNode(node.content)
    case NodeTypes.COMMENT:
      return createCommentVNode(node)
  }
}

function traverseChildren(node) {
  const { children } = node

  if (children.length === 1) {
    const child = children[0]
    if (child.type === NodeTypes.TEXT) {
      return createText(child)
    }
    if (child.type === NodeTypes.INTERPOLATION) {
      return createText(child.content)
    }
  }

  const results = []
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    results.push(traverseNode(child, node))
  }

  return results.join(', ')
}

// 这里parent是必然存在的
function resolveElementASTNode(node, parent) {
  const ifNode =
    pluck(node.directives, 'if') || pluck(node.directives, 'else-if')

  if (ifNode) {
    // 递归必须用resolveElementASTNode，因为一个元素可能有多个指令
    // 所以处理指令时，移除当下指令也是必须的
    const consequent = resolveElementASTNode(node, parent)
    let alternate

    // 如果有ifNode，则需要看它的下一个元素节点是否有else-if或else
    const { children } = parent
    let i = children.findIndex(child => child === node) + 1
    for (; i < children.length; i++) {
      const sibling = children[i]

      // <div v-if="ok"/> <p v-else-if="no"/> <span v-else/>
      // 为了处理上面的例子，需要将空节点删除
      // 也因此，才需要用上for循环
      if (sibling.type === NodeTypes.TEXT && !sibling.content.trim()) {
        children.splice(i, 1)
        i--
        continue
      }

      if (
        sibling.type === NodeTypes.ELEMENT &&
        (pluck(sibling.directives, 'else') ||
          // else-if 既是上一个条件语句的 alternate，又是新语句的 condition
          // 因此pluck时不删除指令，下一次循环时当作ifNode处理
          pluck(sibling.directives, 'else-if', false))
      ) {
        alternate = resolveElementASTNode(sibling, parent)
        children.splice(i, 1)
      }
      // 只用向前寻找一个相临的元素，因此for循环到这里可以立即退出
      break
    }

    const { exp } = ifNode
    return `${exp.content} ? ${consequent} : ${alternate || createTextVNode()}`
  }

  const forNode = pluck(node.directives, 'for')
  if (forNode) {
    const { exp } = forNode
    const [args, source] = exp.content.split(/\sin\s|\sof\s/)
    return `h(Shape.Fragment, null, renderList(${source.trim()}, ${args.trim()} => ${resolveElementASTNode(
      node
    )}))`
  }

  return createElementVNode(node)
}

function createElementVNode(node) {
  const { children, directives } = node

  const tag =
    node.tagType === ElementTypes.ELEMENT
      ? `"${node.tag}"`
      : `resolveComponent("${node.tag}")`

  const propArr = createPropArr(node)
  let propStr = propArr.length ? `{ ${propArr.join(', ')} }` : 'null'

  const vModel = pluck(directives, 'model')
  if (vModel) {
    const getter = `() => ${createText(vModel.exp)}`
    const setter = `value => ${createText(vModel.exp)} = value`
    propStr = `withModel(${tag}, ${propStr}, ${getter}, ${setter})`
  }

  if (!children.length) {
    if (propStr === 'null') {
      return `h(${tag})`
    }
    return `h(${tag}, ${propStr})`
  }

  let childrenStr = traverseChildren(node)
  // TODO 这里有问题
  // 比如 <p>1</p><span>234{{ this.name.value }}</span> 会渲染错误
  if (
    [NodeTypes.ELEMENT, NodeTypes.TEXT].includes(children[0].type) &&
    children.length > 1
  ) {
    childrenStr = `[${childrenStr}]`
  }
  return `h(${tag}, ${propStr}, ${childrenStr})`
}

function createPropArr(node) {
  const { props, directives } = node
  return [
    ...props.map(prop => `${prop.name}: ${createText(prop.value)}`),
    ...directives.map(dir => {
      const content = dir.arg?.content
      switch (dir.name) {
        case 'bind':
          return `${content}: ${createText(dir.exp)}`
        case 'on':
          // eslint-disable-next-line
          const eventName = `on${capitalize(content)}`
          // eslint-disable-next-line
          let exp = dir.exp.content

          // 以括号结尾，并且不含'=>'的情况，如 @click="foo()"
          // 当然，判断很不严谨，比如不支持 @click="i++"
          if (/\([^)]*?\)$/.test(exp) && !exp.includes('=>')) {
            exp = `$event => (${exp})`
          }
          return `${eventName}: ${exp}`
        case 'html':
          return `innerHTML: ${createText(dir.exp)}`
        default:
          return `${dir.name}: ${createText(dir.exp)}`
      }
    })
  ]
}

function pluck(directives, name, remove = true) {
  const index = directives.findIndex(dir => dir.name === name)
  const dir = directives[index]
  if (remove && index > -1) {
    directives.splice(index, 1)
  }
  return dir
}

// node只接收text和simpleExpresstion
function createTextVNode(node) {
  const child = createText(node)
  return `h(Shape.Text, null, ${child})`
}

function createCommentVNode(node) {
  const child = createText(node)
  return `h(Shape.Comment, null, ${child})`
}

function createText({ content = '', isStatic = true } = {}) {
  return isStatic ? JSON.stringify(content) : content
}
