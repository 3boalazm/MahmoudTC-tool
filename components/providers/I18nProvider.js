'use client';

/**
 * components/providers/I18nProvider.js
 * ---------------------------------------------------------------------------
 * Gives every client component the same translator the server used, plus a way
 * to switch locale.
 *
 * The locale lives in a cookie so the server can render `<html lang dir>`
 * correctly on the first byte; switching writes the cookie and refreshes the
 * route, which re-renders the whole tree (server components included) in the new
 * language — no half-translated screens.
 */

import { createContext, useCallback, useContext, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { LOCALE_COOKIE, dirFor, normaliseLocale } from '@/lib/i18n/config.js';
import { createTranslator } from '@/lib/i18n/index.js';

const I18nContext = createContext(null);

/** One year, so the choice survives a browser restart. */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export default function I18nProvider({ locale, children }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const active = normaliseLocale(locale);

  const translator = useMemo(() => createTranslator(active), [active]);

  const setLocale = useCallback(
    (next) => {
      const target = normaliseLocale(next);
      if (target === active) return;

      document.cookie = `${LOCALE_COOKIE}=${target}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
      // Mirror into <html> immediately so direction flips without a round trip.
      document.documentElement.lang = target;
      document.documentElement.dir = dirFor(target);

      startTransition(() => router.refresh());
    },
    [active, router],
  );

  const value = useMemo(
    () => ({
      locale: active,
      dir: dirFor(active),
      isRtl: dirFor(active) === 'rtl',
      t: translator,
      setLocale,
      isSwitching: isPending,
    }),
    [active, translator, setLocale, isPending],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Access the translator. Throws early if a component is outside the provider. */
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used inside <I18nProvider>');
  }
  return context;
}
