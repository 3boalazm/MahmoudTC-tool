'use client';

/**
 * components/ServiceWorkerRegistrar.js
 * ---------------------------------------------------------------------------
 * Registers the service worker that makes the app installable and offline
 * capable. Only in production: in development Next.js serves everything from
 * memory and a caching worker would fight the hot reloader.
 */

import { useEffect } from 'react';

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return undefined;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return undefined;

    let cancelled = false;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        if (cancelled) return;

        // A new worker is waiting: activate it on the next navigation so the
        // user never has to hard-refresh.
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          installing?.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              installing.postMessage('SKIP_WAITING');
            }
          });
        });
      } catch {
        /* Registration failures are non-fatal — the app works without it. */
      }
    };

    // Register after the first paint so it never competes with rendering.
    const idle =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(register, { timeout: 3000 })
        : setTimeout(register, 1200);

    return () => {
      cancelled = true;
      if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idle);
      else clearTimeout(idle);
    };
  }, []);

  return null;
}
