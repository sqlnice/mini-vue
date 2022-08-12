import { NodeTypes } from './ast'

/**
 * 转换函数 模板 AST -> JavaScript AST
 * @param {*} ast
 */
export function transform(ast) {
  const context = {
    // 当前正在转换的节点
    currentNode: null,
    // 用来存储当前节点在父节点中的位置索引
    childIndex: 0,
    // 父节点
    parent: null,
    // 替换操作
    replaceNode(node) {
      context.parent.children[context.childIndex] = node
      context.currentNode = node
    },
    // 移除操作
    removeNode() {
      if (context.parent) {
        context.parent.children.splice(context.childIndex, 1)
        context.currentNode = null
      }
    },
    // 从后往前的
    nodeTransforms: [
      transformRoot,
      transformElement,
      transformText,
      transformInterpolation,
      transformComment
    ]
  }
  traverseNode(ast, context)
}

/**
 * 深度优先遍历访问节点
 * @param {*} ast
 * @param {*} context
 */
function traverseNode(ast, context) {
  context.currentNode = ast
  // 用来解决 进入与退出 的问题
  const exitFns = []
  const transforms = context.nodeTransforms

  if (transforms.length) {
    for (let i = 0; i < transforms.length; i++) {
      const onExit = transforms[i](context.currentNode, context)
      if (onExit) {
        exitFns.push(onExit)
      }
      if (!context.currentNode) return
    }
  }

  const children = context.currentNode.children
  if (children) {
    for (let i = 0; i < children.length; i++) {
      context.parent = context.currentNode
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

// 转换文本节点
function transformText(node) {
  if (node.type !== NodeTypes.TEXT) return
  // 文本节点对应的 JavaScript AST 节点就是字符串字面量
  node.jsNode = createStringLiteral(node.content)
}

// 转换插值节点
function transformInterpolation(node) {
  if (node.type !== NodeTypes.INTERPOLATION) return
  node.jsNode = {
    type: NodeTypes.INTERPOLATION,
    content: node.content
  }
}

// 转换注释节点
function transformComment(node) {
  if (node.type !== NodeTypes.COMMENT) return
  node.jsNode = {
    type: NodeTypes.COMMENT,
    content: node.content
  }
}

// 转换标签节点
function transformElement(node) {
  return () => {
    if (node.type !== NodeTypes.ELEMENT) return
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

// 转换 Root 根节点
function transformRoot(node) {
  return () => {
    if (node.type !== NodeTypes.ROOT) return
    const vnodeJSAST = node.children[0].jsNode
    node.jsNode = {
      type: 'FunctionDecl',
      id: createIdentifier('render'),
      params: [],
      body: [{ type: 'ReturnStatement', return: vnodeJSAST }]
    }
  }
}

// 创建 StringLiteral 节点
function createStringLiteral(value) {
  return {
    type: 'StringLiteral',
    value
  }
}

// 创建 Identifier 节点
function createIdentifier(name) {
  return {
    type: 'Identifier',
    name
  }
}

// 创建 ArrayExpression 节点
function createArrayExpression(elements) {
  return {
    type: 'ArrayExpression',
    elements
  }
}

// 创建 CallExpression 节点
function createCallExpression(callee, args) {
  return {
    type: 'CallExpression',
    callee: createIdentifier(callee),
    arguments: args
  }
}
