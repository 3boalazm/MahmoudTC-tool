'use client';

/**
 * components/EngineControls.js
 * ---------------------------------------------------------------------------
 * Engine selection, automatic-fallback switch, and language hint.
 *
 * The picker is driven entirely by what the deployment reports in
 * `/api/health`, so adding an engine to `lib/engines-meta.js` makes it appear
 * here automatically — greyed out until a key exists for it.
 */

import { useMemo } from 'react';

import { BoltIcon, GlobeIcon, LayersIcon, ShieldIcon } from '@/components/Icons';
import { useI18n } from '@/components/providers/I18nProvider.js';

export const LANGUAGES = [
  '',
  'en',
  'ar',
  'zh',
  'nl',
  'fr',
  'de',
  'hi',
  'id',
  'it',
  'ja',
  'ko',
  'pl',
  'pt',
  'ru',
  'es',
  'sv',
  'th',
  'tr',
  'uk',
  'vi',
];

/**
 * Language names come from the platform (`Intl.DisplayNames`), so the dropdown
 * reads "العربية · Arabic" correctly in either interface language without a
 * 20-row table per locale. UK English/older engines fall back to the raw code.
 */
function useLanguageNames(locale) {
  return useMemo(() => {
    let display = null;
    try {
      display = new Intl.DisplayNames([locale], { type: 'language' });
    } catch {
      display = null;
    }
    return (code) => {
      if (!code) return null;
      try {
        return display?.of(code) ?? code;
      } catch {
        return code;
      }
    };
  }, [locale]);
}


/** Dot + text colour per engine accent. */
const ACCENT = {
  iris: 'text-iris-300',
  mint: 'text-mint-400',
  amber: 'text-amber-400',
  rose: 'text-rose-400',
};

