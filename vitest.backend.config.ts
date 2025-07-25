import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./server/__tests__/setup.ts'],
    testTimeout: 10000,
    include: ['server/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['server/**/*'],
      exclude: [
        'node_modules/',
        'server/__tests__/',
        'server/agents/__tests__/',
        'dist/',
        '**/*.test.ts',
        '**/*.config.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared')
    }
  }
});