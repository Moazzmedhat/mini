import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@jetpack-arena/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    host: true, // Allow phone testing over LAN
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
