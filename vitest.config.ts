import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'dist', 'demos'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@config': resolve(__dirname, './src/config'),
      '@kaspa': resolve(__dirname, './src/kaspa'),
      '@server': resolve(__dirname, './src/server'),
      '@widget': resolve(__dirname, './src/widget'),
      '@shared': resolve(__dirname, './src/shared'),
    },
  },
});
