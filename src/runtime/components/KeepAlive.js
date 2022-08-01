import { isObject } from '../../utils'
import { currentInstance } from '../component'

const cache = new Map()
export const KeepAlive = {
  __isKeepAlive: true,
  props: {
    include: RegExp,
    exclude: RegExp
  },
  setup(props, { slots }) {
    // 缓存
    // 当前 KeepALive 实例
    const instance = currentInstance
    // 由渲染器注入
    const { move, createElement } = instance.keepAliveCtx
    // 隐藏容器
    const storageContainer = createElement('div')

    // 生命周期 - 失活 移动到隐藏容器里面取
    instance._deActivate = vnode => {
      move(vnode, storageContainer)
    }
    // 生命周期 - 激活
    instance._activate = (vnode, container, anchor) => {
      move(vnode, container, anchor)
    }

    return () => {
      // 获取“内部组件”
      const rawVNode = slots.default()
      // 如果不是组件，直接返回渲染
      if (!isObject(rawVNode.type)) {
        return rawVNode
      }

      // 获取“内部组件”的 name
      const name = rawVNode.type.name
      if (
        name &&
        // 无法被 include 匹配
        ((props.include && !props.include.test(name)) ||
          // 可以被 exclude 匹配
          (props.exclude && props.exclude.test(name)))
      ) {
        return rawVNode
      }

      // 获取已被缓存的组件
      const cachedVNode = cache.get(rawVNode.type)
      if (cachedVNode) {
        // 有缓存，则说明不用挂载，需要激活
        rawVNode.component = cachedVNode.component
        // 标书，避免渲染器重新挂载
        rawVNode.keptAlive = true
      } else {
        // 缓存起来，这样下次激活组件时就不会执行新的挂载操作
        cache.set(rawVNode.type, rawVNode)
      }
      // 标记，需要被 keepalive，防止避免渲染器将其卸载
      rawVNode.shouldKeepAlive = true
      // 方便在渲染器中访问
      rawVNode.keepAliveInstance = instance
      return rawVNode
    }
  }
}
