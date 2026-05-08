import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Auto-reload when a stale chunk fails to load (after a new deploy)
const handleChunkError = (event: Event | PromiseRejectionEvent) => {
  const message =
    'reason' in event
      ? String((event as PromiseRejectionEvent).reason?.message || '')
      : String((event as ErrorEvent).message || '');

  if (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed')
  ) {
    const key = 'lovable_chunk_reload_at';
    const last = Number(sessionStorage.getItem(key) || 0);
    if (Date.now() - last > 10000) {
      sessionStorage.setItem(key, String(Date.now()));
      window.location.reload();
    }
  }
};
window.addEventListener('error', handleChunkError);
window.addEventListener('unhandledrejection', handleChunkError);

// One-time cleanup for users stuck on old cached versions.
// Bump CACHE_BUST_VERSION to force ALL clients to clear caches + SWs once.
// One-time cleanup and aggressive Service Worker removal
// Bump CACHE_BUST_VERSION to force ALL clients to clear caches + SWs once.
const CACHE_BUST_VERSION = '2026-05-08-v2';
const BUST_KEY = 'lovable_cache_bust_version';

async function cleanupServiceWorkers() {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r => r.unregister()));
      console.log('All Service Workers unregistered');
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      console.log('All Caches cleared');
    }
  } catch (e) {
    console.warn('Cleanup failed', e);
  }
}

// Always try to unregister SWs on load to ensure PWA is truly disabled
cleanupServiceWorkers();

try {
  if (typeof window !== 'undefined' && localStorage.getItem(BUST_KEY) !== CACHE_BUST_VERSION) {
    localStorage.setItem(BUST_KEY, CACHE_BUST_VERSION);
    cleanupServiceWorkers().finally(() => {
      window.location.reload();
    });
  }
} catch {}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// SW registration is handled by vite-plugin-pwa via usePwaUpdate hook.
