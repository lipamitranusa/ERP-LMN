import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '~': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: '0.0.0.0', // agar bisa diakses dari komputer lain di jaringan lokal
    proxy: {
      '/api': {
        // Backend dan frontend di server yang sama
        // Browser dari komputer lain akan hit server via 192.168.40.221:5173
        // Proxy harus forward ke 192.168.40.221:8000 (bukan localhost)
        target: 'http://192.168.40.221:8000',
        changeOrigin: true,
      },
    },
  },
});
