import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// BASE_PATH lets the same build run at / (local, custom domain) or /mimic/ (GitHub Pages).
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Mimic',
        short_name: 'Mimic',
        description: 'Say it, and a character says it back.',
        theme_color: '#6c4bf4',
        background_color: '#fff8ef',
        display: 'standalone',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        // Model files are cached by transformers.js in Cache Storage, not precached here.
        globPatterns: ['**/*.{js,css,html,svg}'],
        maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,
        // The 21 MB ONNX runtime is cached on first use rather than precached on install.
        runtimeCaching: [{ urlPattern: /\.wasm$/, handler: 'CacheFirst', options: { cacheName: 'mimic-wasm' } }],
      },
    }),
  ],
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['@huggingface/transformers', 'kokoro-js'] },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
