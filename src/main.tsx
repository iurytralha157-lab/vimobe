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

// Aggressive version management and cache busting
const CACHE_BUST_VERSION = '2026-05-08-v3';
const BUST_KEY = 'lovable_app_version';

async function cleanupServiceWorkers() {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length > 0) {
        await Promise.all(registrations.map(r => r.unregister()));
        console.log('All Service Workers unregistered');
      }
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      if (keys.length > 0) {
        await Promise.all(keys.map(k => caches.delete(k)));
        console.log('All Caches cleared');
      }
    }
  } catch (e) {
    console.warn('Cleanup failed', e);
  }
}

// Ensure SWs are cleaned up if PWA is disabled
if ('serviceWorker' in navigator) {
  cleanupServiceWorkers();
}

try {
  const currentVersion = localStorage.getItem(BUST_KEY);
  if (currentVersion && currentVersion !== CACHE_BUST_VERSION) {
    localStorage.setItem(BUST_KEY, CACHE_BUST_VERSION);
    cleanupServiceWorkers().finally(() => {
      // Add unique param to force bypass any proxy cache
      const url = new URL(window.location.href);
      url.searchParams.set('reload_v', CACHE_BUST_VERSION);
      window.location.replace(url.toString());
    });
  } else if (!currentVersion) {
    localStorage.setItem(BUST_KEY, CACHE_BUST_VERSION);
  }
} catch (err) {
  console.error('Version management error:', err);
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA and Service Worker registration removed to ensure fresh updates.
