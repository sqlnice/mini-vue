import serve from 'rollup-plugin-serve'
import livereload from 'rollup-plugin-livereload'
export default {
  input: 'src/index.js',
  output: {
    file: 'dist/mini-vue.js',
    format: 'iife', // 自执行函数（浏览器友好）
    name: 'MiniVue', // format 为 iife 时，name 起到挂载到 window 上的作用
    sourceMap: true,
  },
  plugins: [
    livereload(),
    serve({
      open: true,
      openPage: '/src/examples/index.html',
    }),
  ],
}
