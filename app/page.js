/**
 * app/page.js — the landing page.
 *
 * Deliberately short: an overview, the failover story in one diagram, and links
 * to the pages that carry the detail (/studio, /engines, /usage, /faq). Every
 * string comes from the dictionary, so this page is fully Arabic in Arabic.
 */

import Link from 'next/link';

import {
  BoltIcon,
  ClockIcon,
  DownloadIcon,
  GlobeIcon,
  LayersIcon,
  MicIcon,
  ShieldIcon,
  SparkIcon,
  UploadIcon,
  WaveIcon,
} from '@/components/Icons.js';
import { getServerI18n } from '@/lib/i18n/server.js';
import { ENGINES } from '@/lib/engines-meta.js';

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return {
    title: t('home.metaTitle'),
    description: t('meta.description'),
  };
}

const HIGHLIGHT_ICONS = [MicIcon, LayersIcon, ShieldIcon, DownloadIcon];
const STEP_ICONS = [UploadIcon, BoltIcon, SparkIcon];

const ACCENT = {
  iris: 'border-iris-400/25 bg-iris-500/8 text-iris-300',
  mint: 'border-mint-500/25 bg-mint-500/8 text-mint-400',
  amber: 'border-amber-500/25 bg-amber-500/8 text-amber-400',
  rose: 'border-rose-500/25 bg-rose-500/8 text-rose-400',
};

export default async function HomePage() {
  const { t } = await getServerI18n();
  const highlights = t('home.highlights');
  const steps = t('home.steps');
  const explore = t('home.explore');

  return (
    <div className="relative overflow-x-clip">
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-12 sm:px-6 lg:px-8">
        {/* ------------------------------------------------------------ hero */}
        <section className="animate-rise text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-iris-400/25 bg-iris-500/10 px-3.5 py-1.5 text-[11px] font-medium text-iris-300">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint-400 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-mint-400" />
            </span>
            {t('home.badge', { count: ENGINES.length })}
          </span>

          <h1 className="text-balance-tight mx-auto mt-6 max-w-3xl text-4xl font-semibold leading-[1.12] tracking-tight text-ink-100 sm:text-5xl lg:text-6xl">
            {t('home.heroTitleLead')}
            <span className="bg-gradient-to-r from-iris-300 via-iris-400 to-mint-400 bg-clip-text text-transparent">
              {' '}
              {t('home.heroTitleAccent')}
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink-300 sm:text-lg">
            {t('home.heroBody')}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/studio"
              className="inline-flex items-center gap-2 rounded-2xl bg-iris-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-18px_rgba(111,108,255,0.9)] transition hover:bg-iris-400"
            >
              <BoltIcon className="size-4" />
              {t('home.ctaPrimary')}
            </Link>
            <Link
              href="/engines"
              className="inline-flex items-center gap-2 rounded-2xl border border-ink-500/25 px-5 py-3 text-sm font-semibold text-ink-200 transition hover:border-iris-400/40 hover:text-ink-100"
            >
              <LayersIcon className="size-4" />
              {t('home.ctaSecondary')}
            </Link>
          </div>

          <dl className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { value: String(ENGINES.length), label: t('home.stats.engines') },
              { value: t('home.stats.languagesValue'), label: t('home.stats.languages') },
              { value: t('home.stats.uploadValue'), label: t('home.stats.upload') },
              { value: t('home.stats.storedValue'), label: t('home.stats.stored') },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-ink-500/15 bg-surface-1/50 px-4 py-3"
              >
                <dt className="sr-only">{item.label}</dt>
                <dd>
                  <span className="block font-mono text-xl font-semibold tabular-nums text-ink-100">
                    {item.value}
                  </span>
                  <span className="mt-0.5 block text-[11px] uppercase tracking-wider text-ink-500">
                    {item.label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ------------------------------------------------------ highlights */}
        <section className="mt-20" aria-labelledby="highlights-heading">
          <h2 id="highlights-heading" className="sr-only">
            {t('home.highlightsTitle')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map((item, index) => {
              const Icon = HIGHLIGHT_ICONS[index] ?? SparkIcon;
              return (
                <article
                  key={item.title}
                  className="rounded-3xl border border-ink-500/15 bg-surface-1/50 p-5 transition hover:border-iris-400/25 hover:bg-surface-2/50"
                >
                  <span className="grid size-10 place-items-center rounded-2xl bg-surface-2 text-iris-300 ring-1 ring-ink-500/20">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-sm font-semibold text-ink-100">{item.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-400">{item.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* ----------------------------------------------------------- steps */}
        <section className="mt-20" aria-labelledby="steps-heading">
          <h2
            id="steps-heading"
            className="text-2xl font-semibold tracking-tight text-ink-100 sm:text-3xl"
          >
            {t('home.stepsTitle')}
          </h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = STEP_ICONS[index] ?? SparkIcon;
              return (
                <li
                  key={step.title}
                  className="rounded-3xl border border-ink-500/15 bg-surface-1/50 p-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-ink-500">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <Icon className="size-4 text-iris-300" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-ink-100">{step.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-400">{step.body}</p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ------------------------------------------------------ failover map */}
        <section className="mt-20" aria-labelledby="chain-heading">
          <div className="max-w-2xl">
            <h2
              id="chain-heading"
              className="text-2xl font-semibold tracking-tight text-ink-100 sm:text-3xl"
            >
              {t('home.chainTitle', { count: ENGINES.length - 1 })}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-400">{t('home.chainBody')}</p>
          </div>

          <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ENGINES.map((engine, index) => (
              <li
                key={engine.id}
                className={`rounded-3xl border p-5 ${ACCENT[engine.accent] ?? ACCENT.iris}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-ink-100">{engine.label}</h3>
                  <span className="font-mono text-[11px] text-ink-500">#{index + 1}</span>
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-ink-400">
                  {engine.description}
                </p>
                <p className="mt-3 font-mono text-[11px] text-ink-500">{engine.model}</p>
              </li>
            ))}
            <li className="rounded-3xl border border-ink-500/15 bg-surface-1/50 p-5">
              <div className="flex items-center gap-2">
                <ClockIcon className="size-4 text-ink-400" />
                <h3 className="text-sm font-semibold text-ink-100">{t('engines.chainHeading')}</h3>
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-ink-400">{t('home.chainFootnote')}</p>
              <Link
                href="/engines"
                className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-iris-300 hover:text-iris-200"
              >
                <GlobeIcon className="size-3.5" />
                {t('common.learnMore')}
              </Link>
            </li>
          </ol>
        </section>

        {/* --------------------------------------------------------- explore */}
        <section className="mt-20" aria-labelledby="explore-heading">
          <h2
            id="explore-heading"
            className="text-2xl font-semibold tracking-tight text-ink-100 sm:text-3xl"
          >
            {t('home.exploreTitle')}
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {explore.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-3xl border border-ink-500/15 bg-surface-1/50 p-5 transition hover:border-iris-400/30 hover:bg-surface-2/50"
              >
                <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-100">
                  <WaveIcon className="size-4 text-iris-300" />
                  {item.title}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-400">{item.body}</p>
                <span className="mt-3 inline-block text-[11px] font-semibold text-iris-300 transition group-hover:text-iris-200">
                  {item.cta} <span aria-hidden="true" className="inline-block rtl:rotate-180">→</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
