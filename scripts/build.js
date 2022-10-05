// 打包所有的包

const fs = require('fs')
const execa = require('execa')

const dirs = fs
  .readdirSync('packages')
  .filter(dir => fs.statSync(`packages/${dir}`).isDirectory())

async function build(target) {
  await execa('rollup', ['-c', '--environment', `TARGET:${target}`], {
    stdio: 'inherit'
  })
}

function runParallel(targets, iteratorFun) {
  const res = []
  for (const item of targets) {
    const p = iteratorFun(item)
    res.push(p)
  }
  Promise.all(res)
}

runParallel(dirs, build)
