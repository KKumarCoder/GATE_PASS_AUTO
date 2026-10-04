import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig(({ mode }) => {
  const projectRoot = fileURLToPath(new URL('..', import.meta.url));
  const config = loadEnv(mode, projectRoot, 'PORT');
  const apiPort = process.env.PORT || config.PORT || '4000';
  return {
    envDir: projectRoot,
    plugins: [react(), tailwindcss()],
    build: { rollupOptions: { output: { manualChunks: { charts: ['recharts'], scanner: ['html5-qrcode'] } } } },
    server: { proxy: { '/api': `http://127.0.0.1:${apiPort}` } },
  };
});
