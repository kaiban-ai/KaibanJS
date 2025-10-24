import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['kaibanjs', '@opentelemetry/api', '@opentelemetry/sdk-node'],
  treeshake: true,
  minify: false,
  splitting: false,
  outDir: 'dist',
});
