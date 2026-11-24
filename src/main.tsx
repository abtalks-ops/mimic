import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app/App';
import './ui/styles.css';

/**
 * The service worker adds the headers that enable multi-threading (see src/sw.ts),
 * but they only apply to pages it controls. On the very first visit, reload once
 * after it takes control.
 */
const RELOAD_KEY = 'mimic-coi-reload';
function reloadOnceForIsolation() {
  if (self.crossOriginIsolated) return;
  try {
    if (sessionStorage.getItem(RELOAD_KEY)) return;
    sessionStorage.setItem(RELOAD_KEY, '1');
  } catch {
    return;
  }
  location.reload();
}

if ('serviceWorker' in navigator) {
  registerSW({ immediate: true });
  if (navigator.serviceWorker.controller) reloadOnceForIsolation();
  else navigator.serviceWorker.addEventListener('controllerchange', reloadOnceForIsolation, { once: true });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
