'use client';

/**
 * components/layout/LanguageSwitcher.js
 * ---------------------------------------------------------------------------
 * Two-state toggle rather than a dropdown: with exactly two locales, a single
 * tap is faster than a menu — and the label is always written in the target
 * language, so it stays readable to someone who cannot read the current one.
 */

import { SpinnerIcon } from '@/components/Icons.js';
import { useI18n } from '@/components/providers/I18nProvider.js';

export default function LanguageSwitcher({ className = '' }) {
  const { locale, t, setLocale, isSwitching } = useI18n();
  const next = locale === 'ar' ? 'en' : 'ar';

  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      disabled={isSwitching}
      aria-label={next === 'ar' ? t('common.switchToArabic') : t('common.switchToEnglish')}
      title={next === 'ar' ? t('common.switchToArabic') : t('common.switchToEnglish')}
      className={`inline-flex items-center gap-1.5 rounded-xl border border-ink-500/25 px-2.5 py-2 text-xs font-semibold text-ink-200 transition hover:border-iris-400/40 hover:text-ink-100 disabled:opacity-60 ${className}`}
    >
      {isSwitching ? <SpinnerIcon className="size-3.5 animate-spin" /> : null}
      <span aria-hidden="true">{next === 'ar' ? 'العربية' : 'English'}</span>
    </button>
  );
}
