import { isString } from '../../utils'

export const Teleport = {
  __isTeleport: true,
  process(n1, n2, container, anchor, internals) {
    const { patch, patchChildren, move } = internals
    if (!n1) {
      // 挂载
      const to = n2.props.to
      const target = isString(to) ? document.querySelector(to) : to
      n2.children.forEach(c => patch(null, c, target, anchor))
    } else {
      // 更新
      patchChildren(n1, n2, container)
      if (n1.props.to !== n2.props.to) {
        const newTo = n2.props.to
        const newTarget = isString(newTo)
          ? document.querySelector(newTo)
          : newTo
        n2.children.forEach(c => move(c, newTarget, anchor))
      }
    }
  }
}
