import { isArray } from '../utils'

export function h(type, props, children) {
  if (!type) return null
  let res = {
    type,
    props,
    children: isArray(children) ? children.map(child => h(child)) : children,
  }
  console.log(res);
  return res
}
