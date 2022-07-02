import serve from 'rollup-plugin-serve'
import livereload from 'rollup-plugin-livereload'
export default {
  input: 'src/index.js',
  output: {
    file: 'dist/mini-vue.js',
    format: 'cjs',
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
