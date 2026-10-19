import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    commonjsOptions: {
      include: [/node_modules/, /packages\/api-contracts\/dist/]
    }
  },
  optimizeDeps: {
    include: ['@accident-alarm/api-contracts']
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      },
      '/health': {
        target: 'http://localhost:4000',
        changeOrigin: true
      },
      '/auth': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  }
});
