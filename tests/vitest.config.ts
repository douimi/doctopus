import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['tests/unit/**/*.test.ts', 'tests/rls/**/*.test.ts'],
    setupFiles: [],
    testTimeout: 15_000,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '..') },
  },
});
