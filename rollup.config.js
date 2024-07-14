import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import { terser } from 'rollup-plugin-terser';
import sourcemaps from 'rollup-plugin-sourcemaps';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';

// Determine if we are in development mode based on the NODE_ENV environment variable
const isDevelopment = process.env.NODE_ENV === 'development';

export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/bundle.cjs.js',
      format: 'cjs',
      inlineDynamicImports: true,
      sourcemap: true // Enable sourcemap generation for CommonJS
    },
    {
      file: 'dist/bundle.esm.js',
      format: 'es',
      inlineDynamicImports: true,
      sourcemap: true // Enable sourcemap generation for ES Module
    },
    {
      file: 'dist/bundle.umd.js',
      format: 'umd',
      inlineDynamicImports: true,
      name: 'AgenticJS',
      sourcemap: true // Enable sourcemap generation for UMD
    }
  ],
  plugins: [
    peerDepsExternal(),
    resolve({
      browser: true,  // Set to false to prioritize Node.js modules
      preferBuiltins: false,  // Ensure Node.js built-ins are used
      mainFields: ['browser', 'module', 'main']
    }),
    // resolve({
    //   browser: true,
    //   preferBuiltins: false
    // }),
    commonjs(),
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**'
    }),
    // Only include terser (minification) if not in development mode
    ...(!isDevelopment ? [terser()] : []),
    sourcemaps(),  // Ensure sourcemaps from dependencies are handled
  ],
  external: ['react', 'react-dom', 'uuid'],
};
