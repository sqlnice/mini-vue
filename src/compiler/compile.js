import { parse } from './parse'
import { generate } from './codegen'
import { transform } from './transform'
export function compile(template) {
  const ast = parse(template)
  transform(ast)
  console.log('transform之后：', ast)
  return generate(ast.jsNode)
}
