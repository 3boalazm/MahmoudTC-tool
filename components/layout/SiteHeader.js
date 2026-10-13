'use client';

/**
 * components/layout/SiteHeader.js
 * ---------------------------------------------------------------------------
 * Sticky chrome shared by every page: brand, page navigation with the active
 * page highlighted, language switcher, theme switcher, install button, and a
 * mobile sheet.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { InstallButton } from '@/components/InstallApp.js';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher.js';
import ThemeToggle from '@/components/layout/ThemeToggle.js';
import { BoltIcon, WaveIcon, XIcon } from '@/components/Icons.js';
import { useI18n } from '@/components/providers/I18nProvider.js';

const PAGES = [
  { href: '/', key: 'nav.home' },
  { href: '/studio', key: 'nav.studio' },
  { href: '/engines', key: 'nav.engines' },
  { href: '/usage', key: 'nav.usage' },
  { href: '/faq', key: 'nav.faq' },
  { href: '/settings', key: 'nav.settings' },
];

export default function SiteHeader() {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  /*
   * The sheet is "open for" a specific pathname rather than a boolean, so a
   * route change closes it by derivation — no effect, no flicker.
   */
  const [menuOpenFor, setMenuOpenFor] = useState(null);
  const menuOpen = menuOpenFor === pathname;

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setMenuOpenFor(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const isActive = (href) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-500/15 bg-canvas/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          <span className="brand-glow-hover grid size-9 place-items-center rounded-2xl bg-gradient-to-br from-iris-500 to-iris-700 text-white shadow-[0_10px_30px_-12px_rgba(106,76,255,0.9)]">
            <WaveIcon className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold tracking-tight text-ink-100">
              {t('meta.title')}
            </span>
            <span className="hidden text-[11px] text-ink-500 sm:block">{t('meta.tagline')}</span>
          </span>
        </Link>

        <nav aria-label={t('nav.label')} className="hidden items-center gap-1 md:flex">
          {PAGES.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              aria-current={isActive(page.href) ? 'page' : undefined}
              className={`rounded-xl px-3 py-2 text-sm transition ${
                isActive(page.href)
                  ? 'bg-surface-2/80 font-semibold text-ink-100'
                  : 'text-ink-300 hover:bg-surface-2/70 hover:text-ink-100'
              }`}
            >
              {t(page.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          <InstallButton />
          <Link
            href="/studio"
            className="shine hover-lift press-scale hidden items-center gap-2 rounded-xl bg-surface-2 px-3.5 py-2 text-xs font-semibold text-ink-100 ring-1 ring-inset ring-ink-500/25 hover:bg-surface-3 lg:inline-flex"
          >
            <BoltIcon className="size-3.5 text-iris-300" />
            {t('nav.start')}
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpenFor(menuOpen ? null : pathname)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
            className="grid size-9 place-items-center rounded-xl border border-ink-500/25 text-ink-300 transition hover:text-ink-100 md:hidden"
          >
            {menuOpen ? (
              <XIcon className="size-4" />
            ) : (
              <span aria-hidden="true" className="flex flex-col gap-1">
                <span className="block h-0.5 w-4 rounded-full bg-current" />
                <span className="block h-0.5 w-4 rounded-full bg-current" />
                <span className="block h-0.5 w-4 rounded-full bg-current" />
              </span>
            )}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t border-ink-500/15 bg-surface-1/95 px-4 pb-4 pt-3 md:hidden">
          <nav aria-label={t('nav.label')} className="grid gap-1">
            {PAGES.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                aria-current={isActive(page.href) ? 'page' : undefined}
                className={`rounded-xl px-3 py-2.5 text-sm transition ${
                  isActive(page.href)
                    ? 'bg-surface-2 font-semibold text-ink-100'
                    : 'text-ink-300 hover:bg-surface-2/70 hover:text-ink-100'
                }`}
              >
                {t(page.key)}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex items-center gap-2 border-t border-ink-500/15 pt-3">
            <LanguageSwitcher />
            <ThemeToggle />
            <span className="sr-only">{locale}</span>
          </div>
        </div>
      ) : null}
    </header>
  );
}
