import { isNumber, isObject, isString } from '@mini-vue/shared'
export function renderList(source, renderItem) {
  const vnodes = []
  if (isNumber(source)) {
    for (let i = 0; i < source.length; i++) {
      vnodes.push(renderItem(i + 1, i))
    }
  } else if (isString(source)) {
    for (let i = 0; i < source.length; i++) {
      vnodes.push(renderItem(source[i], i))
    }
  } else if (isObject(source)) {
    const keys = Object.keys(source)
    keys.forEach((key, index) => {
      vnodes.push(renderItem(source[key], key, index))
    })
  }
  return vnodes
}
