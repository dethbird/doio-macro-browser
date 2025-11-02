import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

// Build into ../public/app with a manifest so PHP can include assets via Twig
const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: resolve(__dirname, '../public/app'),
    emptyOutDir: true,
    manifest: true,
    sourcemap: false,
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    // You can uncomment and adjust this proxy for local dev against PHP dev server
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:8080',
    //     changeOrigin: true,
    //   }
    // }
  }
})
