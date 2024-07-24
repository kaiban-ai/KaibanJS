import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import { terser } from 'rollup-plugin-terser';
import sourcemaps from 'rollup-plugin-sourcemaps';

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.TEST_ENV === 'mocked-llm-apis';

function generateConfig(format) {
  
  const isESM = format === 'es';
  const external = isESM ? ['react', 'react-dom', 'uuid'] : ['uuid'];
  return {
    input: 'src/index.js',
    output: {
      file: `dist/bundle.${format === 'cjs' ? 'cjs' : format === 'es' ? 'esm' : 'umd'}.js`,
      format: format,
      inlineDynamicImports: true,
      sourcemap: true,
      name: format === 'umd' ? 'AgenticJS' : undefined
    },
    external: external,
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false,
        mainFields: ['browser', 'module', 'main']
      }),
      commonjs(),
      ...(isTest ? [replace({
        'shims.fetch': `(...args) => { return global.fetch(...args); };\n`,
        preventAssignment: true
      })] : []),
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**'
      }),
      ...(!isDevelopment ? [terser()] : []),
      sourcemaps(),
    ]
  };
}

export default [
  generateConfig('cjs'),
  generateConfig('es'),
  generateConfig('umd')
];
