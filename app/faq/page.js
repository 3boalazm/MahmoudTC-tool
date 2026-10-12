/**
 * app/faq/page.js
 * ---------------------------------------------------------------------------
 * The questions people ask before trusting an app with their audio, plus the
 * errors they are most likely to actually see.
 */

import Link from 'next/link';

import { AlertIcon, BoltIcon, ShieldIcon } from '@/components/Icons.js';
import { getServerI18n } from '@/lib/i18n/server.js';

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return {
    title: t('faq.metaTitle'),
    description: t('faq.metaDescription'),
  };
}

export default async function FaqPage() {
  const { t } = await getServerI18n();
  const items = t('faq.items');
  const troubles = t('faq.trouble');

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <header className="animate-rise max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-ink-100 sm:text-4xl">
          {t('faq.heading')}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-400">{t('faq.subheading')}</p>
      </header>

      <div className="mt-8 grid gap-3 lg:grid-cols-2">
        {items.map((item) => (
          <details
            key={item.q}
            className="group rounded-3xl border border-ink-500/15 bg-surface-1/50 p-5 transition open:border-iris-400/25 open:bg-surface-2/50"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-ink-100 marker:hidden">
              {item.q}
              <span
                aria-hidden="true"
                className="grid size-6 shrink-0 place-items-center rounded-full border border-ink-500/25 text-ink-400 transition group-open:rotate-45 group-open:border-iris-400/40 group-open:text-iris-300"
              >
                +
              </span>
            </summary>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-400">{item.a}</p>
          </details>
        ))}
      </div>

      {/* --------------------------------------------------- troubleshooting */}
      <section className="mt-14" aria-labelledby="troubleshoot-heading">
        <h2
          id="troubleshoot-heading"
          className="text-2xl font-semibold tracking-tight text-ink-100 sm:text-3xl"
        >
          {t('faq.troubleshootTitle')}
        </h2>
        <p className="mt-2 text-sm text-ink-400">{t('faq.troubleshootSubtitle')}</p>

        <div className="mt-6 overflow-hidden rounded-3xl border border-ink-500/15">
          <table className="w-full border-collapse text-start text-[12px]">
            <tbody>
              {troubles.map((row) => (
                <tr key={row.symptom} className="even:bg-surface-1/40">
                  <th
                    scope="row"
                    className="w-2/5 px-4 py-3 text-start align-top font-semibold text-ink-200"
                  >
                    <span className="flex items-start gap-2">
                      <AlertIcon className="mt-0.5 size-3.5 shrink-0 text-amber-400" />
                      {row.symptom}
                    </span>
                  </th>
                  <td className="px-4 py-3 align-top text-ink-400">{row.fix}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* --------------------------------------------------------- call to action */}
      <section className="mt-14 flex flex-wrap items-center justify-between gap-4 rounded-4xl border border-iris-400/25 bg-iris-500/8 p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-iris-500/20 text-iris-300">
            <ShieldIcon className="size-5" />
          </span>
          <p className="max-w-md text-[13px] leading-relaxed text-ink-300">
            {t('footer.privacy')}
          </p>
        </div>
        <Link
          href="/studio"
          className="inline-flex items-center gap-2 rounded-2xl bg-iris-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-iris-400"
        >
          <BoltIcon className="size-4" />
          {t('home.ctaPrimary')}
        </Link>
      </section>
    </main>
  );
}
