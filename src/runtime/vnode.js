import { isArray } from '../utils'

export const Shape = {
  Text: Symbol('Text'),
  Comment: Symbol('Comment'),
  Fragment: Symbol('Fragment')
}
export function h(type, props, children) {
  if (!type) return null
  const res = {
    type,
    props,
    children: isArray(children) ? children.map(child => h(child)) : children
  }
  console.log(res)
  return res
}
