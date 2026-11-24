/// <reference lib="webworker" />
/**
 * Service worker: offline caching plus cross-origin isolation.
 *
 * GitHub Pages can't send COOP/COEP headers, and without them the browser
 * disables SharedArrayBuffer, so the ONNX runtime runs on a single thread.
 * This worker adds the headers to every same-origin response, which turns on
 * multi-threaded WASM after the first reload (see main.tsx).
 */
import { matchPrecache, precache, cleanupOutdatedCaches } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> };

precache(self.__WB_MANIFEST);
cleanupOutdatedCaches();
self.addEventListener('install', () => void self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

const WASM_CACHE = 'mimic-wasm';

function isolate(res: Response): Response {
  if (res.status === 0 || res.type === 'opaque') return res;
  const headers = new Headers(res.headers);
  headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

async function cacheFirst(req: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) await cache.put(req, res.clone());
  return res;
}

async function handle(req: Request): Promise<Response> {
  const url = new URL(req.url);
  if (req.mode === 'navigate') {
    return (await matchPrecache('index.html')) ?? fetch(req);
  }
  if (url.pathname.endsWith('.wasm')) return cacheFirst(req, WASM_CACHE);
  return (await matchPrecache(req.url)) ?? fetch(req);
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Only same-origin GETs. Model downloads (huggingface.co) are CORS requests and
  // are cached by transformers.js itself.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith(
    handle(event.request)
      .then(isolate)
      .catch(() => fetch(event.request)),
  );
});
