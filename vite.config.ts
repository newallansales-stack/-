import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'pages' ? [viteSingleFile()] : [])],
  base: mode === 'pages' ? './' : '/',
  define: { 'import.meta.env.VITE_STANDALONE': JSON.stringify(mode === 'pages' ? 'true' : 'false') },
  build: { outDir: mode === 'pages' ? 'pages' : 'dist' },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:3001' },
    allowedHosts: true,
  },
}));
