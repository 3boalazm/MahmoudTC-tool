'use client';

/**
 * app/offline/page.js
 * ---------------------------------------------------------------------------
 * Served by the service worker when a navigation fails with no connection.
 * It is precached, so it renders even though nothing else can be fetched.
 */

import { WaveIcon } from '@/components/Icons.js';
import { useI18n } from '@/components/providers/I18nProvider.js';

export default function OfflinePage() {
  const { t } = useI18n();

  return (
    <main className="mx-auto grid w-full max-w-xl place-items-center px-4 py-24 text-center">
      <span className="grid size-14 place-items-center rounded-3xl bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25">
        <WaveIcon className="size-7" />
      </span>
      <h1 className="mt-6 text-2xl font-medium tracking-tight text-ink-100">
        {t('pwa.offlineTitle')}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-400">{t('pwa.offlineBody')}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="shine hover-lift press-scale mt-6 rounded-2xl bg-iris-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-iris-400"
      >
        {t('pwa.offlineRetry')}
      </button>
    </main>
  );
}
