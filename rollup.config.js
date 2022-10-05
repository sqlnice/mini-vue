import path from 'path'
import json from '@rollup/plugin-json'
import { nodeResolve } from '@rollup/plugin-node-resolve'

// 根据环境变量中的 target 属性来获取对应模块中的 package.json
const packagesDir = path.resolve(__dirname, 'packages')
const packageDir = path.resolve(packagesDir, process.env.TARGET)

// 解析包文件目录下的路径
const resolve = p => path.resolve(packageDir, p)

// 获取 package.json 文件
const pkg = require(resolve('package.json'))

const name = path.basename(packageDir)

// 打包类型映射表, 根据每个包提供的 formats 进行格式化需要打包的内容

const outputConfig = {
  'esm-bundler': {
    file: resolve(`dist/${name}.esm-bundler.js`),
    format: 'es'
  },
  cjs: {
    file: resolve(`dist/${name}.cjs.js`),
    format: 'cjs'
  },
  global: {
    file: resolve(`dist/${name}.global.js`),
    format: 'iife'
  }
}

const options = pkg.buildOptions // 需要在每个 package.json 中定义

function createConfig(format, output) {
  output.name = options.name
  output.sourcemap = true
  console.log('output:', output)
  return {
    input: resolve('src/index.js'),
    output,
    plugins: [json(), nodeResolve()]
  }
}

export default options.formats.map(format =>
  createConfig(format, outputConfig[format])
)
