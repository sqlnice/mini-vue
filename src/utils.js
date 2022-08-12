export function isObject(target) {
  return typeof target === 'object' && target !== null
}

export function isArray(target) {
  return Array.isArray(target)
}

export function isString(target) {
  return typeof target === 'string'
}

export function isFunction(target) {
  return typeof target === 'function'
}
export function hasChanged(oldValue, newValue) {
  return (
    oldValue !== newValue && !(Number.isNaN(oldValue) && Number.isNaN(newValue))
  )
}

export const camelize = str => {
  return str.replace(/-(\w)/g, (_, c) => (c ? c.toUpperCase() : ''))
}
