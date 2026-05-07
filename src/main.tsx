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
const CACHE_BUST_VERSION = '2026-05-07-v1';
const BUST_KEY = 'lovable_cache_bust_version';
try {
  if (typeof window !== 'undefined' && localStorage.getItem(BUST_KEY) !== CACHE_BUST_VERSION) {
    localStorage.setItem(BUST_KEY, CACHE_BUST_VERSION);
    (async () => {
      try {
        if ('caches' in window) {
          const names = await caches.keys();
          await Promise.all(names.map((n) => caches.delete(n)));
        }
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
        }
      } catch (e) {
        console.warn('Cache bust cleanup failed', e);
      } finally {
        window.location.reload();
      }
    })();
  }
} catch {}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// SW registration is handled by vite-plugin-pwa via usePwaUpdate hook.
