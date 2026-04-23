import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  test: {
    globals: false,
    environment: 'node',
  },
});
