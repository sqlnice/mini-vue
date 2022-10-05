import {
  effect,
  reactive,
  shallowReactive,
  shallowReadonly
} from '@mini-vue/reactivity'
import { queueJob } from './scheduler'
import { LifecycleHooks } from './lifeCycle'
import { isFunction, isObject, isArray } from '@mini-vue/shared'
import { compile } from '@mini-vue/compiler'
import { normalizeVNode } from './vnode'
// 对于不同组件在 setup 实例化过程中注册各自的生命周期防止混乱的解决方式就是定义一个 currentInstance 变量
export let currentInstance
export const setCurrentInstance = instance => {
  const prev = currentInstance
  currentInstance = instance
  return prev
}
export const unsetCurrentInstance = () => {
  currentInstance = null
}

/**
 * @param {*} vnode
 * @param {*} container
 * @param {*} anchor
 * @param {*} patch
 */
export function mountComponent(vnode, container, anchor, patch, options) {
  const { createElement, insert } = options
  //  vnode = {
  //  type: MyComponet,
  //  props: {},
  //  children: {
  //    header() {
  //      return { type: 'div', children: '我是标题插槽' }
  //    }
  //  }

  // 获取组件的选项对象
  let { type: componentOptions } = vnode
  // 函数式组件
  const isFunctional = isFunction(componentOptions)
  if (isFunctional) {
    componentOptions = {
      render: vnode.type,
      props: vnode.type.props
    }
  }
  // componentOptions = {
  //   name: '我是组件',
  //   props: {},
  //   data() {
  //     return {}
  //   },
  //   created() {},
  //   render() {
  //     return {
  //       type: 'div',
  //       children: [
  //         { type: 'header', children: [this.$slots.header()] }
  //       ]
  //     }
  //   },
  //   setup(props, context) {
  //     context.emit('change')
  //     onMounted(() => {}))
  //     return {}
  //   }
  // }

  const {
    data,
    beforeCreate,
    created,
    beforeMounte,
    mounted,
    beforeUpdate,
    updated,
    props: propsOption = [],
    setup
  } = componentOptions

  // beforeCreate
  beforeCreate && beforeCreate()

  // 包装为响应式数据
  const state = typeof data === 'function' ? reactive(data()) : null

  // 得到最终的 props 和 attrs
  const [props, attrs] = resolveProps(propsOption, vnode.props)

  // 处理 slots （在父组件的模板中，插槽们会被渲染为一个对象放在 children 里面。具体见 mountComponent 函数下面注释
  const slots = vnode.children || {}

  // 获取组件的 render，当选项对象中 setup 存在时可能没有
  const { render } = componentOptions
  // 组件实例 维护运行过程中所有的信息
  const instance = {
    state,
    props: shallowReactive(props),
    attrs,
    isMounted: false,
    subTree: null,
    slots,
    keepAliveCtx: null,
    render
  }
  const isKeepAlive = vnode.type.__isKeepAlive
  if (isKeepAlive) {
    // 在 KeepAlive 实例上添加 keepAliveCtx
    instance.keepAliveCtx = {
      move(vnode, container, anchor) {
        insert(vnode.component.subTree.el, container, anchor)
      },
      createElement
    }
  }
  /**
   * 处理 setup
   * setup 接收两个参数， props 和 setupContext
   */

  // 处理 emit
  // event 事件名称
  // payload 传递给事件的参数
  function emit(event, ...payload) {
    // 根据约定的名称处理 change -> onChange
    const eventName = `on${event[0].toUpperCase()}${event.slice(1)}`
    const handler = instance.props[eventName]
    if (handler) {
      handler(...payload)
    } else {
      console.warn(`${eventName} 事件不存在`)
    }
  }

  let setupState = null
  if (setup) {
    const setupContext = { attrs, emit, slots }
    // 设置 currentInstance
    const prevInstance = setCurrentInstance(instance)
    // 执行 setup 函数，为了避免用户需改 props，使用 shallowReadonly 包裹
    const setupResult = setup(shallowReadonly(instance.props), setupContext)
    setCurrentInstance(prevInstance)
    if (typeof setupResult === 'function') {
      if (instance.render)
        console.error('setup 函数返回渲染函数，render 选项将被忽略')
      instance.render = setupResult
    } else {
      // 作为数据状态赋值给 setupResult
      setupState = setupResult
    }
  }

  // 用于后续更新
  vnode.instance = instance

  // 渲染上下文，本质是实例的代理
  // 在渲染时通过 this 取值，可能在 data 里，也可能在 props、setup 中
  const renderContext = new Proxy(instance, {
    get(target, key) {
      const { state, props } = target
      if (state && key in state) {
        // 先读取自身
        return state[key]
      } else if (key in props) {
        // 再从 props 中取
        return props[key]
      } else if (setupState && key in setupState) {
        // 如果有 setup 则从里面取
        return setupState[key]
      } else if (key === '$slots') {
        return slots
      } else {
        console.warn(`${key}不存在`)
      }
    },
    set(target, key, value) {
      const { state, props } = target
      if (state && key in state) {
        state[key] = value
      } else if (key in props) {
        props[key] = value
      } else if (setupState && key in setupState) {
        setupState[key] = value
      } else {
        console.warn(`${key}不存在`)
      }
    }
  })

  if (!componentOptions.render && componentOptions.template) {
    let { template } = componentOptions
    if (template[0] === '#') {
      const el = document.querySelector(template)
      template = el ? el.innerHTML : ''
    }
    instance.render = new Function('_ctx', compile(template))
    console.log('渲染render：', instance.render)
  }
  // created
  created && created.call(renderContext)
  effect(
    () => {
      // 使用 template 时此时的 instance.render
      // function(_ctx) {
      //   with(_ctx) {
      //     const { h } = MiniVue
      //     return h('div', null, [h('p', null, counter.value), h('button', { onClick: add }, 'click')])
      //   }
      // }

      // 使用 render 选项时此时的 instance.render
      // render() {
      //   return {
      //     type: 'div',
      //     children: ['我是内容']
      //   }
      // }

      // 获取应该渲染的 vnode
      const subTree = normalizeVNode(
        instance.render.call(renderContext, renderContext)
      )
      if (!instance.isMounted) {
        // beforeMounte
        beforeMounte && beforeMounte.call(renderContext)

        // 更新 attrs
        fallThrough(instance, subTree)
        // 初次挂载
        patch(null, subTree, container, anchor)
        instance.isMounted = true

        // mounted
        mounted && mounted.call(renderContext)
        instance[LifecycleHooks.MOUNTED] &&
          instance[LifecycleHooks.MOUNTED].forEach(hook =>
            hook.call(renderContext)
          )
      } else {
        // 自更新

        // beforeUpdate
        beforeUpdate && beforeUpdate.call(renderContext)
        instance[LifecycleHooks.BEFORE_UPDATE] &&
          instance[LifecycleHooks.BEFORE_UPDATE].forEach(hook =>
            hook.call(renderContext)
          )
        // 更新 attrs
        fallThrough(instance, subTree)
        patch(instance.subTree, subTree, container, anchor)

        // updated
        updated && updated.call(renderContext)
        instance[LifecycleHooks.UPDATED] &&
          instance[LifecycleHooks.UPDATED].forEach(hook =>
            hook.call(renderContext)
          )
      }
      instance.subTree = subTree
    },
    {
      scheduler: queueJob
    }
  )
}

