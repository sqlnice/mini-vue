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
    mode: TextModes.DATA
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
  const element = parseTag()
  // 递归调用 parseChildren 解析子标签
  element.children = parseChildren(context, ancestors)
  parseTag('end')
  return element
}
function parseInterpolation(context) {
  console.log(context)
}
function parseText(context) {
  console.log(context)
}
function parseTag(tag) {
  console.log(tag)
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
