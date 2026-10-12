import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@server': path.resolve(__dirname, './server'),
      '@shared': path.resolve(__dirname, './shared'),
      '@client': path.resolve(__dirname, './client/src'),
    },
  },
  test: {
    include: ['server/**/*.spec.ts', 'server/**/*.test.ts', 'client/src/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'tmp'],
    environment: 'node',
    globals: false,
    setupFiles: ['./server/__tests__/setup.ts'],
    environmentMatchGlobs: [
      ['client/src/**/*.test.ts', 'jsdom'],
    ],
  },
});
