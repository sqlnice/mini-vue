export default {
  input: './packages/vue/src/index.js',
  output: [
    {
      format: 'cjs',
      file: './packages/vue/dist/mini-vue.cjs.js'
    },
    {
      name: 'vue',
      format: 'es',
      file: './packages/vue/dist/mini-vue.esm-bundler.js',
      sourcemap: true
    }
  ]
}
