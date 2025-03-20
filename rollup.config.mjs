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
    ? ['react', 'react-dom', 'uuid', 'pino', 'pino-pretty']
    : ['uuid', 'pino', 'pino-pretty'];

  if (isDTS) {
    return {
      // Generate .d.ts declaration files
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
    external: external,
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false,
        mainFields: ['browser', 'module', 'main'],
        extensions: ['.ts', '.tsx'],
      }),
      typescript({
        tsconfig: './tsconfig.json',
        sourceMap: isDevelopment,
        declaration: true,
        declarationDir: 'dist/types',
        exclude: ['**/__tests__/**', '**/types/**'],
      }),
      commonjs(),
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
  };
}

export default [
  generateConfig('cjs'),
  generateConfig('es'),
  generateConfig('umd'),
  generateConfig('dts'),
];