export default function EngineControls({
  engine,
  onEngineChange,
  fallback,
  onFallbackChange,
  language,
  onLanguageChange,
  engines = [],
  fallbackOptionEnabled = true,
  disabled = false,
}) {
  const { t, locale } = useI18n();
  const languageName = useLanguageNames(locale);

  /** "Auto" plus every engine the deployment knows about. */
  const options = useMemo(
    () => [
      {
        id: 'auto',
        label: t('engines.automatic'),
        blurb: t('engines.autoBlurb'),
        available: engines.some((entry) => entry.available),
        accent: 'iris',
        badge: t('common.recommended'),
      },
      ...engines.map((entry) => ({
        id: entry.id,
        label: entry.label,
        blurb: entry.blurb ?? entry.model ?? '',
        model: entry.model,
        available: Boolean(entry.available),
        accent: entry.accent ?? 'iris',
        keyVar: entry.keyVar,
        position: entry.position,
      })),
    ],
    [engines, t],
  );

  const handleKeyDown = (event) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const usable = options.filter((option) => option.available);
    if (!usable.length) return;
    const index = usable.findIndex((option) => option.id === engine);
    const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
    const next = usable[(index + delta + usable.length) % usable.length];
    onEngineChange(next.id);
  };

  const availableCount = engines.filter((entry) => entry.available).length;

  return (
    <section
      id="engine"
      className="glass-panel animate-rise rounded-4xl p-5 shadow-[0_28px_80px_-40px_rgba(0,0,0,0.9)] sm:p-6"
      aria-labelledby="engine-heading"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-mint-500/15 text-mint-400 ring-1 ring-mint-500/25">
            <LayersIcon className="size-5" />
          </span>
          <div>
            <h2 id="engine-heading" className="text-base font-semibold text-ink-100">
              {t('engines.pickHeading')}
            </h2>
            <p className="text-sm text-ink-400">
              {availableCount > 1
                ? t('engines.keyedHint')
                : t('engines.noKeyHint')}
            </p>
          </div>
        </div>

        {engines.length ? (
          <span className="rounded-full border border-ink-500/20 bg-surface-1/70 px-3 py-1.5 font-mono text-[11px] text-ink-400">
            {t('engines.keyed', { available: availableCount, total: engines.length })}
          </span>
        ) : null}
      </header>

      <div
        role="radiogroup"
        aria-labelledby="engine-heading"
        onKeyDown={handleKeyDown}
        className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5"
      >
        {options.map((option) => {
          const available = option.available;
          const selected = engine === option.id;
          const accent = ACCENT[option.accent] ?? ACCENT.iris;

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onEngineChange(option.id)}
              disabled={disabled || !available}
              title={
                available
                  ? `${option.label}${option.model ? ` · ${option.model}` : ''}`
                  : t('engines.missingKey', {
                      engine: option.label,
                      key: option.keyVar ?? 'API key',
                    })
              }
              className={`group relative flex flex-col gap-1.5 rounded-2xl border p-3 text-start transition disabled:cursor-not-allowed disabled:opacity-45 ${
                selected
                  ? 'border-iris-400/60 bg-iris-500/12 shadow-[0_0_0_1px_rgba(143,146,255,0.25)_inset]'
                  : 'border-ink-500/20 bg-surface-1/60 hover:border-iris-400/35 hover:bg-surface-2/60'
              }`}
            >
              <span className="flex items-center justify-between gap-1">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${
                      available ? 'bg-mint-400' : 'bg-amber-400'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="truncate text-sm font-semibold text-ink-100">
                    {option.label}
                  </span>
                </span>

                {option.id === 'auto' ? (
                  <BoltIcon className={`size-3.5 shrink-0 ${selected ? accent : 'text-ink-500'}`} />
                ) : option.position ? (
                  <span
                    className="shrink-0 font-mono text-[10px] text-ink-500"
                    title={t('engines.chainPosition', { position: option.position })}
                  >
                    #{option.position}
                  </span>
                ) : null}
              </span>

              <span className={`truncate text-[11px] ${available ? 'text-ink-400' : 'text-amber-400/80'}`}>
                {available ? option.blurb : t('common.noKey')}
              </span>

              {option.badge && selected ? (
                <span className="mt-0.5 self-start rounded-full bg-iris-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-iris-300">
                  {option.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {/* ------------------------------------------------ fallback switch */}
        <div className="flex items-start gap-3 rounded-2xl border border-ink-500/20 bg-surface-1/60 p-3.5">
          <Switch
            id="fallback-toggle"
            checked={fallback && fallbackOptionEnabled}
            disabled={disabled || !fallbackOptionEnabled}
            onChange={onFallbackChange}
            label={t('engines.fallbackLabel')}
            labelledBy="fallback-label"
          />
          <div className="min-w-0">
            <p
              id="fallback-label"
              className={`text-sm font-medium text-ink-100 ${
                disabled || !fallbackOptionEnabled ? 'opacity-60' : ''
              }`}
            >
              {t('engines.fallbackLabel')}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-ink-400">
              {fallbackOptionEnabled ? t('engines.fallbackOn') : t('engines.fallbackLocked')}
            </p>
          </div>
        </div>

        {/* -------------------------------------------------- language hint */}
        <div className="rounded-2xl border border-ink-500/20 bg-surface-1/60 p-3.5">
          <label
            htmlFor="language-select"
            className="flex items-center gap-2 text-sm font-medium text-ink-100"
          >
            <GlobeIcon className="size-4 text-ink-400" />
            {t('engines.languageLabel')}
          </label>
          <p className="mt-0.5 text-[11px] leading-relaxed text-ink-400">
            {t('engines.languageHint')}
          </p>
          <select
            id="language-select"
            value={language}
            disabled={disabled}
            onChange={(event) => onLanguageChange(event.target.value)}
            className="mt-2.5 w-full appearance-none rounded-xl border border-ink-500/25 bg-surface-2 px-3 py-2 text-sm text-ink-100 transition hover:border-iris-400/40 focus:border-iris-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">{t('engines.languageAuto')}</option>
            {LANGUAGES.filter(Boolean).map((code) => (
              <option key={code} value={code}>
                {languageName(code)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-ink-500">
        <ShieldIcon className="mt-0.5 size-3.5 shrink-0 text-mint-400" />
        <span>{t('engines.chainNote')}</span>
      </p>
    </section>
  );
}

/**
 * Accessible switch. A real <button role="switch"> keeps keyboard behaviour
 * (Enter/Space) and screen-reader semantics correct with zero CSS trickery.
 */
function Switch({ id, checked, onChange, disabled, label, labelledBy }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full ring-1 ring-inset transition disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-iris-500 ring-iris-400/60' : 'bg-surface-3 ring-ink-500/40'
      }`}
    >
      <span
        aria-hidden="true"
        className={`size-4 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-0.5 rtl:-translate-x-0.5'
        }`}
      />
    </button>
  );
}
