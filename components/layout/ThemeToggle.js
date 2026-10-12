'use client';

/**
 * components/layout/ThemeToggle.js
 * ---------------------------------------------------------------------------
 * Cycles system → light → dark. The icons describe the *current* mode and the
 * accessible label describes what a tap will do, so it reads correctly either
 * way round.
 */

import { useTheme } from '@/components/providers/ThemeProvider.js';
import { useI18n } from '@/components/providers/I18nProvider.js';

/** Inline SVGs: sun, moon and a half-filled circle for "system". */
function ThemeIcon({ theme, className = 'size-4' }) {
  if (theme === 'light') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.5v2.2M12 19.3v2.2M4.2 12H2M22 12h-2.2M5.6 5.6 4 4M20 20l-1.6-1.6M18.4 5.6 20 4M4 20l1.6-1.6" />
      </svg>
    );
  }
  if (theme === 'dark') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className={className} aria-hidden="true">
        <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17A8.5 8.5 0 0 0 12 3.5Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function ThemeToggle({ className = '' }) {
  const { t } = useI18n();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const order = ['system', 'light', 'dark'];
  const next = order[(order.indexOf(theme) + 1) % order.length];
  const nextLabel =
    next === 'light' ? t('common.themeLight') : next === 'dark' ? t('common.themeDark') : t('common.themeSystem');

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`${t('common.theme')}: ${nextLabel}`}
      title={`${t('common.theme')}: ${nextLabel}`}
      className={`inline-flex items-center gap-1.5 rounded-xl border border-ink-500/25 px-2.5 py-2 text-xs font-semibold text-ink-200 transition hover:border-iris-400/40 hover:text-ink-100 ${className}`}
    >
      <ThemeIcon theme={theme === 'system' ? 'system' : resolvedTheme} className="size-3.5" />
      <span className="sr-only sm:not-sr-only sm:inline">
        {theme === 'light' ? t('common.themeLight') : theme === 'dark' ? t('common.themeDark') : t('common.themeSystem')}
      </span>
    </button>
  );
}
