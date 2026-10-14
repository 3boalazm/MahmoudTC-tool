/**
 * app/engines/page.js
 * ---------------------------------------------------------------------------
 * The detail page behind the engine picker: what each provider is, which key
 * enables it, what its API exposes — and exactly which failures hand the
 * request to the next engine and which ones stop the chain.
 */

import Link from 'next/link';

import { BoltIcon, ClockIcon, LayersIcon, ShieldIcon } from '@/components/Icons.js';
import { ENGINES } from '@/lib/engines-meta.js';
import { getServerI18n } from '@/lib/i18n/server.js';

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return {
    title: t('engines.metaTitle'),
    description: t('engines.metaDescription'),
  };
}

const ACCENT = {
  iris: 'border-iris-400/30 bg-iris-500/8 text-iris-300',
  mint: 'border-mint-500/30 bg-mint-500/8 text-mint-400',
  amber: 'border-amber-500/30 bg-amber-500/8 text-amber-400',
  rose: 'border-rose-500/30 bg-rose-500/8 text-rose-400',
};

/** Codes that hand the request on, in the order the route produces them. */
const RETRYABLE = [
  'RATE_LIMITED',
  'PAYMENT_REQUIRED',
  'AUTH',
  'SERVER_ERROR',
  'TIMEOUT',
  'NETWORK',
  'EMPTY_TRANSCRIPT',
];

/** Codes that are reported immediately, because retrying cannot help. */
const FATAL = ['BAD_REQUEST', 'UNSUPPORTED_TYPE', 'TOO_LARGE'];

