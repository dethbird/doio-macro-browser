import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, '../public/assets'),
    emptyDirOnBuild: true,
    manifest: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/main.tsx'),
    },
  },
})
