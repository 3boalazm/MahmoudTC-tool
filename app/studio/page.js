/**
 * app/studio/page.js — the transcriber.
 *
 * The interactive work lives in client components; this page owns the heading,
 * the structured metadata and the install prompt.
 */

import TranscriptionStudio from '@/components/TranscriptionStudio.js';
import { InstallBanner } from '@/components/InstallApp.js';
import { getServerI18n } from '@/lib/i18n/server.js';

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return {
    title: t('studio.metaTitle'),
    description: t('studio.metaDescription'),
  };
}

export default async function StudioPage() {
  const { t } = await getServerI18n();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <header className="animate-rise">
        <h1 className="text-3xl font-semibold tracking-tight text-ink-100 sm:text-4xl">
          {t('studio.heading')}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-400">
          {t('studio.subheading')}
        </p>
      </header>

      <div className="mt-8 space-y-5">
        <TranscriptionStudio />
        <InstallBanner />
      </div>
    </main>
  );
}
