import { NodeTypes } from '../ast'
import { traverseNode as generate } from '../codegen'

const createAst = node => ({
  type: NodeTypes.ROOT,
  children: [node],
  components: [],
  directives: [],
  hoists: [],
  imports: [],
  cached: 0,
  temps: 0
})

describe('test codegen independent', () => {
  it('test of text', () => {
    const ast = createAst({
      type: NodeTypes.TEXT,
      content: 'foo'
    })
    const code = generate(ast)
    expect(code).toBe('h(Shape.Text, null, "foo")')
  })

  it('type of interpolation', () => {
    const ast = createAst({
      type: NodeTypes.INTERPOLATION,
      content: {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: 'foo',
        isStatic: false
      }
    })
    const code = generate(ast)
    expect(code).toBe('h(Shape.Text, null, foo)')
  })
})
