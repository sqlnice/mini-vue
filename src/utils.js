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

export function isNumber(target) {
  return typeof target === 'number'
}

export function hasChanged(oldValue, newValue) {
  return (
    oldValue !== newValue && !(Number.isNaN(oldValue) && Number.isNaN(newValue))
  )
}

export const camelize = str => {
  return str.replace(/-(\w)/g, (_, c) => (c ? c.toUpperCase() : ''))
}

export function capitalize(str) {
  if (!str) return ''
  return str[0].toUpperCase() + str.slice(1)
}
