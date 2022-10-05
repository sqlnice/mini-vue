// 用来打包单个模块

const fs = require('fs')
const execa = require('execa')
const minimist = require('minimist') // 命令工具

// 获取执行命令时的参数
// 前两个是执行的命令 node scripts/dev.js
const args = minimist(process.argv.slice(2))
// 获取要打包的 package
const target = args['m'] || 'reactivity'

console.log('当前打包模块: ', target)

if (fs.statSync(`packages/${target}`).isDirectory()) {
  build(target)
}

async function build(target) {
  // -c 采用配置文件
  // w 开启监听
  // --environment 采用环境变量形式设置 TARGET, 可根据 process.env.TARGET 获取
  await execa('rollup', ['-cw', '--environment', `TARGET:${target}`], {
    stdio: 'inherit'
  })
}
