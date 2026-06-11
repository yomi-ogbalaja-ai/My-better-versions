import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

const isSingleFile = process.env.BUILD_MODE === 'singlefile'

export default defineConfig({
  plugins: isSingleFile ? [react(), viteSingleFile()] : [react()],
  server: {
    port: 3100,
    strictPort: true,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.PORT || 8092}`,
        changeOrigin: true,
        onError(err, req, res) {
          res.writeHead(503, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({
            status: 'building',
            message: 'Backend is starting, please wait...',
          }))
        },
      }
    }
  },
  build: {
    outDir: isSingleFile ? 'dist-singlefile' : 'dist',
    emptyOutDir: true,
  }
})
