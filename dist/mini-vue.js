
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var MiniVue = (function () {
  'use strict';

  function isObject(target) {
    return typeof target === 'object' && target !== null
  }

  function hasChanged(oldValue, newValue) {
    return oldValue !== newValue && !(Number.isNaN(oldValue) && Number.isNaN(newValue))
  }

  function isArray(target) {
    return Array.isArray(target)
  }

  function isFunction(target) {
    return typeof target === 'function'
  }

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
        effectStack.push(effectFn);
        activeEffect = effectFn;
        return fn()
      } finally {
        effectStack.pop();
        activeEffect = effectStack[effectStack.length - 1];
      }
    };
    // computed { lazy }
    if (!options.lazy) {
      effectFn();
    }
    effectFn.scheduler = options.scheduler;
    return effectFn
  }

  const targetMap = new WeakMap();
  // targetMap:{
  //   [target]: {
  //     [key]: []
  //     count: [effect1, effect2]
  //   }
  // }
  function track(target, key) {
    if (!activeEffect) return
    let depsMap = targetMap.get(target);
    if (!depsMap) {
      targetMap.set(target, (depsMap = new Map()));
    }

    let deps = depsMap.get(key);
    if (!deps) {
      depsMap.set(key, (deps = new Set()));
    }
    deps.add(activeEffect);
  }

  function trigger(target, key) {
    const depsMap = targetMap.get(target);
    if (!depsMap) return
    const deps = depsMap.get(key);
    if (!deps) return
    deps.forEach(effectFn => {
      if (effectFn.scheduler) {
        // 目前是计算属性用到，计算属性依赖的响应式对象变化之后触发更新
        effectFn.scheduler(effectFn);
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
  function reactive(target) {
    if (!isObject(target)) return target
    if (isReactive(target)) return target
    if (proxyMap.has(target)) return proxyMap.get(target)
    const proxy = new Proxy(target, {
      get(target, key, receiver) {
        if (key === '__isReactive') return true
        // https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Reflect
        const res = Reflect.get(target, key, receiver);
        // 依赖依赖
        track(target, key);
        return isObject(res) ? reactive(res) : res
      },
      set(target, key, value, receiver) {
        let oldLength = target.length;
        const oldValue = target[key];
        const res = Reflect.set(target, key, value, receiver);
        if (hasChanged(oldValue, value)) {
          // 触发更新
          trigger(target, key);
          // 针对数组长度暂时这样处理
          // TODO 根据 RefLect 判断
          if (isArray(target) && hasChanged(oldLength, value.length)) {
            trigger(target, 'length');
          }
        }
        return res
      },
    });
    proxyMap.set(target, proxy);
    return proxy
  }
  function isReactive(target) {
    return !!(target && target.__isReactive)
  }

  function ref(value) {
    if (isRef(value)) return value
    return new RefImpl(value)
  }

  class RefImpl {
    constructor(value) {
      this.__isRef = true;
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
    return !!value.__isRef
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

  function watch(source, cb, options) {
    let getter;
    if (typeof source === 'function') {
      getter = source;
    } else {
      // 递归读取
      getter = () => traverse(source);
    }
    let oldValue, newValue;

    const job = () => {
      // 数据变化时执行回调
      newValue = effectFn();
      cb(newValue, oldValue);
      oldValue = newValue;
    };
    const effectFn = effect(() => getter(), {
      lazy: true,
      scheduler: job,
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

  var index = MiniVue = {
    reactive,
    effect,
    ref,
    computed,
    jobQueue,
    flushJob,
    watch,
  };

  return index;

})();
