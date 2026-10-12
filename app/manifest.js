/**
 * app/manifest.js
 * ---------------------------------------------------------------------------
 * The web app manifest, generated per request so an Arabic visitor installs an
 * Arabic app: `name`, `short_name`, `description` and `dir` all follow the
 * locale cookie, and `theme_color` follows the theme cookie so the installed
 * window matches the interface instead of flashing the wrong colour.
 */

import { cookies } from 'next/headers';

import {
  DEFAULT_THEME,
  LOCALE_COOKIE,
  THEME_COOKIE,
  dirFor,
} from '@/lib/i18n/config.js';
import { getDictionary } from '@/lib/i18n/index.js';

export const dynamic = 'force-dynamic';

export default async function manifest() {
  const jar = await cookies();
  const locale = jar.get(LOCALE_COOKIE)?.value === 'ar' ? 'ar' : 'en';
  const theme = jar.get(THEME_COOKIE)?.value === 'light' ? 'light' : DEFAULT_THEME === 'light' ? 'light' : 'dark';
  const t = getDictionary(locale);

  return {
    name: t.meta.title,
    short_name: locale === 'ar' ? 'تحويل الصوت' : 'Speech Text',
    description: t.meta.description,
    lang: locale,
    dir: dirFor(locale),
    id: '/?source=pwa',
    start_url: '/studio?source=pwa',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'any',
    background_color: theme === 'light' ? '#f6f7fb' : '#070a13',
    theme_color: theme === 'light' ? '#f6f7fb' : '#070a13',
    categories: ['productivity', 'utilities'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: t.nav.studio, short_name: t.nav.studio, url: '/studio' },
      { name: t.nav.usage, short_name: t.nav.usage, url: '/usage' },
      { name: t.nav.engines, short_name: t.nav.engines, url: '/engines' },
    ],
  };
}
