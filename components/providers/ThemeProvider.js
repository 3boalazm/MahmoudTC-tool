'use client';

/**
 * components/providers/ThemeProvider.js
 * ---------------------------------------------------------------------------
 * Light / dark / system, stored in a cookie so the server renders the right
 * `data-theme` on the first byte.
 *
 * `THEME_SCRIPT` runs in <head> before the body paints, resolving `system` to
 * the user's actual preference and writing it to <html>. That is what keeps the
 * page from flashing dark on a light device (and vice versa).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';

import { THEME_COOKIE, normaliseTheme } from '@/lib/i18n/config.js';

/** Runs before paint — must stay tiny and dependency-free. */
export const THEME_SCRIPT = `(function(){try{
var d=document.documentElement;
var stored=null;
try{stored=localStorage.getItem('${THEME_COOKIE}');}catch(e){}
var pref=(stored==='light'||stored==='dark'||stored==='system')?stored:(d.getAttribute('data-theme-preference')||'system');
var dark=window.matchMedia('(prefers-color-scheme: dark)').matches;
var resolved=pref==='system'?(dark?'dark':'light'):pref;
d.setAttribute('data-theme',resolved);
d.setAttribute('data-theme-preference',pref);
d.style.colorScheme=resolved;
}catch(e){}})();`;

const ThemeContext = createContext(null);

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * The OS preference as an external store, so the component subscribes to it
 * instead of polling it in an effect.
 */
function subscribeToSystemTheme(onChange) {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

const systemPrefersDark = () =>
  typeof window === 'undefined' ? true : window.matchMedia(DARK_QUERY).matches;

/** Writing to <html> is the side effect; React state stays untouched. */
function applyThemeDom(resolved, preference) {
  const root = document.documentElement;
  root.setAttribute('data-theme', resolved);
  root.setAttribute('data-theme-preference', preference);
  root.style.colorScheme = resolved;
}

export default function ThemeProvider({ theme, children }) {
  const [preference, setPreference] = useState(() => normaliseTheme(theme));
  const systemDark = useSyncExternalStore(subscribeToSystemTheme, systemPrefersDark, () => true);

  /** `system` resolves live from the OS; anything else is literal. */
  const resolved = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  /* Mirror the resolved theme onto <html> — an external system, not state. */
  useEffect(() => {
    applyThemeDom(resolved, preference);
  }, [resolved, preference]);

  const setTheme = useCallback((next) => {
    const target = normaliseTheme(next);
    setPreference(target);
    document.cookie = `${THEME_COOKIE}=${target}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    try {
      localStorage.setItem(THEME_COOKIE, target);
    } catch {
      /* private mode — the cookie is enough */
    }
  }, []);

  const value = useMemo(
    () => ({ theme: preference, resolvedTheme: resolved, setTheme }),
    [preference, resolved, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>');
  return context;
}