export default async function EnginesPage() {
  const { t } = await getServerI18n();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <header className="animate-rise max-w-2xl">
        <h1 className="text-3xl font-medium tracking-tight text-ink-100 sm:text-4xl">
          {t('engines.heading')}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-400">{t('engines.subheading')}</p>
      </header>

      {/* ------------------------------------------------------- engine cards */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {ENGINES.map((engine, index) => {
          const accent = ACCENT[engine.accent] ?? ACCENT.iris;
          return (
            <article
              key={engine.id}
              style={{ animationDelay: `${index * 70}ms` }}
              className={`animate-stagger-in hover-lift rounded-3xl border p-5 ${accent}`}
            >
              <header className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-ink-100">{engine.label}</h2>
                  <p className="mt-0.5 font-mono text-[11px] text-ink-500">{engine.model}</p>
                </div>
                <span className="rounded-full bg-surface-2/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-300">
                  {index === 0 ? t('engines.primary') : t('engines.fallback', { number: index })}
                </span>
              </header>

              <p className="mt-3 text-[13px] leading-relaxed text-ink-400">{engine.description}</p>

              <dl className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-xl bg-surface-1/70 px-3 py-2">
                  <dt className="uppercase tracking-wider text-ink-500">{t('engines.key')}</dt>
                  <dd className="mt-0.5 font-mono text-ink-300">{engine.keyVar}</dd>
                </div>
                <div className="rounded-xl bg-surface-1/70 px-3 py-2">
                  <dt className="uppercase tracking-wider text-ink-500">{t('engines.usageApi')}</dt>
                  <dd className="mt-0.5 text-ink-300">
                    {engine.usage === 'balance+usage'
                      ? t('engines.usageDeepgram')
                      : engine.usage === 'usage'
                        ? t('engines.usageSpeechmatics')
                        : t('engines.usageNone')}
                  </dd>
                </div>
              </dl>

              <p className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-500">
                <ShieldIcon className="size-3.5" />
                {engine.supportsRemoteUrl ? t('engines.acceptsAudio') : t('engines.bytesOnly')}
              </p>

              <div className="mt-4 flex flex-wrap gap-3 text-[11px] font-semibold">
                <a
                  href={engine.docsUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-iris-300 hover:text-iris-200"
                >
                  {t('engines.docs')} ↗
                </a>
                <a
                  href={engine.dashboardUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-ink-300 hover:text-ink-100"
                >
                  {t('engines.dashboard')} ↗
                </a>
              </div>

              <details className="mt-4 rounded-2xl border border-ink-500/15 bg-surface-1/50 p-3">
                <summary className="cursor-pointer text-xs font-semibold text-ink-200">
                  {t('engines.apiKeyGuide.heading')}
                </summary>
                <ol className="mt-3 list-decimal space-y-2 ps-5 text-xs leading-relaxed text-ink-400">
                  <li>
                    {t('engines.apiKeyGuide.step1')}{' '}
                    <a href={engine.signupUrl} target="_blank" rel="noreferrer noopener" className="font-semibold text-iris-300 hover:text-iris-200">
                      {t('engines.apiKeyGuide.createAccount')} ↗
                    </a>
                  </li>
                  <li>
                    {t('engines.apiKeyGuide.step2')}{' '}
                    <a href={engine.dashboardUrl} target="_blank" rel="noreferrer noopener" className="font-semibold text-iris-300 hover:text-iris-200">
                      {t('engines.dashboard')} ↗
                    </a>
                  </li>
                  <li>
                    {t('engines.apiKeyGuide.step3')}{' '}
                    <Link href="/settings" className="font-semibold text-iris-300 hover:text-iris-200">
                      {t('engines.apiKeyGuide.settings')} ↗
                    </Link>
                  </li>
                </ol>
                <p className="mt-3 text-[11px] leading-relaxed text-ink-500">
                  {t('engines.apiKeyGuide.note', { key: engine.keyVar })}
                </p>
              </details>
            </article>
          );
        })}
      </section>

      {/* ------------------------------------------------------------- chain */}
      <section className="mt-12 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <article className="glass-panel rounded-4xl p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink-100">
            <LayersIcon className="size-4 text-iris-300" />
            {t('engines.chainHeading')}
          </h2>
          <ol className="mt-4 space-y-2">
            {ENGINES.map((engine, index) => (
              <li key={engine.id} className="flex items-center gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 font-mono text-[11px] text-ink-300">
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-ink-100">{engine.label}</span>
                <span className="font-mono text-[11px] text-ink-500">{engine.model}</span>
                {index < ENGINES.length - 1 ? (
                  <span aria-hidden="true" className="ms-auto text-ink-500">
                    <span aria-hidden="true" className="rtl:rotate-180">
                    ↓
                  </span>
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-[12px] leading-relaxed text-ink-400">
            {t('engines.chainBody', { var: 'ENGINE_ORDER' })}
          </p>
        </article>

        <article className="glass-panel rounded-4xl p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink-100">
            <BoltIcon className="size-4 text-mint-400" />
            {t('engines.codesHeading')}
          </h2>

          <table className="mt-4 w-full text-start text-[11px]">
            <thead>
              <tr className="text-ink-500">
                <th scope="col" className="pb-2 text-start font-medium uppercase tracking-wider">
                  {t('engines.codeTable.code')}
                </th>
                <th scope="col" className="pb-2 text-start font-medium uppercase tracking-wider">
                  {t('engines.codeTable.behaviour')}
                </th>
              </tr>
            </thead>
            <tbody className="align-top">
              {RETRYABLE.map((code) => (
                <tr key={code} className="border-t border-ink-500/15">
                  <td className="py-2 pe-3 font-mono text-mint-400">{code}</td>
                  <td className="py-2 text-ink-400">{t(`errors.code.${code}`)}</td>
                </tr>
              ))}
              {FATAL.map((code) => (
                <tr key={code} className="border-t border-ink-500/15">
                  <td className="py-2 pe-3 font-mono text-rose-400">{code}</td>
                  <td className="py-2 text-ink-400">{t(`errors.code.${code}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-ink-500">
            <ClockIcon className="mt-0.5 size-3.5 shrink-0" />
            {t('home.chainFootnote')}
          </p>
        </article>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/studio"
          className="shine hover-lift press-scale inline-flex items-center gap-2 rounded-2xl bg-iris-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-iris-400"
        >
          <BoltIcon className="size-4" />
          {t('home.ctaPrimary')}
        </Link>
        <Link
          href="/usage"
          className="inline-flex items-center gap-2 rounded-2xl border border-ink-500/25 px-5 py-3 text-sm font-semibold text-ink-200 transition hover:border-iris-400/40 hover:text-ink-100"
        >
          {t('usage.heading')}
        </Link>
      </div>
    </main>
  );
}
