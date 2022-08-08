// 新版解析器

// 状态表
const TextModes = {
  DATA: 'DATA',
  RCDATA: 'RCDATA',
  RAWTEXT: 'RAWTEXT',
  CDATA: 'CDATA'
}

/**
 * 解析器入口
 * @param {template string} str
 */
export function parse(str) {
  // 上下文对象
  const context = {
    // 模板内容，用于消费
    source: str,
    // 初始模式为 DATA
    mode: TextModes.DATA,
    // 消费指定数量的字符
    advanceBy(num) {
      context.source = context.source.slice(num)
    },
    // 消费空格
    advanceSpaces() {
      const match = /^[\t\r\n\f ]+/.exec(context.source)
      if (match) {
        context.advanceBy(match[0].length)
      }
    }
  }
  // 节点栈，初始为空
  const nodes = parseChildren(context, [])
  // 返回 Root 根节点
  return { type: 'Root', children: nodes }
}
function parseChildren(context, ancestors) {
  // 用于存储子节点，是最终的返回值
  const nodes = []
  const { source, mode } = context
  while (!isEnd(context, ancestors)) {
    let node
    // 只有这两个模式才支持 HTML 实体
    if ([TextModes.DATA, TextModes.RCDATA].includes(mode)) {
      // 只有 DATA 模式才支持标签节点的解析
      if (mode === TextModes.data && source[0] === '<') {
        if (source[1] === '!') {
          if (source.startsWith('<!--')) {
            // 注释
            node = parseComment(context)
          } else if (source.startsWith('<![CDATA[')) {
            // CDATA
            node = parseCDATA(context, ancestors)
          }
        } else if (source[1] === '/') {
          // 结束标签
        } else if (/[a-z]/i.test(source[1])) {
          // 标签
          node = parseElement(context, ancestors)
        }
      } else if (source.startsWith('{{')) {
        // 解析插值
        node = parseInterpolation(context)
      }
    }

    // node 不存在，说明处于其他模式，直接作为文本处理
    if (!node) {
      node = parseText(context)
    }
    nodes.push(node)
  }
  return nodes
}

function parseComment(context) {
  console.log(context)
}

function parseCDATA(context, ancestors) {
  console.log(context, ancestors)
}

function parseElement(context, ancestors) {
  // 解析开始标签
  const element = parseTag(context)
  // 自闭和标签
  if (element.isSelfClosing) return element

  // 切换到正确的模式
  if (['textarea', 'title'].includes(element.tag)) {
    context.mode = TextModes.RCDATA
  } else if (/style|xmp|iframe|noembed|noframes|noscript/.test(element.tag)) {
    context.mode = TextModes.RAWTEXT
  } else {
    context.mode = TextModes.DATA
  }

  // 回溯
  ancestors.push(element)
  // 递归调用 parseChildren 解析子标签
  element.children = parseChildren(context, ancestors)
  ancestors.pop()

  // 理论来说消费完子标签后最后应该最剩下的应该是 </div>
  if (context.source.startsWith(`</${element.tag}`)) {
    parseTag(context, 'end')
  } else {
    console.error(`${element.tag} 标签缺少闭合标签`)
  }
  return element
}

function parseInterpolation(context) {
  console.log(context)
}

function parseText(context) {
  console.log(context)
}

function parseTag(context, type = 'start') {
  const { advanceBy, advanceSpaces } = context

  const match =
    type === 'start'
      ? // 匹配开始标签
        /^<([a-z][^\t\r\n\f  />]*)/i.exec(context.source)
      : // 匹配结束标签
        /^<\/([a-z][^\t\r\n\f  />]*)/i.exec(context.source)
  // 标签名称
  const tag = match[1]
  // 消费正则表达式匹配到的全部内容，例如 <div>
  advanceBy(match[0].length)
  // 消费空白字符
  advanceSpaces()
  const isSelfClosing = context.source.startsWith('/>')
  // 如果自闭和标签，消费 /> 否则消费 >
  advanceBy(isSelfClosing ? 2 : 1)
  return {
    type: 'Element',
    tag,
    // 标签属性
    props: [],
    // 子节点
    children: [],
    // 是否为自闭和标签
    isSelfClosing
  }
}

function isEnd(context, ancestors) {
  // 解析完毕直接返回
  if (!context.source) return true
  // 与父级节点栈内所以节点做比较
  for (let i = ancestors.length - 1; i >= 0; --i) {
    // 只要栈中存在于当前结束标签同名的节点，就停止
    if (context.source.startsWith(`</${ancestors[i].tag}`)) {
      return true
    }
  }
}
