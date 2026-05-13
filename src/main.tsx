console.log('[App] Starting main.tsx...');
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
const CACHE_BUST_VERSION = '2026-05-11-v1';
const BUST_KEY = 'lovable_app_version';

async function cleanupServiceWorkers(reload = false) {
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
    
    if (reload) {
      const url = new URL(window.location.href);
      url.searchParams.set('v_refresh', CACHE_BUST_VERSION);
      window.location.replace(url.toString());
    }
  } catch (e) {
    console.warn('Cleanup failed', e);
  }
}

// Background version checker
async function checkSystemVersion() {
  try {
    const response = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return;
    
    const data = await response.json();
    const currentVersion = localStorage.getItem(BUST_KEY);
    
    if (currentVersion && data.version && currentVersion !== data.version) {
      console.log(`[VersionCheck] New version found: ${data.version}. Updating...`);
      localStorage.setItem(BUST_KEY, data.version);
      await cleanupServiceWorkers(true);
    }
  } catch (err) {
    console.warn('[VersionCheck] Background check failed', err);
  }
}

// Check version on load and then every 5 minutes
const currentVersion = localStorage.getItem(BUST_KEY);
if (currentVersion !== CACHE_BUST_VERSION) {
  localStorage.setItem(BUST_KEY, CACHE_BUST_VERSION);
  cleanupServiceWorkers(currentVersion !== null);
}

// Set up periodic check
setInterval(checkSystemVersion, 1000 * 60 * 5);

// Ensure SWs are cleaned up if PWA is disabled
if ('serviceWorker' in navigator) {
  cleanupServiceWorkers(false);
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA and Service Worker registration removed to ensure fresh updates.
