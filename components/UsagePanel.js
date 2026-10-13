'use client';

/**
 * components/UsagePanel.js
 * ---------------------------------------------------------------------------
 * "How much have I used, and how much is left?"
 *
 * The honest answer differs per provider, so each card says exactly where its
 * numbers come from:
 *
 *   Deepgram      → real remaining balance + hours used (management API)
 *   Speechmatics  → real hours + job counts for the period
 *   Gladia        → not exposed; local counters + a dashboard link
 *   AssemblyAI    → not exposed; local counters + a dashboard link
 *
 * Nothing is estimated or invented. When a figure genuinely does not exist, the
 * card says so instead of displaying a placeholder that looks like a limit.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { AlertIcon, BoltIcon, ClockIcon, LayersIcon, SpinnerIcon, WaveIcon } from '@/components/Icons';
import { useI18n } from '@/components/providers/I18nProvider.js';
import { copyToClipboard } from '@/lib/client/format';

/** Numeric formatting follows the locale (Western digits in both, by design). */
const LOCALE_TAG = { en: 'en-US', ar: 'ar-EG' };

/** Shown only when the server did not report its cache window. */
const serverConfigMinutes = 5;

const ACCENT = {
  iris: { ring: 'border-iris-400/25 bg-iris-500/8', text: 'text-iris-300', bar: 'bg-iris-400' },
  mint: { ring: 'border-mint-500/25 bg-mint-500/8', text: 'text-mint-400', bar: 'bg-mint-400' },
  amber: { ring: 'border-amber-500/25 bg-amber-500/8', text: 'text-amber-400', bar: 'bg-amber-400' },
  rose: { ring: 'border-rose-500/25 bg-rose-500/8', text: 'text-rose-400', bar: 'bg-rose-400' },
};

/** Localised duration helpers: minutes under an hour, hours beyond it. */
function durationLabels(t) {
  return {
    hours: (hours) => {
      if (typeof hours !== 'number' || !Number.isFinite(hours)) return null;
      if (hours === 0) return t('usage.zeroMinutes');
      if (hours < 1) return t('usage.minutes', { count: Math.round(hours * 60) });
      return t('usage.hours', { count: hours.toFixed(hours < 10 ? 2 : 1) });
    },
    minutes: (minutes) => {
      if (typeof minutes !== 'number' || !Number.isFinite(minutes)) return '—';
      if (minutes < 1) return t('usage.underMinute');
      if (minutes < 60) return t('usage.minutes', { count: Math.round(minutes) });
      return t('usage.hours', { count: (minutes / 60).toFixed(1) });
    },
  };
}

