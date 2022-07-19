
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var MiniVue = (function () {
  'use strict';

  function isObject(target) {
    return typeof target === 'object' && target !== null
  }

  function isArray(target) {
    return Array.isArray(target)
  }

  function isString(target) {
    return typeof target === 'string'
  }

  function isFunction(target) {
    return typeof target === 'function'
  }
  function hasChanged(oldValue, newValue) {
    return oldValue !== newValue && !(Number.isNaN(oldValue) && Number.isNaN(newValue))
  }

  const TriggerOpTypes = {
    SET: 'set',
    ADD: 'add',
    DELETE: 'delete',
    CLEAR: 'clear',
  };

  let activeEffect;
  const effectStack = [];
  // effectStack 先进后出，解决 effect 嵌套问题
  // ---------
  // |       |
  // | inner |
  // | out   |
  // |       |
  // ---------
  function effect(fn, options = {}) {
    const effectFn = () => {
      try {
        cleanup(effectFn);
        effectStack.push(effectFn);
        activeEffect = effectFn;
        return fn()
      } finally {
        effectStack.pop();
        activeEffect = effectStack[effectStack.length - 1];
      }
    };
    effectFn.deps = [];
    // computed { lazy }
    if (!options.lazy) {
      effectFn();
    }
    effectFn.options = options;
    return effectFn
  }

  function cleanup(effectFn) {
    for (let i = 0; i < effectFn.deps.length; i++) {
      // deps 是依赖集合
      const deps = effectFn.deps[i];
      deps.delete(effectFn);
    }
    effectFn.deps.length = 0;
  }

  const targetMap = new WeakMap();
  // targetMap:{
  //   [target]: {
  //     [key]: []
  //     count: [effect1, effect2]
  //   }
  // }
  function track(target, key) {
    if (!activeEffect || !shouldTrack) return
    let depsMap = targetMap.get(target);
    if (!depsMap) {
      targetMap.set(target, (depsMap = new Map()));
    }

    let deps = depsMap.get(key);
    if (!deps) {
      depsMap.set(key, (deps = new Set()));
    }
    // 把当前激活的副作用函数添加到依赖集合 deps 中
    deps.add(activeEffect);
    // deps 就是一个与当前副作用函数存在联系的依赖集合
    activeEffect.deps.push(deps);
  }

  function trigger(target, key, type, newValue) {
    const depsMap = targetMap.get(target);
    if (!depsMap) return
    // 取得与 key 相关的副作用函数
    const effects = depsMap.get(key);
    // 取得与 ITERATE_KEY 相关的副作用函数
    const iterateEffects = depsMap.get(ITERATE_KEY);

    const effectsToRun = new Set();

    effects &&
      effects.forEach(effectFn => {
        if (effectFn !== activeEffect) {
          effectsToRun.add(effectFn);
        }
      });
    // 只有操作类型为 'ADD'/'DELETE' 时，才触发与 ITERATE_KEY 相关联的副作用函数重新执行
    // 比如 for...in，修改值不用触发，因为他只检测 key；obj.foo = 2，设置 obj 新的 key 时，才触发
    if ([TriggerOpTypes.ADD, TriggerOpTypes.DELETE].includes(type)) {
      iterateEffects &&
        iterateEffects.forEach(effectFn => {
          if (effectFn !== activeEffect) {
            effectsToRun.add(effectFn);
          }
        });
    }
    // 当给数组通过索引设置值时，触发相关依赖
    if (isArray(target)) {
      const lengthEffects = depsMap.get('length');
      lengthEffects &&
        lengthEffects.forEach(effectFn => {
          if (effectFn !== activeEffect) {
            effectsToRun.add(effectFn);
          }
        });
    }

    // 直接修改数组的长度
    if (isArray(target) && key === 'length') {
      depsMap.forEach((effects, key) => {
        if (key >= newValue) {
          // 只触发长度之后的索引依赖的副作用函数
          effects.forEach(effectFn => {
            if (effectFn !== activeEffect) {
              effectsToRun.add(effectFn);
            }
          });
        }
      });
    }

    effectsToRun.forEach(effectFn => {
      if (effectFn?.options?.scheduler) {
        // 目前是计算属性用到，计算属性依赖的响应式对象变化之后触发更新
        effectFn.options.scheduler(effectFn);
      } else {
        effectFn();
      }
    });
  }

  // 定义一个任务队列
  const jobQueue = new Set();

  // 使用 Promise.resolve() 创建一个 promise 实例，用它将一个任务添加到微任务队列
  const p = Promise.resolve();

  // 任务队列是否在执行
  let isFlushing = false;

  function flushJob() {
    if (isFlushing) return
    // 正在刷新
    isFlushing = true;
    p.then(() => {
      jobQueue.forEach(job => job());
    }).finally(() => {
      // 刷新完毕
      isFlushing = false;
    });
  }

  const proxyMap = new WeakMap();
  // 用于拦截 for...in 操作时，关联副作用函数
  const ITERATE_KEY = Symbol();

  const arrayInstrumentations = {}
  ;['includes', 'indexOf', 'lastIndexOf'].forEach(method => {
    const originMethod = Array.prototype[method];
    arrayInstrumentations[method] = function (...args) {
      // 这里 this 指代理对象，先在代理对象中查找
      let res = originMethod.apply(this, args);
      if (res === false) {
        // 再次通过 this.raw 拿到原始数组查找
        res = originMethod.apply(this.raw, args);
      }
      return res
    };
  });
  let shouldTrack = true
  ;['push', 'pop', 'shift', 'unshift', 'splice'].forEach(method => {
    const originMethod = Array.prototype[method];
    arrayInstrumentations[method] = function (...args) {
      shouldTrack = false;
      let res = originMethod.apply(this, args);
      shouldTrack = true;
      return res
    };
  });

  /**
   * reactive 创建器
   * @param {*} obj
   * @param {*} isShallow
   */
  function createReactive(obj, isShallow = false, isReadonly = false) {
    if (!isObject(obj)) return obj
    if (isReactive(obj)) return obj
    if (proxyMap.has(obj)) return proxyMap.get(obj)
    const proxy = new Proxy(obj, {
      get(target, key, receiver) {
        if (key === '__isReactive') return true
        if (key === 'raw') return target
        if (isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
          return Reflect.get(arrayInstrumentations, key, receiver)
        }

        // 在非只读时才建立响应联系
        // 数组调用 for...of 或者 values 方法时，都会读取数组的 Symbol.interator 属性，是一个 symbol 值，为避免意外及提升性能，不应与这类 symbol 值直接建立响应联系
        if (!isReadonly && typeof key !== 'symbol') {
          // 依赖依赖
          track(target, key);
        }

        // https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Reflect
        const res = Reflect.get(target, key, receiver);

        // 浅响应，直接返回值
        if (isShallow) {
          return res
        }
        if (isObject(res)) {
          return isReadonly ? readonly(res) : reactive(res)
        }
        return res
      },
      set(target, key, newValue, receiver) {
        if (isReadonly) {
          console.warn(`属性 ${key} 是只读的`);
          return true
        }
        const type = isArray(target)
          ? Number(key) < target.length
            ? TriggerOpTypes.SET
            : TriggerOpTypes.ADD
          : Object.prototype.hasOwnProperty.call(target, key)
          ? TriggerOpTypes.SET
          : TriggerOpTypes.ADD;
        const oldValue = target[key];
        const res = Reflect.set(target, key, newValue, receiver);
        // 说明 receiver 就是 target 的代理对象
        if (target === receiver.raw) {
          if (hasChanged(oldValue, newValue)) {
            // 触发更新
            trigger(target, key, type, newValue);
          }
        }
        return res
      },
      has(target, key) {
        // 拦截 in 操作  key in obj
        track(target, key);
        return Reflect.has(target, key)
      },
      ownKeys(target) {
        // 拦截 for...in 操作
        // 如果是数组使用 length 建立响应联系
        track(target, isArray(target) ? 'length' : ITERATE_KEY);
        return Reflect.ownKeys(target)
      },
      deleteProperty(target, key) {
        if (isReadonly) {
          console.warn(`属性 ${key} 是只读的`);
          return true
        }
        // 判断被操作的属性是否是对象自己的属性
        const hadKey = Object.prototype.hasOwnProperty.call(target, key);
        // 使用 Reflect 完成删除操作
        const res = Reflect.deleteProperty(target, key);
        if (res && hadKey) {
          // 只有成功删除，才触发更新
          trigger(target, key, TriggerOpTypes.DELETE);
        }
        return res
      },
    });
    proxyMap.set(obj, proxy);
    return proxy
  }

  function reactive(obj) {
    return createReactive(obj)
  }

  /**
   * 浅响应
   */
  function shallowReactive(obj) {
    return createReactive(obj, true)
  }

  function readonly(obj) {
    return createReactive(obj, false, true /* 只读 */)
  }

  function shallowReadonly(obj) {
    return createReactive(obj, true, true /* 只读 */)
  }

  function isReactive(target) {
    return !!(target && target.__isReactive)
  }

  function toRef(obj, key) {
    const wrapper = {
      get value() {
        return obj[key]
      },
      // 设置值
      set value(val) {
        obj[key] = val;
      },
    };
    Object.defineProperty(wrapper, '__v_isRef', { value: true });
    return wrapper
  }

  function toRefs(obj) {
    const ret = {};
    for (const key in obj) {
      ret[key] = toRef(obj, key);
    }
    return ret
  }

  function proxyRefs(target) {
    return new Proxy(target, {
      get(target, key, receiver) {
        const value = Reflect.get(target, key, receiver);
        return value.__v_isRef ? value.value : value
      },
      set(target, key, newValue, recivier) {
        // 先读取之前的真实值
        const value = target[key];
        if (value.__v_isRef) {
          value.value = newValue;
          return true
        }
        return Reflect.set(target, key, newValue, recivier)
      },
    })
  }

  function ref(value) {
    if (isRef(value)) return value
    return new RefImpl(value)
  }

  class RefImpl {
    constructor(value) {
      this.__v_isRef = true;
      this._value = convert(value);
    }

    get value() {
      track(this, 'value');
      return this._value
    }

    set value(newValue) {
      if (hasChanged(this._value, newValue)) {
        this._value = convert(newValue);
        trigger(this, 'value');
      }
    }
  }

  function convert(value) {
    return isObject(value) ? reactive(value) : value
  }

  function isRef(value) {
    return !!value.__v_isRef
  }

  function computed(getterOrOption) {
    let getter,
      setter = () => {
        console.warn('computed is readonly');
      };
    if (isFunction(getterOrOption)) {
      getter = getterOrOption;
    } else {
      getter = getterOrOption.get;
      setter = getterOrOption.set;
    }
    return new ComputedImpl(getter, setter)
  }

  class ComputedImpl {
    constructor(getter, setter) {
      this.setter = setter;
      this._value = undefined;
      this._dirty = true; // 是否改变
      this.effect = effect(getter, {
        lazy: true, // 懒计算
        scheduler: () => {
          // computed 里面依赖的响应式对象变化时，才执行此方法
          if (!this._dirty) {
            this._dirty = true;
            // 触发更新
            trigger(this, 'value');
          }
        },
      });
    }

    get value() {
      if (this._dirty) {
        this._value = this.effect();
        this._dirty = false;
        track(this, 'value');
        // 依赖收集
      }
      return this._value
    }

    set value(newValue) {
      this.setter(newValue);
    }
  }

  function watch(source, cb, options = {}) {
    let getter;
    if (typeof source === 'function') {
      getter = source;
    } else {
      // 递归读取
      getter = () => traverse(source);
    }
    let oldValue, newValue;

    // 用来存储用户注册的过期回调
    let cleanup;
    function onInvalidate(fn) {
      // 将过期回调存储到 cleanup 中
      cleanup = fn;
    }

    const job = () => {
      // 数据变化时执行回调
      newValue = effectFn();
      // 调用回调之前，先调用过期回到
      if (cleanup) {
        cleanup();
      }
      cb(newValue, oldValue, onInvalidate);
      oldValue = newValue;
    };
    const effectFn = effect(() => getter(), {
      lazy: true,
      scheduler: () => {
        if (options.flush === 'post') {
          const p = Promise.resolve();
          p.then(job); // 'post'
        } else {
          job(); // 'sync'
        }
        // pre 涉及到组件更新，暂时无法模拟
      },
    });

    if (options.immediate) {
      job();
    } else {
      // 先手动调用副作用函数
      oldValue = effectFn();
    }
  }

  function traverse(value, seen = new Set()) {
    if (typeof value !== 'object' || value === null || seen.has(value)) return
    seen.add(value);

    // 目前只考虑对象，不考虑数组等
    for (const key in value) {
      traverse(value[key], seen);
    }

    return value
  }

  /**
   * 文本节点
   */
  const Text = Symbol();
  /**
   * 注释节点
   */
  const Comment = Symbol();
  function shouldSetAsProps(el, key) {
    // 特殊处理
    if (key === 'form' && el.tagName === 'INPUT') return false
    // 兜底
    return key in el
  }
  const browserOptions = {
    // 创建元素
    createElement(tag) {
      return document.createElement(tag)
    },
    // 设置元素的文本节点
    setElementText(el, text) {
      el.textContent = text;
    },
    // 在给定的 parent 下添加指定的元素
    insert(el, parent, anchor = null) {
      parent.appendChild(el, anchor);
    },
    // 格式化 classNames
    // class: 'foo bar'
    // class: { foo: true, bar: true }
    // class: ['foo', { bar: true }]
    normalizeClass(classPropsValue) {
      let res = '';
      if (typeof classPropsValue === 'string') return classPropsValue + ' '
      if (isArray(classPropsValue)) {
        classPropsValue.forEach(classProp => {
          res += browserOptions.normalizeClass(classProp);
        });
        return res
      }
      if (typeof classPropsValue === 'object') {
        for (const key in classPropsValue) {
          res += classPropsValue[key] ? key + ' ' : '';
        }
        return res
      }
    },
    createText(text) {
      return document.createTextNode(text)
    },
    setText(el, text) {
      el.nodeValue = text;
    },
    createComment(text) {
      return document.createComment(text)
    },

    // 处理 prop
    patchProps(el, key, prevValue, nextValue) {
      if (/^on/.test(key)) {
        console.log('key:', key);
        console.log('值:', nextValue);
        // 处理事件
        const name = key.slice(2).toLowerCase();

        const invokers = el._vei || (el._vei = {});
        // invokers 结构
        // {
        //   click: [],
        //   dbclick: ()=>{}
        // }

        let invoker = invokers[key];

        if (nextValue) {
          // 更新事件
          if (!invoker) {
            invoker = el._vei[key] = e => {
              // 如果事件被触发的时间 早于 事件被绑定的时间，说明那时还没有绑定
              console.log(e.timeStamp, invoker.attched);
              if (e.timeStamp < invoker.attched) return
              // 如果是数组，遍历逐个调用事件处理函数
              if (isArray(invoker.value)) {
                invoker.value.forEach(fn => fn(e));
              } else {
                invoker.value(e);
              }
            };
            invoker.value = nextValue;
            // 事件绑定时添加 attched 属性，存储事件处理函数被绑定的时间
            invoker.attched = performance.now();
            el.addEventListener(name, invoker);
          } else {
            invoker.value = nextValue;
          }
        } else {
          // 移除事件
          el.removeEventListener(name, prevValue);
        }
      } else if (key === 'class') {
        // el.className 这种方式性能最优
        el.className = nextValue || '';
      } else {
        if (shouldSetAsProps) {
          const type = typeof el[key];
          if (type === 'boolean' && nextValue === '') {
            el[key] = true;
          } else {
            el[key] = nextValue;
          }
        } else {
          el.setAttribute(key, nextValue);
        }
      }
    },
  };
  function createRenderer(options = browserOptions) {
    const { createElement, setElementText, insert, patchProps, normalizeClass, createText, setText, createComment } =
      options;
    function render(vnode, container) {
      if (vnode) {
        // 挂载
        patch(container._vnode, vnode, container);
      } else {
        if (container._vnode) {
          // 调用 unmount 卸载 旧vnode
          unmount(container._vnode);
        }
      }
      // 更新 vnode 引用
      container._vnode = vnode;
    }

    /**
     *
     * @param {VNode} n1 旧 vnode
     * @param {VNode} n2 新 vnode
     * @param {Element} container 挂载的目标节点
     */
    function patch(n1, n2, container) {
      // 新旧节点类型不同 则直接卸载旧节点
      if (n1 && n1.type !== n2.type) {
        unmount(n1);
        n1 = null;
      }
      const { type } = n2;
      if (isString(type)) {
        if (!n1) {
          // 挂载节点
          mountElement(n2, container);
        } else {
          // 更新节点
          patchElement(n1, n2);
        }
      } else if (isObject(type)) ; else if (type === Text) {
        // 文本节点
        if (!n1) {
          // 没有旧节点，挂载
          const el = (n2.el = createText(n2.children));
          insert(el, container);
        } else {
          // 新旧都有，替换
          const el = (n2.el = n1.el);
          if (n2.children !== n1.children) {
            setText(el, n2.children);
          }
        }
      } else if (type === Comment) {
        // 注释节点
        if (!n1) {
          const el = (n2.el = createComment(n2.children));
          insert(el, container);
        } else {
          const el = (n2.el = n1.el);
          if ((children !== n1.children)) {
            setText(el, n2.children);
          }
        }
      } else ;
    }

    function mountElement(vnode, container) {
      // 创建元素
      const el = (vnode.el = createElement(vnode.type));
      if (isString(vnode.children)) {
        // 文本节点
        // 设置元素的文本节点
        setElementText(el, vnode.children);
      } else if (isArray(vnode.children)) {
        // 挂载时，如果 children 子元素为数组，要遍历调用 patch 重新挂载
        vnode.children.forEach(child => {
          patch(null, child, el);
        });
      }

      if (vnode.props) {
        for (const key in vnode.props) {
          if (key === 'class' && vnode.props.class) {
            patchProps(el, key, null, normalizeClass(vnode.props[key]));
          } else {
            patchProps(el, key, null, vnode.props[key]);
          }
        }
      }

      // 在给定的 parent 下添加指定的元素
      insert(el, container);
    }

    /**
     * 更新节点
     * @param {*} n1
     * @param {*} n2
     */
    function patchElement(n1, n2) {
      const el = (n2.el = n1.el);
      const oldProps = n1.props;
      const newProps = n2.props;
      // 第一步：更新 props
      for (const key in newProps) {
        if (newProps[key] !== oldProps[key]) {
          // 新旧不相等
          patchProps(el, key, oldProps[key], newProps[key]);
        }
      }
      for (const key in oldProps) {
        if (!key in newProps) {
          // 旧 props 的值不在新 props 中
          patchProps(el, key, oldProps[key], null);
        }
      }
      // 第二部：更新 children
      patchChildren(n1, n2, el);
    }

    /**
     * 更新子节点 children
     * @param {*} n1 旧节点
     * @param {*} n2 新节点
     * @param {*} container DOM
     */
    function patchChildren(n1, n2, container) {
      // 新 children 类型为 String
      if (isString(n2.children)) {
        if (isArray(n1.children)) {
          // 旧 children 类型为 Array ：遍历旧节点卸载后替换
          n1.children.forEach(c => unmount(c));
        }
        // 替换
        setElementText(container, n2.children);
      } else if (isArray(n2.children)) {
        // 新 children 类型为 Array
        if (isArray(n1.children)) {
          // TODO Diff 算法
          n1.children.forEach(c => unmount(c));
          n2.children.forEach(c => patch(null, c, container));
        } else {
          // 旧节点要么是文本要么为空
          // 清空
          setElementText(container, '');
          // 挂载新节点
          n2.children.forEach(c => patch(null, c, container));
        }
      } else {
        // 新 children 类型为 空
        if (isArray(n1.children)) {
          // 旧 children 类型为 Array ：遍历旧节点卸载
          n1.children.forEach(c => unmount(c));
        } else if (isString(n1.children)) {
          // 旧 children 类型为 String：清空
          setElementText(container, '');
        }
        // 旧 children 类型为 空 ：都为空，什么也不做
      }
    }

    function unmount(vnode) {
      const parent = vnode.el.parentNode;
      parent.removeChild(vnode.el);
    }

    return { render }
  }

  function h(type, props, children) {
    if (!type) return null
    let res = {
      type,
      props,
      children: isArray(children) ? children.map(child => h(child)) : children,
    };
    console.log(res);
    return res
  }

  var index = MiniVue = {
    reactive,
    shallowReactive,
    readonly,
    shallowReadonly,
    effect,
    ref,
    toRef,
    toRefs,
    proxyRefs,
    computed,
    jobQueue,
    flushJob,
    watch,
    createRenderer,
    h,
    Text,
    Comment,
  };

  return index;

})();
