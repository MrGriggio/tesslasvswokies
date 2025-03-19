import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: 'src/client',
  publicDir: '../../public',
  build: {
    target: 'es2018',
    outDir: '../../dist/client',
    emptyOutDir: true
  },
  define: {
    // This adds a global crypto polyfill for builds on older Node versions
    global: 'globalThis',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Handle crypto for older Node versions
      crypto: 'crypto-browserify',
    }
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/socket.io': {
        target: 'ws://localhost:3000',
        ws: true,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path
      }
    }
  }
}); 