import { defineConfig } from 'rollup';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import json from '@rollup/plugin-json';
import nodePolyfills from 'rollup-plugin-node-polyfills'; // Correct plugin name
import replace from '@rollup/plugin-replace';

// Array of tool folder names
const toolFolders = [
  'firecrawl',
  'tavily',
  'serper',
  'exa',
  'wolfram-alpha',
  'github-issues',
  'simple-rag',
  'website-search',
  'pdf-search',
  'textfile-search',
]; // Add more folder names as needed

const toolConfigs = toolFolders.map((tool) => {
  const inputPath = `src/${tool}/index.js`; // Adjusted for plain JavaScript

  return defineConfig({
    input: inputPath,
    output: [
      {
        file: `dist/${tool}/index.cjs.js`,
        format: 'cjs',
        sourcemap: false,
        inlineDynamicImports: true,
      },
      {
        file: `dist/${tool}/index.esm.js`,
        format: 'esm',
        sourcemap: false,
        inlineDynamicImports: true,
      },
    ],
    external: ['pdf-parse'],
    plugins: [
      nodeResolve({
        browser: true,
        preferBuiltins: false, // Use polyfills for Node built-in modules
      }),
      commonjs(),
      json(),
      nodePolyfills(), // Correctly named polyfill plugin for Node.js
      terser(),
      replace({
        preventAssignment: true,
        values: {
          'Promise.withResolvers':
            '(() => ({ promise: new Promise(() => {}), resolve: () => {}, reject: () => {} }))',
        },
      }),
    ],
  });
});

// Main index config
const mainConfig = defineConfig({
  input: 'src/index.js',
  output: [
    {
      file: 'dist/index.cjs.js',
      format: 'cjs',
      sourcemap: false,
      inlineDynamicImports: true,
    },
    {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: false,
      inlineDynamicImports: true,
    },
  ],
  external: ['pdf-parse'],
  plugins: [
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    commonjs(),
    json(),
    nodePolyfills(),
    terser(),
    replace({
      preventAssignment: true,
      values: {
        'Promise.withResolvers':
          '(() => ({ promise: new Promise(() => {}), resolve: () => {}, reject: () => {} }))',
      },
    }),
  ],
});
const ragToolkitConfig = defineConfig({
  input: 'src/_utils/rag/ragToolkit.js',
  output: [
    {
      file: 'dist/rag-toolkit/index.cjs.js',
      format: 'cjs',
      sourcemap: false,
      inlineDynamicImports: true,
    },
    {
      file: 'dist/rag-toolkit/index.esm.js',
      format: 'esm',
      sourcemap: false,
      inlineDynamicImports: true,
    },
  ],
  plugins: [
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    commonjs(),
    json(),
    nodePolyfills(),
    terser(),
  ],
});
export default [ragToolkitConfig, ...toolConfigs, mainConfig];
