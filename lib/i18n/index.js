/**
 * lib/i18n/index.js
 * ---------------------------------------------------------------------------
 * Dictionary loading plus the `t()` translator.
 *
 *   const t = createTranslator('ar');
 *   t('studio.run')                        → 'ابدأ التفريغ'
 *   t('studio.uploading', { percent: 40 }) → 'جارٍ الرفع 40%'
 *
 * Keys are dot paths into the nested dictionaries. A missing key returns the
 * key itself (loud in development, harmless in production) and the unit test
 * suite asserts that both dictionaries carry exactly the same keys.
 */

import ar from './dictionaries/ar.js';
import en from './dictionaries/en.js';
import { DEFAULT_LOCALE, normaliseLocale } from './config.js';

export const DICTIONARIES = { en, ar };

export function getDictionary(locale) {
  return DICTIONARIES[normaliseLocale(locale)] ?? DICTIONARIES[DEFAULT_LOCALE];
}

/** Flatten a nested dictionary into `{ 'a.b.c': value }` leaves. */
export function flattenKeys(value, prefix = '', out = {}) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    out[prefix] = value;
    return out;
  }
  for (const [key, child] of Object.entries(value)) {
    flattenKeys(child, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}

/**
 * Replace `{name}` placeholders. Unknown placeholders are left untouched rather
 * than turning into `undefined` on screen.
 */
export function interpolate(template, values) {
  if (typeof template !== 'string' || !values) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    Object.hasOwn(values, name) && values[name] !== undefined && values[name] !== null
      ? String(values[name])
      : match,
  );
}

/** Build a translator bound to one locale. */
export function createTranslator(locale) {
  const dictionary = getDictionary(locale);
  const flat = flattenKeys(dictionary);

  const t = (path, values) => {
    const found = flat[path];
    if (found === undefined) return path;
    if (Array.isArray(found)) return found;
    if (typeof found === 'string') return interpolate(found, values);
    return found;
  };

  /** Raw access for arrays and objects (FAQ lists, feature cards, …). */
  t.raw = (path) => flat[path];
  t.locale = normaliseLocale(locale);

  return t;
}
