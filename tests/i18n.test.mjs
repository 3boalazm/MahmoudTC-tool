/**
 * tests/i18n.test.mjs
 * ---------------------------------------------------------------------------
 * Guards the localisation layer:
 *
 *   1. `en` and `ar` carry exactly the same keys — a missing translation can
 *      never ship as a blank label or a raw key.
 *   2. Every `t('some.key')` used in the app resolves in **both** languages.
 *   3. Locale/theme plumbing (Accept-Language ranking, RTL direction, cookie
 *      coercion) behaves as documented.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_LOCALE,
  DEFAULT_THEME,
  LOCALES,
  dirFor,
  isLocale,
  isRtl,
  isTheme,
  localeFromAcceptLanguage,
  normaliseLocale,
  normaliseTheme,
  resolveLocale,
} from '../lib/i18n/config.js';
import { DICTIONARIES, createTranslator, flattenKeys, interpolate } from '../lib/i18n/index.js';

import ar from '../lib/i18n/dictionaries/ar.js';
import en from '../lib/i18n/dictionaries/en.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const flatEn = flattenKeys(en);
const flatAr = flattenKeys(ar);

/* ------------------------------------------------------------------ parity */

test('English and Arabic dictionaries expose identical keys', () => {
  const enKeys = Object.keys(flatEn).sort();
  const arKeys = Object.keys(flatAr).sort();

  const missingInArabic = enKeys.filter((key) => !(key in flatAr));
  const missingInEnglish = arKeys.filter((key) => !(key in flatEn));

  assert.deepEqual(missingInArabic, [], `keys missing from ar: ${missingInArabic.join(', ')}`);
  assert.deepEqual(missingInEnglish, [], `keys missing from en: ${missingInEnglish.join(', ')}`);
  assert.ok(enKeys.length > 250, `expected a full dictionary, found ${enKeys.length} keys`);
});

test('every string leaf is non-empty in both languages', () => {
  for (const [key, value] of Object.entries(flatEn)) {
    if (typeof value !== 'string') continue;
    assert.ok(value.trim().length > 0, `en.${key} is empty`);
    const arabic = flatAr[key];
    assert.ok(
      typeof arabic === 'string' && arabic.trim().length > 0,
      `ar.${key} is empty or not a string`,
    );
  }
});

test('array sections keep the same length in both languages', () => {
  for (const key of ['home.highlights', 'home.steps', 'home.explore', 'faq.items', 'faq.trouble']) {
    const a = flatEn[key];
    const b = flatAr[key];
    assert.ok(Array.isArray(a), `en.${key} should be an array`);
    assert.ok(Array.isArray(b), `ar.${key} should be an array`);
    assert.equal(a.length, b.length, `${key} has ${a.length} items in en but ${b.length} in ar`);
  }
});

/* ------------------------------------------- keys actually used by the app */

/** Every file that can call `t('…')`. */
function sourceFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      sourceFiles(full, out);
    } else if (/\.(?:js|mjs)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

test('every t() key used in the codebase exists in both dictionaries', () => {
  const files = [
    ...sourceFiles(path.join(root, 'app')),
    ...sourceFiles(path.join(root, 'components')),
    ...sourceFiles(path.join(root, 'hooks')),
    ...sourceFiles(path.join(root, 'lib')),
  ];

  const used = new Set();
  // Matches t('a.b') and t(`a.b`) but ignores template-interpolated keys.
  const literal = /\bt\(\s*['"]([\w.]+)['"]/g;
  const quoted = /\bt\(\s*`([\w.]+)`/g;

  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    for (const pattern of [literal, quoted]) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(source))) used.add(match[1]);
    }
  }

  assert.ok(used.size > 60, `expected many translated keys, found ${used.size}`);

  const unknown = [...used].filter((key) => !(key in flatEn) || !(key in flatAr));
  assert.deepEqual(unknown, [], `unknown translation keys: ${unknown.join(', ')}`);

  // Dynamic keys (engine error codes, recorder codes) are checked separately.
  for (const code of [
    'MISSING_KEY',
    'AUTH',
    'PAYMENT_REQUIRED',
    'RATE_LIMITED',
    'QUOTA_EXCEEDED',
    'TIMEOUT',
    'SERVER_ERROR',
    'BAD_REQUEST',
    'EMPTY_TRANSCRIPT',
    'NETWORK',
    'PROVIDER_ERROR',
  ]) {
    assert.ok(`errors.code.${code}` in flatEn, `missing errors.code.${code} (en)`);
    assert.ok(`errors.code.${code}` in flatAr, `missing errors.code.${code} (ar)`);
  }

  for (const code of [
    'UNSUPPORTED',
    'PERMISSION_DENIED',
    'NO_MICROPHONE',
    'MIC_IN_USE',
    'OVERCONSTRAINED',
    'INSECURE',
    'INTERRUPTED',
    'START_FAILED',
    'INIT_FAILED',
    'RECORDER_ERROR',
    'EMPTY_RECORDING',
  ]) {
    assert.ok(`source.rec.${code}` in flatEn, `missing source.rec.${code} (en)`);
    assert.ok(`source.rec.${code}` in flatAr, `missing source.rec.${code} (ar)`);
  }
});

