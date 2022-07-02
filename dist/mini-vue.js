
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

  const effectStack = [];
  // ---------
  // |       |
  // | inner |
  // | out   |
  // |       |
  // ---------
  let activeEffect;
  function effect(fn) {
    try {
      activeEffect = fn;
      effectStack.push(activeEffect);
      return fn()
    } finally {
      effectStack.pop();
      activeEffect = effectStack[effectStack.length - 1];
    }
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
      effectFn();
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

  var index = MiniVue = {
    reactive,
    effect,
  };

  return index;

})();
