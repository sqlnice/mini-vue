// 状态机的状态
const State = {
  initial: 1, // 初始状态
  tagOpen: 2, // 标签开始状态
  tagName: 3, // 标签名称状态
  text: 4, // 文本状态
  tagEnd: 5, // 标签结束状态
  tagEndName: 6 // 结束标签名称状态
}
const isAlpha = char =>
  (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z')
/**
 * 有限状态自动机，将模板字符串切割为 Token 并返回
 * @param {String} str
 */
export const tokenzie = str => {
  // 状态机当前状态
  let currentState = State.initial
  // 用于返回的 Token 数组
  const tokens = []
  // 用于缓存字符串
  const charts = []

  while (str) {
    // 拿到第一个字符
    const char = str[0]

    // 匹配当前状态
    switch (currentState) {
      case State.initial:
        // 初始状态
        if (char === '<') {
          currentState = State.tagOpen
          str = str.slice(1)
        } else if (isAlpha(char)) {
          currentState = State.text
          charts.push(char)
          str = str.slice(1)
        }
        break

      case State.tagOpen:
        if (isAlpha(char)) {
          currentState = State.tagName
          charts.push(char)
          str = str.slice(1)
        } else if (char === '/') {
          currentState = State.tagEnd
          str = str.slice(1)
        }
        break

      case State.tagName:
        if (isAlpha(char)) {
          charts.push(char)
          str = str.slice(1)
        } else if (char === '>') {
          currentState = State.initial
          // 标签名称收集完毕
          tokens.push({
            type: 'tag',
            name: charts.join('')
          })
          charts.length = 0
          str = str.slice(1)
        }
        break

      case State.text:
        if (isAlpha(char)) {
          charts.push(char)
          str = str.slice(1)
        } else if (char === '<') {
          currentState = State.tagOpen
          tokens.push({
            type: 'text',
            content: charts.join('')
          })
          charts.length = 0
          str = str.slice(1)
        }
        break

      case State.tagEnd:
        if (isAlpha(char)) {
          currentState = State.tagEndName
          charts.push(char)
          str = str.slice(1)
        }
        break

      case State.tagEndName:
        if (isAlpha(char)) {
          charts.push(char)
          str = str.slice(1)
        } else if (char === '>') {
          currentState = State.initial
          tokens.push({
            type: 'tagEnd',
            name: charts.join('')
          })
          charts.length = 0
          str = str.slice(1)
        }
        break
    }
  }

  return tokens
}

/**
 * 接收模板字符串作为参数
 * @param {String} str
 */
export const parse = str => {
  // 获取 tokens
  const tokens = tokenzie(str)
  // 创建 Root 节点
  const root = {
    type: 'Root',
    children: []
  }

  // 创建 elementStack 栈
  const elementStack = [root]

  while (tokens.length) {
    // 获取当前扫描的 token
    const t = tokens[0]
    // 获取当前栈定点作为父节点
    const parent = elementStack[elementStack.length - 1]

    switch (t.type) {
      case 'tag': {
        // 遇到开始标签，创建 Element 类型的 AST 节点
        const elementNode = {
          type: 'Element',
          tag: t.name,
          children: []
        }
        // 添加到父级节点的 children 中
        parent.children.push(elementNode)
        // 压入栈
        elementStack.push(elementNode)
        break
      }

      case 'text': {
        // 遇到文本标签
        const textNode = {
          type: 'Text',
          children: t.content
        }
        // 只是单纯的文本，直接添加到父节点的 children 中
        parent.children.push(textNode)
        break
      }
      case 'tagEnd': {
        // 遇到结束标签
        elementStack.pop()
        break
      }
    }
    tokens.shift()
  }
  return root
}
