import { parse } from './parse'
import { generate } from './codegen'
export function compile(template) {
  const ast = parse(template)
  const code = generate(ast.jsNode)
  return code
}
