export function h(type, props, children) {
  if (!type) return null
  return {
    type,
    props,
    children,
  }
}
