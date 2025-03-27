import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), nodePolyfills()],
  
  define: {
    "process.env": {}, // 🔥 Добавляем поддержку process.env
    global: 'window',
  },
  resolve: {
    alias: {
      stream: "stream-browserify",
      crypto: "crypto-browserify",
      buffer: "buffer/",
      util: "util/",
      process: "process/browser",
    },
  },
  json: {
    stringify: true
  }
})
