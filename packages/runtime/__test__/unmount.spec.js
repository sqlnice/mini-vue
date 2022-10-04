import { createRenderer } from '../render'
import { h, Shape } from '../vnode'
const { render } = createRenderer()

function getTag(el) {
  return el.tagName.toLowerCase()
}
let root
beforeEach(() => {
  root = document.createElement('div')
})

describe('unmount from root', () => {
  test('unmount element', () => {
    render(h('div'), root)
    expect(root.children.length).toBe(1)

    render(null, root)
    expect(root.children.length).toBe(0)
  })

  test('unmount Shape.Text node', () => {
    render(h(Shape.Text, null, 'hello world!'), root)
    expect(root.firstChild.textContent).toBe('hello world!')

    render(null, root)
    expect(root.firstChild).toBeFalsy()
  })

  test('unmount Shape.Fragment', () => {
    render(
      h(Shape.Fragment, null, [
        h(Shape.Text, null, 'hello world!'),
        h('div'),
        h('h1')
      ]),
      root
    )
    expect(root.childNodes[1].textContent).toBe('hello world!')
    const { children } = root
    expect(getTag(children[0])).toBe('div')
    expect(children.length).toBe(2)

    render(null, root)
    expect(root.childNodes.length).toBe(0)
  })
})

describe('unmount from inner', () => {
  test('unmount element', () => {
    render(
      h('ul', null, [
        h('li', null, [h('span', null, 'item1')]),
        h('li', null, [h('span', null, 'item2')]),
        h('li', null, [h('span', null, 'item3'), h('span', null, 'item4')])
      ]),
      root
    )
    expect(root.innerHTML).toBe(
      '<ul><li><span>item1</span></li>' +
        '<li><span>item2</span></li>' +
        '<li><span>item3</span><span>item4</span></li></ul>'
    )

    render(
      h('ul', null, [
        h('li', null, [h('span')]),
        h('li', null, [h('span', null, 'item4')])
      ]),
      root
    )

    expect(root.innerHTML).toBe(
      '<ul><li><span></span></li>' + '<li><span>item4</span></li></ul>'
    )
  })

  test('unmount Shape.Text node', () => {
    render(
      h('div', null, [
        h(Shape.Text, null, 'Shape.Text1'),
        h('p', null, [h(Shape.Text, null, 'Shape.Text2')])
      ]),
      root
    )
    expect(root.innerHTML).toBe('<div>Shape.Text1<p>Shape.Text2</p></div>')

    render(h('div', null, [h('p', null, [])]), root)
    expect(root.innerHTML).toBe('<div><p></p></div>')
  })

  test('unmount Shape.Fragment', () => {
    render(
      h('div', null, [h(Shape.Fragment, null, [h('h1'), h('h2'), h('h3')])]),
      root
    )
    expect(root.innerHTML).toBe('<div><h1></h1><h2></h2><h3></h3></div>')

    render(h('div'), root)
    expect(root.innerHTML).toBe('<div></div>')
  })
})
