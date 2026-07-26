import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'elkjs-runtime': path.resolve(__dirname, './node_modules/elkjs/lib/elk.bundled.js'),
    },
  },
  test: {
    environment: 'jsdom',
    passWithNoTests: true,
    setupFiles: ['./src/test-utils/setup.ts'],
  },
})
