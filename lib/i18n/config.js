/**
 * lib/i18n/config.js
 * ---------------------------------------------------------------------------
 * Locale and theme plumbing. Deliberately dependency-free: a cookie drives both
 * so the server can render the correct `lang`, `dir` and `data-theme` on the
 * very first byte — no flash of the wrong language or a dark screen on a light
 * device.
 */

/** Supported locales, in switcher order. */
export const LOCALES = ['en', 'ar'];

/** Locale used when nothing else can be determined. */
export const DEFAULT_LOCALE = 'en';

export const LOCALE_COOKIE = 'stt_locale';
export const THEME_COOKIE = 'stt_theme';

/** Right-to-left locales. */
const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur']);

/** Themes the user can choose from. `system` defers to the OS. */
export const THEMES = ['system', 'light', 'dark'];
export const DEFAULT_THEME = 'system';

export function isLocale(value) {
  return LOCALES.includes(value);
}

export function isTheme(value) {
  return THEMES.includes(value);
}

/** Coerce anything into a supported locale. */
export function normaliseLocale(value) {
  if (typeof value !== 'string') return DEFAULT_LOCALE;
  const base = value.trim().toLowerCase().split(/[-_]/)[0];
  return isLocale(base) ? base : DEFAULT_LOCALE;
}

export function normaliseTheme(value) {
  return isTheme(value) ? value : DEFAULT_THEME;
}

export function dirFor(locale) {
  return RTL_LOCALES.has(normaliseLocale(locale)) ? 'rtl' : 'ltr';
}

export function isRtl(locale) {
  return dirFor(locale) === 'rtl';
}

/**
 * Pick a locale from an `Accept-Language` header, e.g.
 * `ar-EG,ar;q=0.9,en;q=0.8` → `ar`.
 */
export function localeFromAcceptLanguage(header) {
  if (typeof header !== 'string' || !header.trim()) return DEFAULT_LOCALE;

  const ranked = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params
        .map((param) => param.trim())
        .find((param) => param.startsWith('q='));
      return { tag, quality: q ? Number.parseFloat(q.slice(2)) || 0 : 1 };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of ranked) {
    const base = tag.trim().toLowerCase().split(/[-_]/)[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

/**
 * Resolve the active locale for a request: an explicit cookie wins, then the
 * browser's own preference, then the default.
 */
export function resolveLocale({ cookie, acceptLanguage } = {}) {
  if (cookie && isLocale(cookie)) return cookie;
  if (cookie) return normaliseLocale(cookie);
  return localeFromAcceptLanguage(acceptLanguage);
}
