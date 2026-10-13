/**
 * app/usage/page.js
 * ---------------------------------------------------------------------------
 * "How much have I used, and how much is left?" — the full explanation, plus
 * the live report. The honesty rules are enforced server-side in
 * `lib/server/usage.js`: a provider that publishes nothing gets a card that
 * says so rather than a made-up number.
 */

import Link from 'next/link';

import UsagePanel from '@/components/UsagePanel.js';
import { LayersIcon, ShieldIcon, WaveIcon } from '@/components/Icons.js';
import { ENGINES } from '@/lib/engines-meta.js';
import { availableEngineOrder, engineAvailability, serverConfig } from '@/lib/server/config.js';
import { getServerI18n } from '@/lib/i18n/server.js';

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return {
    title: t('usage.metaTitle'),
    description: t('usage.metaDescription'),
  };
}

export default async function UsagePage() {
  const { t } = await getServerI18n();
  const availability = engineAvailability();
  const order = availableEngineOrder();

  /** Exactly the shape the studio passes to the same component. */
  const engines = ENGINES.map((engine) => ({
    id: engine.id,
    label: engine.label,
    model: serverConfig[engine.id]?.model || engine.model,
    configuredModel: serverConfig[engine.id]?.model || null,
    available: Boolean(availability[engine.id]),
    accent: engine.accent,
    usage: engine.usage,
    keyVar: engine.keyVar,
    dashboardUrl: engine.dashboardUrl,
    position: order.indexOf(engine.id) >= 0 ? order.indexOf(engine.id) + 1 : null,
  }));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <header className="animate-rise max-w-2xl">
        <h1 className="text-3xl font-medium tracking-tight text-ink-100 sm:text-4xl">
          {t('usage.heading')}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-400">{t('usage.body')}</p>
      </header>

      <div className="mt-8">
        <UsagePanel
          engines={engines}
          engineOrder={order}
          enabled={serverConfig.usage.enabled}
        />
      </div>

      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        <article className="glass-panel rounded-4xl p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink-100">
            <ShieldIcon className="size-4 text-mint-400" />
            {t('usage.provenance')}
          </h2>
          <ul className="mt-4 space-y-3 text-[12px] leading-relaxed text-ink-400">
            <li>
              <span className="font-semibold text-ink-300">
                {t('usage.provenanceLocalTitle')}
              </span>{' '}
              {t('usage.provenanceLocal')}
            </li>
            <li>
              <span className="font-semibold text-ink-300">
                {t('usage.provenanceProviderTitle')}
              </span>{' '}
              {t('usage.provenanceProvider', {
                minutes: Math.round(serverConfig.usage.cacheSeconds / 60),
              })}
            </li>
            <li>
              <span className="font-semibold text-ink-300">
                {t('usage.provenanceMissingTitle')}
              </span>{' '}
              {t('usage.provenanceMissing')}
            </li>
          </ul>
          <p className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3.5 py-2.5 text-[11px] leading-relaxed text-amber-400">
            {t('usage.provenanceWarning', { var: 'ENABLE_USAGE_PANEL=false' })}
          </p>
        </article>

        <article className="glass-panel rounded-4xl p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink-100">
            <LayersIcon className="size-4 text-iris-300" />
            {t('usage.period')}
          </h2>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-400">
            {t('usage.panelSubtitle', { days: serverConfig.usage.periodDays })}
          </p>

          <dl className="mt-4 space-y-2 text-[12px]">
            {ENGINES.map((engine) => (
              <div
                key={engine.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-ink-500/15 bg-surface-1/60 px-3.5 py-2"
              >
                <dt className="flex items-center gap-2 text-ink-300">
                  <WaveIcon
                    className={`size-3.5 ${
                      engine.accent === 'iris'
                        ? 'text-iris-300'
                        : engine.accent === 'mint'
                          ? 'text-mint-400'
                          : engine.accent === 'amber'
                            ? 'text-amber-400'
                            : 'text-rose-400'
                    }`}
                  />
                  {engine.label}
                </dt>
                <dd className="font-mono text-[11px] text-ink-500">
                  {engine.usage === 'balance+usage'
                    ? t('engines.usageDeepgram')
                    : engine.usage === 'usage'
                      ? t('engines.usageSpeechmatics')
                      : t('engines.usageNone')}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-4 font-mono text-[10px] text-ink-500">
            {t('usage.chainLabel', { chain: order.join(' → ') || '—' })}
          </p>

          <Link
            href="/studio"
            className="shine hover-lift press-scale mt-4 inline-flex items-center gap-2 rounded-2xl bg-iris-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-iris-400"
          >
            {t('home.ctaPrimary')}
          </Link>
        </article>
      </section>
    </main>
  );
}
