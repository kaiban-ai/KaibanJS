import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import { dts } from 'rollup-plugin-dts';
import typescript from '@rollup/plugin-typescript';

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.TEST_ENV === 'mocked-llm-apis';

function generateConfig(format) {
  const isDTS = format === 'dts';
  const isESM = format === 'es';
  const isCJS = format === 'cjs';
  const ext = isESM ? 'mjs' : isCJS ? 'cjs' : 'js';
  const external = isESM
    ? [
        'react',
        'react-dom',
        'uuid',
        'pino',
        'pino-pretty',
        'p-queue',
        'p-timeout',
      ]
    : ['uuid', 'pino', 'pino-pretty'];

  if (isDTS) {
    return {
      input: 'dist/types/index.d.ts',
      output: [
        {
          file: 'dist/bundle.d.ts',
          format: 'es',
        },
      ],
      plugins: [dts()],
    };
  }

  return {
    input: 'src/index.ts',
    output: {
      file: `dist/bundle.${ext}`,
      format: format,
      inlineDynamicImports: true,
      sourcemap: isDevelopment,
      name: format === 'umd' ? 'KaibanJS' : undefined,
    },
    external,
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        sourceMap: isDevelopment,
        declaration: true,
        declarationDir: 'dist/types',
        exclude: ['**/__tests__/**', '**/types/**'],
      }),
      resolve({
        browser: true,
        preferBuiltins: false,
        mainFields: ['browser', 'module', 'main'],
      }),
      commonjs(),
      // nodePolyfills(), // Correctly named polyfill plugin for Node.js
      ...(isTest
        ? [
            replace({
              'shims.fetch': `(...args) => { return global.fetch(...args); };\n`,
              preventAssignment: true,
            }),
          ]
        : []),
      ...(!isDevelopment ? [terser()] : []),
    ],
    onwarn(warning, warn) {
      if (warning.code === 'THIS_IS_UNDEFINED') return;
      warn(warning);
    },
  };
}

const configurations = [
  generateConfig('cjs'), // Node.js CommonJS
];

if (!isTest) {
  configurations.push(generateConfig('umd'));
  configurations.push(generateConfig('dts'));
  configurations.push(generateConfig('es'));
}

export default configurations;
