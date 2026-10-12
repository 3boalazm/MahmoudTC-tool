/**
 * app/layout.js
 * ---------------------------------------------------------------------------
 * Root layout. Resolves two cookies on the server before anything renders:
 *
 *   stt_locale → <html lang dir> and every string in the tree
 *   stt_theme  → `data-theme` on <html>, so a light-mode visitor never sees a
 *                dark flash (the inline script below resolves "system" before
 *                the first paint)
 */

import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { cookies, headers } from 'next/headers';

import I18nProvider from '@/components/providers/I18nProvider.js';
import ThemeProvider, { THEME_SCRIPT } from '@/components/providers/ThemeProvider.js';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar.js';
import SiteFooter from '@/components/layout/SiteFooter.js';
import SiteHeader from '@/components/layout/SiteHeader.js';
import {
  LOCALE_COOKIE,
  THEME_COOKIE,
  dirFor,
  normaliseTheme,
  resolveLocale,
} from '@/lib/i18n/config.js';
import { getDictionary } from '@/lib/i18n/index.js';

import './globals.css';

export async function generateMetadata() {
  const jar = await cookies();
  const locale = resolveLocale({ cookie: jar.get(LOCALE_COOKIE)?.value });
  const t = getDictionary(locale);

  return {
    title: {
      default: t.meta.title,
      template: `%s · ${t.meta.title}`,
    },
    description: t.meta.description,
    applicationName: t.meta.title,
    keywords: t.meta.keywords,
    authors: [{ name: 'MahmoudTC' }],
    appleWebApp: {
      capable: true,
      title: t.meta.title,
      statusBarStyle: 'black-translucent',
    },
    formatDetection: { telephone: false },
    icons: {
      icon: [
        { url: '/icons/favicon-48.png', sizes: '48x48', type: 'image/png' },
        { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { url: '/icon.svg', type: 'image/svg+xml' },
      ],
      apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
    },
    openGraph: {
      title: t.meta.title,
      description: t.meta.description,
      type: 'website',
      siteName: t.meta.title,
      locale: locale === 'ar' ? 'ar_EG' : 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: t.meta.title,
      description: t.meta.description,
    },
    robots: { index: true, follow: true },
  };
}

export async function generateViewport() {
  const jar = await cookies();
  const theme = normaliseTheme(jar.get(THEME_COOKIE)?.value);
  const background = theme === 'light' ? '#f6f7fb' : '#070a13';

  return {
    themeColor: [
      { media: '(prefers-color-scheme: light)', color: '#f6f7fb' },
      { media: '(prefers-color-scheme: dark)', color: '#070a13' },
    ],
    colorScheme: 'light dark',
    width: 'device-width',
    initialScale: 1,
    // Lets the installed app paint under the status bar / notch on iOS.
    viewportFit: 'cover',
    backgroundColor: background,
  };
}

export default async function RootLayout({ children }) {
  const [jar, headerList] = await Promise.all([cookies(), headers()]);
  const locale = resolveLocale({
    cookie: jar.get(LOCALE_COOKIE)?.value,
    acceptLanguage: headerList.get('accept-language'),
  });
  const theme = normaliseTheme(jar.get(THEME_COOKIE)?.value);
  const t = getDictionary(locale);

  return (
    <html
      lang={locale}
      dir={dirFor(locale)}
      data-theme-preference={theme}
      /*
       * An explicit choice is baked into the HTML, so the first byte is already
       * correct (and light mode still works with JavaScript disabled). Only
       * `system` is left for the inline script to resolve.
       */
      data-theme={theme === 'system' ? undefined : theme}
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Resolves "system" to the real preference before the body paints. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      {/*
        * `suppressHydrationWarning` here is deliberate and scoped to <body>:
        * extensions such as Grammarly inject attributes (data-gr-ext-installed,
        * data-new-gr-c-s-check-loaded) before React hydrates, which is not a bug
        * in this app and not something the app can prevent.
        */}
      <body
        suppressHydrationWarning
        className="flex min-h-dvh flex-col bg-canvas font-sans text-ink-100 antialiased"
      >
        <I18nProvider locale={locale}>
          <ThemeProvider theme={theme}>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:z-50 focus:rounded-lg focus:bg-iris-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:start-4"
            >
              {t.nav.skip}
            </a>
            <SiteHeader />
            <div id="main" className="flex-1">
              {children}
            </div>
            <SiteFooter />
            <ServiceWorkerRegistrar />
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