const formatMoney = (amount, units, locale) => {
  if (typeof amount !== 'number') return null;
  if (units === 'USD') {
    return new Intl.NumberFormat(LOCALE_TAG[locale] ?? 'en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }
  const formatted = amount.toLocaleString(LOCALE_TAG[locale] ?? 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${units ?? ''}`.trim();
};

function relativeTime(t, iso) {
  if (!iso) return null;
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return t('usage.justNow');
  if (seconds < 3600) return t('usage.minutesAgo', { count: Math.floor(seconds / 60) });
  if (seconds < 86_400) return t('usage.hoursAgo', { count: Math.floor(seconds / 3600) });
  return t('usage.daysAgo', { count: Math.floor(seconds / 86_400) });
}

export default function UsagePanel({ engines = [], enabled = true, engineOrder = [] }) {
  const { t, locale } = useI18n();
  const { hours: formatHours, minutes: formatMinutes } = useMemo(() => durationLabels(t), [t]);
  const [report, setReport] = useState(null);
  const [status, setStatus] = useState(enabled ? 'loading' : 'disabled');
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  /** Bumped to force a refetch that bypasses the server-side cache. */
  const [refreshToken, setRefreshToken] = useState(0);

  /**
   * One loader for both the initial mount and every manual refresh. All state
   * writes happen after `await`, so this never causes a cascading render.
   */
  useEffect(() => {
    if (!enabled) return undefined;

    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(`/api/usage${refreshToken ? '?fresh=1' : ''}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (cancelled) return;

        if (response.status === 404) {
          setStatus('disabled');
          return;
        }

        const payload = await response.json();
        if (cancelled) return;

        if (!response.ok) {
          throw new Error(payload?.error?.message || `Usage request failed (${response.status}).`);
        }

        setReport(payload);
        setError(null);
        setStatus('ready');
      } catch (thrown) {
        if (cancelled || thrown?.name === 'AbortError') return;
        setError(thrown?.message || 'Usage could not be loaded.');
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [enabled, refreshToken]);

  const refresh = useCallback(() => {
    setStatus('loading');
    setRefreshToken((value) => value + 1);
  }, []);

  /* Merge the health-report engine metadata with the usage report. */
  const cards = useMemo(() => {
    const usageByEngine = Object.fromEntries(
      (report?.engines ?? []).map((entry) => [entry.engine, entry]),
    );

    return engines.map((engine) => {
      const usage = usageByEngine[engine.id] ?? null;
      const provider = usage?.provider ?? null;
      return {
        ...engine,
        accent: ACCENT[engine.accent] ?? ACCENT.iris,
        provider,
        local: usage?.local ?? null,
        reportsUsage: usage?.reportsUsage ?? engine.usage ?? 'none',
      };
    });
  }, [engines, report]);

  const totals = report?.totals ?? null;
  const anyProviderFigure = cards.some((card) => card.provider?.available);

  const handleCopy = useCallback(async () => {
    if (!report) return;
    const lines = cards.map((card) => {
      const parts = [
        `${card.label}:`,
        `  ${t('usage.thisApp')}: ${card.local?.requests ?? 0} ${t('usage.summary.requests')} · ${formatMinutes(
          card.local?.audioMinutes,
        )}`,
      ];
      if (card.provider?.available) {
        if (card.provider.remaining) {
          parts.push(
            `  ${t('usage.remaining')}: ${formatMoney(
              card.provider.remaining.amount,
              card.provider.remaining.units,
              locale,
            )}`,
          );
        }
        if (card.provider.consumption?.hours !== undefined) {
          parts.push(`  ${t('usage.used')}: ${formatHours(card.provider.consumption.hours)}`);
        }
      } else if (card.provider?.error) {
        parts.push(`  ${t('usage.noApi')} — ${card.provider.error}`);
      }
      return parts.join('\n');
    });

    const text = [
      `${t('meta.title')} — ${t('usage.heading')}`,
      `${t('usage.period')}: ${report.period?.start} → ${report.period?.end}`,
      '',
      ...lines,
      '',
      `${t('usage.summary.requests')}: ${totals?.requests ?? 0} · ${t('usage.summary.fallback')}: ${
        totals?.fallbackWins ?? 0
      }`,
    ].join('\n');

    if (await copyToClipboard(text)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1_800);
    }
  }, [cards, report, totals, t, locale, formatHours, formatMinutes]);

  if (!enabled || status === 'disabled') return null;

  return (
    <section
      id="usage"
      className="glass-panel animate-rise rounded-4xl p-5 shadow-[0_28px_80px_-40px_rgba(0,0,0,0.9)] sm:p-6"
      aria-labelledby="usage-heading"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25">
            <WaveIcon className="size-5" />
          </span>
          <div>
            <h2 id="usage-heading" className="text-base font-semibold text-ink-100">
              {t('usage.panelHeading')}
            </h2>
            <p className="text-sm text-ink-400">
              {report
                ? t('usage.panelSubtitle', { days: report.period?.days ?? 30 })
                : t('usage.panelSubtitleFallback')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={status === 'loading'}
            className="inline-flex items-center gap-1.5 rounded-xl border border-ink-500/25 px-3 py-2 text-xs font-medium text-ink-300 transition hover:border-iris-400/40 hover:text-ink-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <SpinnerIcon className={`size-3.5 ${status === 'loading' ? 'animate-spin' : ''}`} />
            {t('usage.refresh')}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!report}
            className="inline-flex items-center gap-1.5 rounded-xl border border-ink-500/25 px-3 py-2 text-xs font-medium text-ink-300 transition hover:border-iris-400/40 hover:text-ink-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copied ? t('usage.copied') : t('usage.copyReport')}
          </button>
        </div>
      </header>

      {/* --------------------------------------------------------- summary */}
      {totals ? (
        <dl className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            { label: t('usage.summary.requests'), value: String(totals.requests ?? 0) },
            { label: t('usage.summary.audio'), value: formatMinutes(totals.audioMinutes) },
            { label: t('usage.summary.fallback'), value: String(totals.fallbackWins ?? 0) },
            {
              label: t('usage.summary.keyed'),
              value: `${engines.filter((engine) => engine.available).length}/${engines.length}`,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-ink-500/15 bg-surface-1/60 px-3.5 py-2.5"
            >
              <dt className="text-[10px] font-medium uppercase tracking-wider text-ink-500">
                {item.label}
              </dt>
              <dd className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-ink-100">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {status === 'loading' && !report ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
          {engines.map((engine) => (
            <div
              key={engine.id}
              className="h-36 animate-shimmer rounded-2xl bg-gradient-to-r from-surface-2 via-surface-3 to-surface-2 bg-[length:200%_100%]"
            />
          ))}
        </div>
      ) : null}

      {status === 'error' ? (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300"
        >
          <AlertIcon className="mt-0.5 size-4 shrink-0 text-rose-400" />
          <p>{t('usage.loadingError', { message: error })}</p>
        </div>
      ) : null}

      {/* ----------------------------------------------------------- cards */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, index) => (
          <article
            key={card.id}
            style={{ animationDelay: `${index * 70}ms` }}
            className={`animate-stagger-in hover-lift flex flex-col gap-3 rounded-2xl border p-4 ${card.accent.ring}`}
          >
            <header className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-ink-100">{card.label}</h3>
                <p className="truncate font-mono text-[11px] text-ink-500">
                  {card.configuredModel || card.model}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  card.available
                    ? `${card.accent.text} bg-surface-2`
                    : 'bg-amber-500/15 text-amber-400'
                }`}
              >
                {card.available
                  ? card.position
                    ? `#${card.position}`
                    : t('common.configured')
                  : t('common.noKey')}
              </span>
            </header>

            {/* Provider-reported figures, when they exist. */}
            {card.provider?.available ? (
              <div className="space-y-2">
                {card.provider.remaining ? (
                  <div className="rounded-xl border border-mint-500/25 bg-mint-500/10 px-3 py-2">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-mint-400">
                      {t('usage.remaining')}
                    </p>
                    <p className="font-mono text-lg font-semibold tabular-nums text-ink-100">
                      {formatMoney(
                        card.provider.remaining.amount,
                        card.provider.remaining.units,
                        locale,
                      ) ?? '—'}
                    </p>
                  </div>
                ) : null}

                {card.provider.consumption ? (
                  <dl className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-surface-1/70 px-2.5 py-2">
                      <dt className="text-[10px] uppercase tracking-wider text-ink-500">
                        {t('usage.used')}
                      </dt>
                      <dd className="font-mono text-sm text-ink-100">
                        {formatHours(card.provider.consumption.hours) ?? '—'}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-surface-1/70 px-2.5 py-2">
                      <dt className="text-[10px] uppercase tracking-wider text-ink-500">
                        {t('usage.jobs')}
                      </dt>
                      <dd className="font-mono text-sm text-ink-100">
                        {(card.provider.consumption.jobs ?? card.provider.consumption.requests ?? 0).toLocaleString()}
                      </dd>
                    </div>
                  </dl>
                ) : null}

                {card.provider.note ? (
                  <p className="text-[10px] leading-relaxed text-ink-500">{card.provider.note}</p>
                ) : null}
              </div>
            ) : (
              <div className="rounded-xl border border-ink-500/15 bg-surface-1/50 px-3 py-2">
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-ink-400">
                  <AlertIcon className="size-3" />
                  {card.available ? t('usage.noApi') : t('usage.notConfigured')}
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-ink-500">
                  {card.provider?.error ?? t('usage.noApiBody')}
                </p>
                {card.dashboardUrl && card.available ? (
                  <a
                    href={card.dashboardUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-1.5 inline-block text-[10px] font-medium text-iris-300 underline decoration-iris-400/40 underline-offset-2 hover:text-iris-200"
                  >
                    {t('usage.openDashboard')}
                  </a>
                ) : null}
              </div>
            )}

            {/* Local counters are always available and always labelled. */}
            <footer className="mt-auto space-y-1.5 border-t border-ink-500/15 pt-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-ink-500">
                {t('usage.thisApp')}
              </p>
              <p className="flex items-center justify-between text-[11px] text-ink-300">
                <span className="inline-flex items-center gap-1.5">
                  <BoltIcon className="size-3 text-ink-500" />
                  {t('usage.summary.requests')}
                </span>
                <span className="font-mono tabular-nums">
                  {(card.local?.requests ?? 0).toLocaleString()}
                  {card.local?.failures ? (
                    <span className="ms-1 text-rose-400/80">({card.local.failures} failed)</span>
                  ) : null}
                </span>
              </p>
              <p className="flex items-center justify-between text-[11px] text-ink-300">
                <span className="inline-flex items-center gap-1.5">
                  <ClockIcon className="size-3 text-ink-500" />
                  {t('usage.summary.audio')}
                </span>
                <span className="font-mono tabular-nums">
                  {formatMinutes(card.local?.audioMinutes)}
                </span>
              </p>
              {card.local?.lastUsedAt ? (
                <p className="text-end text-[10px] text-ink-500">
                  {t('usage.lastUsed', { when: relativeTime(t, card.local.lastUsedAt) })}
                </p>
              ) : null}
            </footer>
          </article>
        ))}
      </div>

      {/* ------------------------------------------------------- disclosure */}
      <div className="mt-5 rounded-2xl border border-ink-500/15 bg-surface-1/50 px-4 py-3">
        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          aria-expanded={isOpen}
          className="flex w-full items-center justify-between gap-3 text-start text-xs font-medium text-ink-300 transition hover:text-ink-100"
        >
          <span className="inline-flex items-center gap-2">
            <LayersIcon className="size-3.5 text-ink-500" />
            {t('usage.provenance')}
          </span>
          <span
            aria-hidden="true"
            className={`text-ink-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          >
            ▾
          </span>
        </button>

        {isOpen ? (
          <div className="mt-3 space-y-2 text-[11px] leading-relaxed text-ink-400">
            <p>
              <span className="font-medium text-ink-300">{t('usage.provenanceLocalTitle')}</span>{' '}
              {t('usage.provenanceLocal')}
            </p>
            <p>
              <span className="font-medium text-ink-300">{t('usage.provenanceProviderTitle')}</span>{' '}
              {t('usage.provenanceProvider', {
                minutes: report?.cacheSeconds
                  ? Math.round(report.cacheSeconds / 60)
                  : serverConfigMinutes,
              })}
              {anyProviderFigure ? ` ${t('usage.provenanceProviderSome')}` : ` ${t('usage.provenanceProviderNone')}`}
            </p>
            <p>
              <span className="font-medium text-ink-300">{t('usage.provenanceMissingTitle')}</span>{' '}
              {t('usage.provenanceMissing')}
            </p>
            <p className="text-ink-500">
              {t('usage.provenanceWarning', { var: 'ENABLE_USAGE_PANEL=false' })}
            </p>
          </div>
        ) : null}
      </div>

      {engineOrder?.length ? (
        <p className="mt-3 font-mono text-[10px] text-ink-500">
          {t('usage.chainLabel', { chain: engineOrder.join(' → ') })}
        </p>
      ) : null}
    </section>
  );
}
