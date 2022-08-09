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
  console.log('parse函数执行结果：', { type: 'Root', children: nodes })
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
      if (mode === TextModes.DATA && source[0] === '<') {
        if (context.source[1] === '!') {
          if (context.source.startsWith('<!--')) {
            // 注释
            node = parseComment(context)
          } else if (context.source.startsWith('<![CDATA[')) {
            // CDATA
            node = parseCDATA(context, ancestors)
          }
        } else if (context.source[1] === '/') {
          // 结束标签
        } else if (/[a-z]/i.test(context.source[1])) {
          // 标签
          node = parseElement(context, ancestors)
        }
      } else if (context.source.startsWith('{{')) {
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
  // 消费注释的开始部分
  context.advanceBy('<!--'.length)
  // 找到注释结束部分的位置索引
  const closeIndex = context.source.indexOf('-->')
  // 注释内容
  const content = context.source.slice(0, closeIndex)
  // 消费内容
  context.advanceBy(content.length)
  // 消费注释结束部分
  context.advanceBy('-->'.length)
  return {
    type: 'Comment',
    content
  }
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
  // 消费开始定界符
  context.advanceBy('{{'.length)
  // 找到结束定界符的位置索引
  const closeIndex = context.source.indexOf('}}')

  if (closeIndex < 0) {
    console.error('插值缺少结束定界符')
  }

  // 截取两个定界符直接的内容作为插值表达式
  const content = context.source.slice(0, closeIndex)
  // 消费表达式的内容
  context.advanceBy(content.length)
  // 消费结束定界符
  context.advanceBy('}}'.length)

  return {
    type: 'Interpolation',
    content: {
      type: 'Expression',
      content: decodeHtml(content) // 返回解码后的值
    }
  }
}

function parseText(context) {
  // 默认整个模板剩余部分都作为文本内容
  let endIndex = context.source.length
  // 寻找字符 < 的位置索引
  const ltIndex = context.source.indexOf('<')
  // 寻找插值 {{ 的位置索引
  const delimiterIndex = context.source.indexOf('{{')
  if (ltIndex > -1 && ltIndex < endIndex) {
    endIndex = ltIndex
  }
  if (delimiterIndex > -1 && delimiterIndex < endIndex) {
    endIndex = delimiterIndex
  }
  // 截取文本内容
  const content = context.source.slice(0, endIndex)
  // 消费文本内容
  context.advanceBy(content.length)

  return {
    type: 'Text',
    content: decodeHtml(content) // 解码内容
  }
}
const namedCharacterReferences = {
  gt: '>',
  'gt;': '>',
  lt: '<',
  'lt;': '<',
  'ltcc;': '⪦'
}

