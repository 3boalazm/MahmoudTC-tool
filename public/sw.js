/**
 * public/sw.js — service worker for the installed app.
 *
 * Deliberately conservative: it caches the interface so the app opens instantly
 * and works offline, and it never touches transcription requests.
 *
 *   navigations  → network first, cache fallback, /offline as the last resort
 *   static assets → cache first (they are content-hashed by Next.js)
 *   /api/*        → never cached, never replayed; a stale transcript would be
 *                   worse than an honest error
 */

const VERSION = 'v3';
const SHELL_CACHE = `stt-shell-${VERSION}`;
const ASSET_CACHE = `stt-assets-${VERSION}`;

const SHELL_URLS = [
  '/',
  '/studio',
  '/engines',
  '/usage',
  '/faq',
  '/offline',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Individually, so one 404 cannot abort the whole install.
      await Promise.all(
        SHELL_URLS.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => null)),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

const isStaticAsset = (url) =>
  url.pathname.startsWith('/_next/static/') ||
  url.pathname.startsWith('/icons/') ||
  /\.(?:css|js|png|jpg|jpeg|svg|webp|ico|woff2?)$/.test(url.pathname);

/** Network first, falling back to whatever we cached, then to /offline. */
async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(SHELL_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = (await caches.match(request)) || (await caches.match('/offline'));
    return (
      cached ||
      new Response('<!doctype html><meta charset="utf-8"><title>Offline</title><p>You are offline.', {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      })
    );
  }
}

/** Cache first for immutable build output. */
async function handleAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(ASSET_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Audio uploads, transcripts and provider calls must always hit the network.
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(handleAsset(request));
  }
});