/**
 * 父组件更新引起子组件更新 - 被动更新
 * @param {*} n1
 * @param {*} n2
 * @param {*} container
 * @param {*} anchor
 */
export function patchComponent(n1, n2) {
  // 获取组件实例，同时让新的虚拟组件节点 n2.instance 也指向实例
  const instance = (n2.instance = n1.instance)
  // 当前的 props
  const { props } = instance
  // 检测 props 有没有更新
  if (hasPropsChanged(n1.props, n2.props)) {
    // 得到最终的 props
    const [nextProps] = resolveProps(n1.props, n2.props)
    for (const key in nextProps) {
      // 更新 props
      if (nextProps[key] !== n1.props[key]) {
        props[key] = nextProps[key]
      }
    }
    for (const key in props) {
      if (!(key in nextProps)) {
        // 删除不存在的 props
        delete props[key]
      }
    }
  }
}

/**
 * 对两个 props 进行合并处理，没有出现在 options 中的则挂载到 attrs 中
 * @param {*} options 组件自身
 * @param {*} propsData 父组件传进来的
 */
function resolveProps(options = [], propsData) {
  const props = {}
  const attrs = {}
  // 遍历为组件传递的 props 数据
  for (const key in propsData) {
    if (
      key.startsWith('on') ||
      (isObject(options) && key in options) ||
      (isArray(options) && options.includes(key))
    ) {
      // 如果在组件自身有定义 或者 以 on 开头的事件，则为合法
      props[key] = propsData[key]
    } else {
      attrs[key] = propsData[key]
    }
  }
  return [props, attrs]
}

/**
 * 更新组件上的 attrs
 * @param {*} instance
 * @param {*} subTree
 */
function fallThrough(instance, subTree) {
  if (Object.keys(instance.attrs).length) {
    subTree.props = {
      ...subTree.props,
      ...instance.attrs
    }
  }
}

/**
 * 检测子组件是否需要更新
 * @param {*} preProps
 * @param {*} nextProps
 */
function hasPropsChanged(preProps, nextProps) {
  const nextKeys = Object.keys(nextProps)
  if (nextKeys.length !== Object.keys(preProps).length) return true
  for (let i = 0; i < nextKeys.length; i++) {
    const key = nextKeys[i]
    if (nextProps[key] !== preProps[key]) return true
  }
  return false
}