test('interpolation placeholders match between languages', () => {
  const placeholders = (value) => [...String(value).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

  const mismatched = [];
  for (const [key, value] of Object.entries(flatEn)) {
    if (typeof value !== 'string') continue;
    const other = flatAr[key];
    if (typeof other !== 'string') continue;
    const a = placeholders(value);
    const b = placeholders(other);
    if (a.join(',') !== b.join(',')) mismatched.push(`${key}: en{${a}} vs ar{${b}}`);
  }

  assert.deepEqual(mismatched, [], `placeholder drift:\n${mismatched.join('\n')}`);
});

/* --------------------------------------------------------------- translator */

test('the translator resolves dot paths and interpolates', () => {
  const t = createTranslator('ar');

  assert.equal(t('nav.studio'), 'المفرّغ');
  assert.equal(t('common.enginesCount', { count: 4 }), '4 محرّكات');
  assert.equal(t('usage.hours', { count: '1.5' }), '1.5 ساعة');

  // Unknown keys are returned verbatim so they are obvious in development.
  assert.equal(t('nope.not.here'), 'nope.not.here');

  // Unknown placeholders survive instead of printing `undefined`.
  assert.equal(interpolate('hello {name}', { other: 1 }), 'hello {name}');
  assert.equal(interpolate('hello {name}', { name: 'world' }), 'hello world');

  // Arrays come back raw for list rendering.
  assert.equal(t('home.steps').length, 3);
  assert.equal(t('faq.items').length, 8);
});

test('an unsupported locale falls back to the default dictionary', () => {
  const t = createTranslator('fr');
  assert.equal(t.locale, DEFAULT_LOCALE);
  assert.equal(DICTIONARIES[DEFAULT_LOCALE], en);
  assert.deepEqual(DICTIONARIES, { en, ar });
});

/* ------------------------------------------------------------- locale rules */

test('locale helpers coerce and report direction', () => {
  assert.deepEqual(LOCALES, ['en', 'ar']);
  assert.equal(isLocale('ar'), true);
  assert.equal(isLocale('fr'), false);
  assert.equal(normaliseLocale('AR-eg'), 'ar');
  assert.equal(normaliseLocale('en-US'), 'en');
  assert.equal(normaliseLocale('klingon'), DEFAULT_LOCALE);
  assert.equal(normaliseLocale(undefined), DEFAULT_LOCALE);
  assert.equal(dirFor('ar'), 'rtl');
  assert.equal(dirFor('en'), 'ltr');
  assert.equal(isRtl('ar'), true);
  assert.equal(isRtl('en'), false);
});

test('Accept-Language picks the highest-ranked supported language', () => {
  assert.equal(localeFromAcceptLanguage('ar-EG,ar;q=0.9,en;q=0.8'), 'ar');
  assert.equal(localeFromAcceptLanguage('en-GB,en;q=0.9,ar;q=0.2'), 'en');
  assert.equal(localeFromAcceptLanguage('fr-CH,fr;q=0.9,ar;q=0.8'), 'ar');
  assert.equal(localeFromAcceptLanguage('de,es'), DEFAULT_LOCALE);
  assert.equal(localeFromAcceptLanguage(''), DEFAULT_LOCALE);
  assert.equal(localeFromAcceptLanguage(undefined), DEFAULT_LOCALE);
});

test('an explicit cookie beats the browser preference', () => {
  assert.equal(resolveLocale({ cookie: 'en', acceptLanguage: 'ar-EG,ar;q=0.9' }), 'en');
  assert.equal(resolveLocale({ cookie: 'ar', acceptLanguage: 'en-US,en;q=0.9' }), 'ar');
  assert.equal(resolveLocale({ acceptLanguage: 'ar' }), 'ar');
  assert.equal(resolveLocale({ cookie: 'ar-EG' }), 'ar');
  assert.equal(resolveLocale({}), DEFAULT_LOCALE);
});

test('theme helpers only accept real themes', () => {
  assert.equal(DEFAULT_THEME, 'system');
  assert.equal(isTheme('light'), true);
  assert.equal(isTheme('dark'), true);
  assert.equal(isTheme('system'), true);
  assert.equal(isTheme('solarized'), false);
  assert.equal(normaliseTheme('LIGHT'), DEFAULT_THEME, 'case matters, fall back safely');
  assert.equal(normaliseTheme('dark'), 'dark');
  assert.equal(normaliseTheme(undefined), DEFAULT_THEME);
});

test('the pre-paint theme script is self-contained and reads the cookie key', () => {
  const source = readFileSync(path.join(root, 'components/providers/ThemeProvider.js'), 'utf8');
  const match = source.match(/export const THEME_SCRIPT = `([\s\S]*?)`;/);
  assert.ok(match, 'THEME_SCRIPT must be defined');

  const script = match[1];
  // The cookie name is interpolated from THEME_COOKIE, so accept either form.
  assert.match(
    script,
    /stt_theme|\$\{THEME_COOKIE\}/,
    'must read the same cookie the server writes',
  );
  assert.match(script, /prefers-color-scheme: dark/);
  assert.match(script, /data-theme/, 'must set the attribute Tailwind reacts to');
  assert.ok(!script.includes('import '), 'must not depend on a bundler');
});
