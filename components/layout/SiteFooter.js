'use client';

/**
 * components/layout/SiteFooter.js
 * ---------------------------------------------------------------------------
 * Shared footer: page links, provider links, and the promises the app actually
 * keeps (keys stay server-side, nothing is stored, works offline).
 */

import Link from 'next/link';

import { InstallButton } from '@/components/InstallApp.js';
import { ShieldIcon, SparkIcon, WaveIcon } from '@/components/Icons.js';
import { useI18n } from '@/components/providers/I18nProvider.js';
import { ENGINES } from '@/lib/engines-meta.js';

export default function SiteFooter() {
  const { t } = useI18n();

  const pages = [
    { href: '/studio', label: t('nav.studio') },
    { href: '/engines', label: t('nav.engines') },
    { href: '/usage', label: t('nav.usage') },
    { href: '/faq', label: t('nav.faq') },
    { href: '/settings', label: t('nav.settings') },
  ];

  return (
    <footer className="safe-bottom mt-20 border-t border-ink-500/15 bg-surface-1/40">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-2xl bg-gradient-to-br from-iris-500 to-iris-700 text-white">
              <WaveIcon className="size-5" />
            </span>
            <span className="text-sm font-semibold text-ink-100">{t('meta.title')}</span>
          </div>
          <p className="mt-3 max-w-sm text-xs leading-relaxed text-ink-400">{t('footer.blurb')}</p>
          <div className="mt-4">
            <InstallButton />
          </div>
        </div>

        <nav aria-label={t('footer.nav')}>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
            {t('footer.nav')}
          </h2>
          <ul className="mt-3 space-y-2">
            {pages.map((page) => (
              <li key={page.href}>
                <Link
                  href={page.href}
                  className="text-xs text-ink-300 transition hover:text-ink-100"
                >
                  {page.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
            {t('footer.resources')}
          </h2>
          <ul className="mt-3 space-y-2">
            {ENGINES.map((engine) => (
              <li key={engine.id}>
                <a
                  href={engine.dashboardUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-xs text-ink-300 transition hover:text-ink-100"
                >
                  {engine.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
            {t('common.poweredBy')}
          </h2>
          <ul className="mt-3 space-y-2 text-xs text-ink-300">
            <li className="flex items-center gap-2">
              <SparkIcon className="size-3.5 text-iris-300" />
              Next.js · React · Tailwind v4
            </li>
            <li className="flex items-center gap-2">
              <ShieldIcon className="size-3.5 text-mint-400" />
              {t('footer.privacy')}
            </li>
            <li className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-block size-2 rounded-full bg-mint-400"
              />
              {t('footer.offlineready')}
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ink-500/10 px-4 py-4 text-center text-[11px] text-ink-500 sm:px-6 lg:px-8">
        <span>{t('footer.customized')}</span>
      </div>
      <div className="border-t border-ink-500/12 px-4 py-5 text-center text-[11px] text-ink-500 sm:px-6 lg:px-8">
        {t('footer.rights')}
      </div>
    </footer>
  );
}
