import { NodeTypes } from './ast'
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
    case NodeTypes.INTERPOLATION:
      genInterpolation(node, context)
      break
    case NodeTypes.COMMENT:
      genCommont(node, context)
      break
    case NodeTypes.ELEMENT:
      genElement(node, context)
      break
  }
}

function genFunctionDecl(node, context) {
  const { push, ident, deIdent } = context
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

function genCallExpression(node, context) {
  const { push } = context
  // 获取函数名和参数
  const { callee, arguments: args } = node
  push(`${callee.name}(`)
  genNodeList(args, context)
  push(')')
}

function genStringLiteral(node, context) {
  const { push } = context
  push(`'${node.value}'`)
}

function genArrayExpression(node, context) {
  const { push } = context
  push('[')
  genNodeList(node.elements, context)
  push(']')
}

function genInterpolation(node, context) {
  const { push } = context
  push(`${node.content.content}`)
}

function genCommont(node, context) {
  const { push } = context
  push(`'<!--${node.content}-->'`)
}

function genElement(node, context) {
  const { push } = context
  push(`'${node.value}', '${node.propStr}'`)
}

function genNodeList(nodes, context) {
  const { push } = context
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    genNode(node, context)
    if (i < nodes.length - 1) push(', ')
  }
}
