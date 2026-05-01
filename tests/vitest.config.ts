import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/rls/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    testTimeout: 15_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '..'),
      'server-only': path.resolve(__dirname, 'shims/server-only.ts'),
    },
  },
});
