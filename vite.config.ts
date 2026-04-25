import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: 'src',
  base: '/derailed/',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  test: {
    globals: false,
    environment: 'node',
  },
});
