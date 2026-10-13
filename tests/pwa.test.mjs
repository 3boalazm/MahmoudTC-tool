/**
 * tests/pwa.test.mjs
 * ---------------------------------------------------------------------------
 * The install story is easy to break silently: a manifest that stops being
 * found, an icon that is missing or the wrong size, a service worker that
 * starts caching transcripts. These checks run without a browser.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (relative) => readFileSync(path.join(root, relative), 'utf8');

/* ---------------------------------------------------------------- manifest */

const manifestSource = read('app/manifest.js');

test('the manifest advertises everything an install needs', () => {
  for (const field of [
    'name',
    'short_name',
    'description',
    'icons',
    'start_url',
    'display',
    'background_color',
    'theme_color',
    'lang',
    'dir',
  ]) {
    assert.match(manifestSource, new RegExp(`\\b${field}:`), `manifest.${field} is missing`);
  }

  assert.match(manifestSource, /'standalone'/, 'must install as a standalone window');
  assert.match(manifestSource, /start_url: '\/studio/, 'the app should open on the studio');
  assert.match(manifestSource, /shortcuts:/, 'long-press shortcuts are part of the install UX');
});

test('the manifest is localised from the same cookies as the pages', () => {
  assert.match(manifestSource, /LOCALE_COOKIE|stt_locale/);
  assert.match(manifestSource, /THEME_COOKIE|stt_theme/);
  assert.match(manifestSource, /dirFor\(/, 'dir must follow the locale');
  assert.match(manifestSource, /#f6f7fb/, 'light theme colour');
  assert.match(manifestSource, /#090b0f/, 'dark theme colour');
});

test('every declared icon exists, is a real PNG, and matches its declared size', () => {
  const icons = [...manifestSource.matchAll(/src:\s*'([^']+)',\s*sizes:\s*'(\d+)x(\d+)'/g)];
  assert.ok(icons.length >= 3, 'expected at least three icons');

  const purposes = new Set();
  for (const [, src, width, height] of icons) {
    const file = path.join(root, 'public', src.replace(/^\//, ''));
    assert.ok(existsSync(file), `${src} is referenced but missing`);

    const bytes = readFileSync(file);
    // PNG signature, then IHDR: width and height are big-endian uint32s.
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${src} is not a PNG`);
    assert.equal(bytes.readUInt32BE(16), Number(width), `${src} is ${bytes.readUInt32BE(16)}px wide`);
    assert.equal(bytes.readUInt32BE(20), Number(height), `${src} has the wrong height`);
    assert.ok(statSync(file).size > 1024, `${src} looks empty`);

    for (const purpose of src.includes('maskable') ? ['maskable'] : ['any']) purposes.add(purpose);
  }

  assert.ok(purposes.has('maskable'), 'Android needs a maskable icon to avoid a white blob');
  assert.ok(
    icons.some(([, src]) => src.includes('192')) && icons.some(([, src]) => src.includes('512')),
    'both 192px and 512px sizes are required',
  );
});

/* --------------------------------------------------------- service worker */

const sw = read('public/sw.js');

test('the service worker is versioned and cleans up old caches', () => {
  assert.match(sw, /const VERSION = '[^']+'/, 'the cache version must be bumped deliberately');
  assert.match(sw, /stt-shell-\$\{VERSION\}/);
  assert.match(sw, /stt-assets-\$\{VERSION\}/);
  assert.match(sw, /keys\.filter\([\s\S]*?caches\.delete/, 'stale caches must be dropped');
});

test('the service worker precaches the shell, including /offline', () => {
  const list = sw.slice(sw.indexOf('const SHELL_URLS'), sw.indexOf('\n];', sw.indexOf('const SHELL_URLS')));
  assert.match(list, /'\/'/, 'the landing page is part of the shell');
  assert.match(list, /'\/studio'/, 'the studio is the main app entry');
  assert.match(list, /'\/offline'/, 'the offline fallback must be precached or it cannot work');
  assert.ok(existsSync(path.join(root, 'app/offline/page.js')), 'the /offline route must exist');

  // Every precached path must be a route (or static file) that ships.
  for (const [, route] of list.matchAll(/'(\/[^']*)'/g)) {
    // Static files are checked by the manifest test above.
    if (route.includes('.')) continue;
    const target = route === '/' ? 'app/page.js' : `app/${route.slice(1)}/page.js`;
    assert.ok(existsSync(path.join(root, target)), `${route} is precached but ${target} does not exist`);
  }
});

test('transcription requests are never served from the cache', () => {
  assert.match(sw, /url\.pathname\.startsWith\('\/api\/'\)\)\s*return/, '/api/* must bypass the worker');
  assert.match(sw, /request\.method !== 'GET'\)\s*return/, 'only GET is cacheable');
  assert.ok(!/cache\.put\([^)]*\/api/.test(sw), 'nothing may write API responses into a cache');
});

test('navigations are network-first with /offline as the last resort', () => {
  assert.match(sw, /mode === 'navigate'|request\.mode === 'navigate'/);
  assert.match(sw, /caches\.match\('\/offline'\)/, 'a failed navigation must land on the offline page');
  assert.match(sw, /self\.addEventListener\('fetch'/);
  assert.match(sw, /self\.skipWaiting\(\)/, 'a new worker should take over immediately');
});

test('the worker is only registered in production', () => {
  const registrar = read('components/ServiceWorkerRegistrar.js');
  assert.match(registrar, /NODE_ENV !== 'production'|production/);
  assert.match(registrar, /'\/sw\.js'/);
  assert.match(registrar, /serviceWorker/);
});
