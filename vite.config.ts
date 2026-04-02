/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy()
  ],
  server: {
    proxy: {
      // More specific path must come first
      '/proxy/v1': {
        target: 'https://api.fluxer.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy/, ''),
      },
      '/proxy': {
        target: 'https://web.fluxer.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy/, ''),
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  }
})
