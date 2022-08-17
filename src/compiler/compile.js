import { parse } from './parse'
import { generate } from './codegen'
import { transform } from './transform'
export function compile(template) {
  const ast = parse(template)
  transform(ast)
  return generate(ast.jsNode)
}
