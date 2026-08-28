import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 相对资源路径：配合 HashRouter，同一份构建产物挂在任何子路径下都能跑
  // （/study、/apps/study 或域名根目录都不用重新构建）。
  base: './',
  server: {
    port: 3003,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
