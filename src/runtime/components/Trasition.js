const nextFrame = fn => {
  requestAnimationFrame(() => {
    requestAnimationFrame(fn)
  })
}
export const Transition = {
  name: 'Transition',
  props: {
    name: String
  },
  setup(props, { slots }) {
    const name = props.name || 'v'
    return () => {
      // 获取默认插槽需要过渡的元素
      const innerVNode = slots.default()
      innerVNode.transition = {
        beforeEnter(el) {
          // 进入之前
          el.classList.add(`${name}-enter-from`)
          el.classList.add(`${name}-enter-active`)
        },
        enter(el) {
          // 进入
          nextFrame(() => {
            el.classList.remove(`${name}-enter-from`)
            el.classList.add(`${name}-enter-to`)
            el.addEventListener('transitionend', () => {
              // 进入结束
              el.classList.remove(`${name}-enter-active`)
              el.classList.remove(`${name}-enter-to`)
            })
          })
        },
        leave(el, performRemove) {
          // 离开
          el.classList.add(`${name}-leave-from`)
          el.classList.add(`${name}-leave-active`)
          document.body.offsetHeight
          nextFrame(() => {
            el.classList.remove(`${name}-leave-from`)
            el.classList.add(`${name}-leave-to`)
            el.addEventListener('transitionend', () => {
              // 进入结束
              el.classList.remove(`${name}-leave-to`)
              el.classList.remove(`${name}-leave-active`)
              performRemove()
            })
          })
        }
      }
      return innerVNode
    }
  }
}
