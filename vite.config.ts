import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import type { Plugin } from 'vite';

/**
 * Dev only: ONNX Runtime dynamically imports its .mjs from /ort/ (public dir).
 * Vite's dev server appends "?import" to that URL and then refuses to serve a
 * public file as a module, so strip the query and let the static server handle it.
 */
const serveOrtInDev = (): Plugin => ({
  name: 'mimic-serve-ort-in-dev',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url && /\/ort\/[^?]+\?import$/.test(req.url)) req.url = req.url.replace(/\?import$/, '');
      next();
    });
  },
});

// BASE_PATH lets the same build run at / (local, custom domain) or /mimic/ (GitHub Pages).
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    serveOrtInDev(),
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: {
        name: 'Mimic',
        short_name: 'Mimic',
        description: 'Say it, and a character says it back.',
        theme_color: '#6c4bf4',
        background_color: '#fff8ef',
        display: 'standalone',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      injectManifest: {
        // Model files are cached by transformers.js; the 21 MB .wasm runtime is cached on first use (src/sw.ts).
        globPatterns: ['**/*.{js,mjs,css,html,svg}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      devOptions: { enabled: true, type: 'module' },
    }),
  ],
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['@huggingface/transformers', 'onnxruntime-web'] },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
