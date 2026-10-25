import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // true only when VITE_DEMO=true: a literal, so the live build drops every demo tool instead of just hiding it
  define: { __DEMO__: JSON.stringify(loadEnv(mode, process.cwd(), 'VITE_').VITE_DEMO === 'true') },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // Update this to your local Flask backend URL
        changeOrigin: true,
      },
    },
  },
}));
