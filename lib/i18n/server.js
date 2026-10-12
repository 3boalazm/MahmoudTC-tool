/**
 * lib/i18n/server.js
 * ---------------------------------------------------------------------------
 * Server-side counterpart to the client provider: resolves the request locale
 * from the cookie (falling back to the browser's Accept-Language header) and
 * hands back a ready translator. Used by pages for both metadata and markup, so
 * the title, the copy and `<html lang>` can never disagree.
 */

import { cookies, headers } from 'next/headers';

import { LOCALE_COOKIE, dirFor, resolveLocale } from './config.js';
import { createTranslator } from './index.js';

export async function getServerI18n() {
  const [jar, headerList] = await Promise.all([cookies(), headers()]);
  const locale = resolveLocale({
    cookie: jar.get(LOCALE_COOKIE)?.value,
    acceptLanguage: headerList.get('accept-language'),
  });

  return { locale, dir: dirFor(locale), t: createTranslator(locale) };
}
