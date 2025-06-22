import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          onnx: ['onnxruntime-web']
        }
      }
    },
    commonjsOptions: {
      include: /node_modules/
    }
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web', 'electron']
  },
  server: {
    fs: {
      allow: ['..']
    },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'cross-origin'
    }
  },
  define: {
    global: 'globalThis'
  },
  // Enable WebAssembly and worker support for ONNX
  worker: {
    format: 'es'
  }
});