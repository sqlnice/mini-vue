import { parse, transform } from './parser'
import { generate } from './codegen'
export function compile(template) {
  const ast = parse(template)
  transform(ast)
  const code = generate(ast.jsNode)
  return code
}