// rawText 被解码的文本内容
// asAttr 是否作为属性值
function decodeHtml(rawText, asAttr = false) {
  let offset = 0
  const end = rawText.length
  // 最终返回值
  let decodedText = ''
  // 引用表中实体名称的最大长度
  let maxCRNameLength = 0

  // 用于消费指定长度的文本
  function advance(length) {
    offset += length
    rawText = rawText.slice(length)
  }

  // 消费字符串，直到处理完毕
  while (offset < end) {
    // 匹配字符引用的开始部分，如果匹配成功，那么 head[0] 的值将有三种可能
    // 1. head[0] === '&' 说明该字符引用是命名字符引用
    // 2. head[0] === '&#' 说明该字符引用是用十进制表示的数字字符引用
    // 2. head[0] === '&#x' 说明该字符引用是用十六进制表示的数字字符引用
    const head = /&(?:#x?)?/i.exec(rawText)
    // 没有匹配，说明已经没有需要解码的内容了
    if (!head) {
      // 计算剩余内容的长度
      const remaining = end - offset
      decodedText += rawText.slice(0, remaining)
      // 消费剩余内容
      advance(remaining)
      break
    }

    // head.index 为匹配的字符 & 在 rawText 中的索引
    // 截取字符 & 之前的内容加到 decodedText 上
    decodedText += rawText.slice(0, head.index)
    // 消费字符 & 之前的内容
    advance(head.index)

    // 满足条件则说明是命名字符引用，否则为数字字符引用
    if (head[0] === '&') {
      // Named character reference.
      let name = ''
      let value
      // 字符 & 的下一个字符必须是 ASCII 字母或数字
      if (/[0-9a-z]/i.test(rawText[1])) {
        // 根据引用表计算实体名称的最大长度
        if (!maxCRNameLength) {
          maxCRNameLength = Object.keys(namedCharacterReferences).reduce(
            (max, name) => Math.max(max, name.length),
            0
          )
        }
        // 从最大长度开始对文本进行截取，并试图去引用表中找到此项
        for (let length = maxCRNameLength; !value && length > 0; --length) {
          name = rawText.substr(1, length)
          value = namedCharacterReferences[name]
        }
        // 有值则解码成功
        if (value) {
          // 检查最后是否为分号
          const semi = name.endsWith(';')
          // 如果解码的文本作为属性值，最后一个匹配的字符不是分号，
          // 并且最后一个匹配字符的下一个字符是等于号、ASCII 字母或数字，
          // 由于历史原因，将字符 & 和实体名称 name 作为普通文本
          if (
            asAttr &&
            !semi &&
            /[=a-z0-9]/i.test(rawText[name.length + 1] || '')
          ) {
            decodedText += '&' + name
            advance(1 + name.length)
          } else {
            // 其他情况下，将解码后的内容拼接
            decodedText += value
            advance(1 + name.length)
          }
        } else {
          // 没找到，解码失败
          decodedText += '&' + name
          advance(1 + name.length)
        }
      } else {
        // 如果字符 & 的下一个字符不是 ASCII 字母或数字，则将字符 & 看做普通文本
        decodedText += '&'
        advance(1)
      }
    } else {
      // 判断是十进制表示还是十六进制表示
      const hex = head[0] === '&#x'
      // 根据不同进制表示法，选用不同的正则
      const pattern = hex ? /^&#x([0-9a-f]+);?/i : /^&#([0-9]+);?/
      // 最终，body[1] 的值就是 Unicode 码点
      const body = pattern.exec(rawText)

      // 如果匹配成功，则调用 String.fromCodePoint 函数进行解码
      if (body) {
        // 将码点字符串转为十进制数字
        let cp = Number.parseInt(body[1], hex ? 16 : 10)
        // 码点的合法性检查
        if (cp === 0) {
          // 如果码点值为 0x00，替换为 0xfffd
          cp = 0xfffd
        } else if (cp > 0x10ffff) {
          // 如果码点值超过了 Unicode 的最大值，替换为 0xfffd
          cp = 0xfffd
        } else if (cp >= 0xd800 && cp <= 0xdfff) {
          // 如果码点值处于 surrogate pair 范围，替换为 0xfffd
          cp = 0xfffd
        } else if ((cp >= 0xfdd0 && cp <= 0xfdef) || (cp & 0xfffe) === 0xfffe) {
          // 如果码点值处于 `noncharacter` 范围，则什么都不做，交给平台处理
          // noop
        } else if (
          // 控制字符集的范围是：[0x01, 0x1f] 加上 [0x7f, 0x9f]
          // 却掉 ASICC 空白符：0x09(TAB)、0x0A(LF)、0x0C(FF)
          // 0x0D(CR) 虽然也是 ASICC 空白符，但需要包含
          (cp >= 0x01 && cp <= 0x08) ||
          cp === 0x0b ||
          (cp >= 0x0d && cp <= 0x1f) ||
          (cp >= 0x7f && cp <= 0x9f)
        ) {
          // 在 CCR_REPLACEMENTS 表中查找替换码点，如果找不到则使用原码点
          cp = CCR_REPLACEMENTS[cp] || cp
        }
        // 解码后追加到 decodedText 上
        decodedText += String.fromCodePoint(cp)
        // 消费掉整个数字字符引用的内容
        advance(body[0].length)
      } else {
        // 如果没有匹配，则不进行解码操作，只是把 head[0] 追加到 decodedText 并消费掉
        decodedText += head[0]
        advance(head[0].length)
      }
    }
  }
  return decodedText
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

  // 解析属性
  const props = parseAttributes(context)

  const isSelfClosing = context.source.startsWith('/>')
  // 如果自闭和标签，消费 /> 否则消费 >
  advanceBy(isSelfClosing ? 2 : 1)
  return {
    type: 'Element',
    tag,
    // 标签属性
    props,
    // 子节点
    children: [],
    // 是否为自闭和标签
    isSelfClosing
  }
}

/**
 * 解析属性
 */
function parseAttributes(context) {
  const { advanceBy, advanceSpaces } = context
  const props = []
  // 不断消费模板内容，直到遇到标签的结束部分
  while (!context.source.startsWith('>') && !context.source.startsWith('/>')) {
    // 用于匹配属性名称
    const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source)
    // 属性名称
    const name = match[0]
    // 消费属性名称
    advanceBy(name.length)
    // 消费空白字符
    advanceSpaces()
    // 消费等于号
    advanceBy(1)
    // 消费等于号与属性值直接的空白字符
    advanceSpaces()

    // 定义属性值
    let value = ''

    const quote = context.source[0]
    // 属性值是否被引号引用
    const isQuoted = quote === '"' || quote === "'"
    if (isQuoted) {
      // 消费引号
      advanceBy(1)
      // 获取下一个引号的索引
      const endQuoteIndex = context.source.indexOf(quote)
      if (endQuoteIndex > -1) {
        // 获取以一个引号之前的内容作为属性值
        value = context.source.slice(0, endQuoteIndex)
        // 消费属性值
        advanceBy(value.length)
        // 消费引号
        advanceBy(1)
      } else {
        console.error('缺少引号')
      }
    } else {
      // 属性值没有被引号引用
      // 下一个空白字符之前的内容全部作为属性值
      const match = /^[^\t\r\n\f >]+/.exec(context.source)
      // 获取属性值
      value = match[0]
      // 消费属性值
      advanceBy(value.length)
    }
    advanceSpaces()
    const isDirective = name.startsWith('@') || name.startsWith('v-')
    props.push({
      type: isDirective ? 'Directive' : 'Attribute',
      name,
      value
    })
  }

  return props
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
// https://html.spec.whatwg.org/multipage/parsing.html#numeric-character-reference-end-state
const CCR_REPLACEMENTS = {
  0x80: 0x20ac,
  0x82: 0x201a,
  0x83: 0x0192,
  0x84: 0x201e,
  0x85: 0x2026,
  0x86: 0x2020,
  0x87: 0x2021,
  0x88: 0x02c6,
  0x89: 0x2030,
  0x8a: 0x0160,
  0x8b: 0x2039,
  0x8c: 0x0152,
  0x8e: 0x017d,
  0x91: 0x2018,
  0x92: 0x2019,
  0x93: 0x201c,
  0x94: 0x201d,
  0x95: 0x2022,
  0x96: 0x2013,
  0x97: 0x2014,
  0x98: 0x02dc,
  0x99: 0x2122,
  0x9a: 0x0161,
  0x9b: 0x203a,
  0x9c: 0x0153,
  0x9e: 0x017e,
  0x9f: 0x0178
}
