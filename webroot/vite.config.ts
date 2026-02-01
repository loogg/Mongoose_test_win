import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [preact(), tailwindcss()],
  server: {
    host: true,  // 监听所有网卡，允许外部访问
    proxy: {
      '/api': 'http://localhost:80',
      '/ws': {
        target: 'ws://localhost:80',
        ws: true
      }
    }
  }
})
