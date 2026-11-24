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
  optimizeDeps: { exclude: ['@huggingface/transformers', 'kokoro-js'] },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
