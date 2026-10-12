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
import { copyToClipboard } from '@/lib/client/format';

const ACCENT = {
  iris: { ring: 'border-iris-400/25 bg-iris-500/8', text: 'text-iris-300', bar: 'bg-iris-400' },
  mint: { ring: 'border-mint-500/25 bg-mint-500/8', text: 'text-mint-400', bar: 'bg-mint-400' },
  amber: { ring: 'border-amber-500/25 bg-amber-500/8', text: 'text-amber-400', bar: 'bg-amber-400' },
  rose: { ring: 'border-rose-500/25 bg-rose-500/8', text: 'text-rose-400', bar: 'bg-rose-400' },
};

const formatHours = (hours) => {
  if (typeof hours !== 'number' || !Number.isFinite(hours)) return null;
  if (hours === 0) return '0 min';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  return `${hours.toFixed(hours < 10 ? 2 : 1)} h`;
};

const formatMinutes = (minutes) => {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes)) return '—';
  if (minutes < 1) return 'under a minute';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  return `${(minutes / 60).toFixed(1)} h`;
};

const formatMoney = (amount, units) => {
  if (typeof amount !== 'number') return null;
  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return units === 'USD' ? `$${formatted}` : `${formatted} ${units ?? ''}`.trim();
};

const formatRelative = (iso) => {
  if (!iso) return null;
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86_400)}d ago`;
};

export default function UsagePanel({ engines = [], enabled = true, engineOrder = [] }) {
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
        `  local: ${card.local?.requests ?? 0} requests, ${formatMinutes(card.local?.audioMinutes)} of audio`,
      ];
      if (card.provider?.available) {
        if (card.provider.remaining) {
          parts.push(
            `  remaining: ${formatMoney(card.provider.remaining.amount, card.provider.remaining.units)}`,
          );
        }
        if (card.provider.consumption?.hours !== undefined) {
          parts.push(`  provider usage: ${formatHours(card.provider.consumption.hours)}`);
        }
      } else if (card.provider?.error) {
        parts.push(`  provider usage: unavailable — ${card.provider.error}`);
      }
      return parts.join('\n');
    });

    const text = [
      `Speech to Text Studio — usage report`,
      `Period: ${report.period?.start} → ${report.period?.end}`,
      '',
      ...lines,
      '',
      `Totals: ${totals?.requests ?? 0} requests, ${totals?.audioMinutes ?? 0} audio minutes, ${totals?.fallbackWins ?? 0} served by fallback`,
    ].join('\n');

    if (await copyToClipboard(text)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1_800);
    }
  }, [cards, report, totals]);

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
              Usage &amp; remaining limits
            </h2>
            <p className="text-sm text-ink-400">
              {report
                ? `Consumption for the last ${report.period?.days ?? 30} days, reported per engine.`
                : 'What this app has consumed, and what each provider reports.'}
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
            Refresh
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!report}
            className="inline-flex items-center gap-1.5 rounded-xl border border-ink-500/25 px-3 py-2 text-xs font-medium text-ink-300 transition hover:border-iris-400/40 hover:text-ink-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copied ? 'Copied' : 'Copy report'}
          </button>
        </div>
      </header>

      {/* --------------------------------------------------------- summary */}
      {totals ? (
        <dl className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            { label: 'Requests', value: String(totals.requests ?? 0) },
            { label: 'Audio processed', value: formatMinutes(totals.audioMinutes) },
            { label: 'Served by fallback', value: String(totals.fallbackWins ?? 0) },
            {
              label: 'Engines keyed',
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
          <p>
            {error} Provider figures need a key with management/read scope; consumption is still
            counted locally.
          </p>
        </div>
      ) : null}

      {/* ----------------------------------------------------------- cards */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.id}
            className={`flex flex-col gap-3 rounded-2xl border p-4 ${card.accent.ring}`}
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
                {card.available ? (card.position ? `#${card.position}` : 'keyed') : 'no key'}
              </span>
            </header>

            {/* Provider-reported figures, when they exist. */}
            {card.provider?.available ? (
              <div className="space-y-2">
                {card.provider.remaining ? (
                  <div className="rounded-xl border border-mint-500/25 bg-mint-500/10 px-3 py-2">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-mint-400">
                      Remaining
                    </p>
                    <p className="font-mono text-lg font-semibold tabular-nums text-ink-100">
                      {formatMoney(
                        card.provider.remaining.amount,
                        card.provider.remaining.units,
                      ) ?? '—'}
                    </p>
                  </div>
                ) : null}

                {card.provider.consumption ? (
                  <dl className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-surface-1/70 px-2.5 py-2">
                      <dt className="text-[10px] uppercase tracking-wider text-ink-500">Used</dt>
                      <dd className="font-mono text-sm text-ink-100">
                        {formatHours(card.provider.consumption.hours) ?? '—'}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-surface-1/70 px-2.5 py-2">
                      <dt className="text-[10px] uppercase tracking-wider text-ink-500">Jobs</dt>
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
                  {card.available ? 'No API for usage' : 'Not configured'}
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-ink-500">
                  {card.provider?.error ??
                    'This provider does not publish usage or balance data over its API.'}
                </p>
                {card.dashboardUrl && card.available ? (
                  <a
                    href={card.dashboardUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-1.5 inline-block text-[10px] font-medium text-iris-300 underline decoration-iris-400/40 underline-offset-2 hover:text-iris-200"
                  >
                    Open provider dashboard →
                  </a>
                ) : null}
              </div>
            )}

            {/* Local counters are always available and always labelled. */}
            <footer className="mt-auto space-y-1.5 border-t border-ink-500/15 pt-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-ink-500">
                This app
              </p>
              <p className="flex items-center justify-between text-[11px] text-ink-300">
                <span className="inline-flex items-center gap-1.5">
                  <BoltIcon className="size-3 text-ink-500" />
                  Requests
                </span>
                <span className="font-mono tabular-nums">
                  {(card.local?.requests ?? 0).toLocaleString()}
                  {card.local?.failures ? (
                    <span className="ml-1 text-rose-400/80">({card.local.failures} failed)</span>
                  ) : null}
                </span>
              </p>
              <p className="flex items-center justify-between text-[11px] text-ink-300">
                <span className="inline-flex items-center gap-1.5">
                  <ClockIcon className="size-3 text-ink-500" />
                  Audio
                </span>
                <span className="font-mono tabular-nums">
                  {formatMinutes(card.local?.audioMinutes)}
                </span>
              </p>
              {card.local?.lastUsedAt ? (
                <p className="text-right text-[10px] text-ink-500">
                  last used {formatRelative(card.local.lastUsedAt)}
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
          className="flex w-full items-center justify-between gap-3 text-left text-xs font-medium text-ink-300 transition hover:text-ink-100"
        >
          <span className="inline-flex items-center gap-2">
            <LayersIcon className="size-3.5 text-ink-500" />
            Where these numbers come from
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
              <span className="font-medium text-ink-300">“This app” figures</span> are counted by
              the server, per engine, since the process started. They reset on every restart or
              deploy and are per-instance — they are a session view, not billing records.
            </p>
            <p>
              <span className="font-medium text-ink-300">Provider figures</span> are read from each
              vendor’s own API and cached for{' '}
              {report?.cacheSeconds ? `${Math.round(report.cacheSeconds / 60)} minutes` : 'a few minutes'}.
              {anyProviderFigure
                ? ' Deepgram reports a real remaining balance; Speechmatics reports usage but no balance.'
                : ' None of the configured engines expose usage to the API right now.'}
            </p>
            <p>
              <span className="font-medium text-ink-300">What is deliberately missing:</span> no
              engine shows a “remaining minutes” projection, because only Deepgram publishes a
              balance and no provider publishes your plan’s included quota. Anything else would be
              a guess.
            </p>
            <p className="text-ink-500">
              ⚠️ This panel exposes account-level consumption. Set{' '}
              <code className="rounded bg-surface-2 px-1 py-0.5 font-mono">ENABLE_USAGE_PANEL=false</code>{' '}
              to switch it off on a public deployment.
            </p>
          </div>
        ) : null}
      </div>

      {engineOrder?.length ? (
        <p className="mt-3 font-mono text-[10px] text-ink-500">
          failover chain: {engineOrder.join(' → ')}
        </p>
      ) : null}
    </section>
  );
}
