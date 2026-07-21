import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'elkjs-runtime': path.resolve(__dirname, './node_modules/elkjs/lib/elk.bundled.js'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://10.99.99.54:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
