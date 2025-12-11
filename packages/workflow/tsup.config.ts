import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  // Bundle p-queue and zustand to ensure compatibility
  // in both standalone usage and when used within kaibanjs
  noExternal: ['p-queue', 'zustand'],
});
