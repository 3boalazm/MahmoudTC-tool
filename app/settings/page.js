/**
 * app/settings/page.js
 * ---------------------------------------------------------------------------
 * Connect the app to a provider account.
 *
 * Two honest paths are offered side by side:
 *
 *   1. a key typed here — stored in an httpOnly cookie on this device, usable
 *      immediately, removable in one click;
 *   2. the deployment's own environment keys — set by whoever deployed the app,
 *      which a visitor cannot delete, only disable for their own browser.
 *
 * The page also states, in full, what is stored where. Keys are the one thing
 * this app holds that is worth stealing, so the explanation is part of the
 * product rather than a footnote.
 */

import Link from 'next/link';
import { cookies } from 'next/headers';

import CredentialsPanel from '@/components/CredentialsPanel.js';
import { AlertIcon, KeyIcon, PlugIcon, ShieldIcon } from '@/components/Icons.js';
import { environmentKeys, serverConfig } from '@/lib/server/config.js';
import {
  KEYS_COOKIE,
  credentialPanelState,
  parseCredentialCookie,
} from '@/lib/server/credentials.js';
import { getServerI18n } from '@/lib/i18n/server.js';

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return {
    title: t('settings.metaTitle'),
    description: t('settings.metaDescription'),
  };
}

export default async function SettingsPage() {
  const [{ t }, jar] = await Promise.all([getServerI18n(), cookies()]);

  /*
   * The panel is server-rendered with the real state, so the page never flashes
   * a spinner and the masked keys are readable before any JavaScript runs.
   */
  const initialState = credentialPanelState({
    credentials: parseCredentialCookie(jar.get(KEYS_COOKIE)?.value),
    envKeys: environmentKeys(),
    engineOrder: serverConfig.engineOrder,
    usagePanel: serverConfig.usage.enabled,
  });

  const facts = [
    { icon: KeyIcon, title: t('settings.facts.storageTitle'), body: t('settings.facts.storageBody') },
    { icon: ShieldIcon, title: t('settings.facts.precedenceTitle'), body: t('settings.facts.precedenceBody') },
    { icon: AlertIcon, title: t('settings.facts.warningTitle'), body: t('settings.facts.warningBody') },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <header className="animate-rise max-w-2xl">
        <h1 className="text-3xl font-medium tracking-tight text-ink-100 sm:text-4xl">
          {t('settings.heading')}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-400">{t('settings.subheading')}</p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="credentials-heading">
          <h2
            id="credentials-heading"
            className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ink-400"
          >
            <PlugIcon className="size-4" />
            {t('settings.connectionsHeading')}
          </h2>
          <CredentialsPanel initialState={initialState} />
        </section>

        <aside className="flex flex-col gap-4">
          <section className="rounded-3xl border border-ink-500/15 bg-surface-1/50 p-5">
            <h2 className="text-sm font-semibold text-ink-100">{t('settings.facts.heading')}</h2>
            <ul className="mt-3 flex flex-col gap-4">
              {facts.map((fact) => (
                <li key={fact.title} className="flex gap-3">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-surface-2 text-ink-300 ring-1 ring-white/5">
                    <fact.icon className="size-3.5" />
                  </span>
                  <div>
                    <p className="text-[13px] font-medium text-ink-200">{fact.title}</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-ink-400">{fact.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-3xl border border-ink-500/15 bg-surface-1/50 p-5">
            <h2 className="text-sm font-semibold text-ink-100">{t('settings.deploy.heading')}</h2>
            <p className="mt-2 text-[12px] leading-relaxed text-ink-400">{t('settings.deploy.body')}</p>
            <p className="mt-2 font-mono text-[11px] leading-relaxed text-ink-500">
              DEEPGRAM_API_KEY / GLADIA_API_KEY / ASSEMBLYAI_API_KEY / SPEECHMATICS_API_KEY
            </p>
            <p className="mt-3 text-[12px] leading-relaxed text-ink-400">
              {t('settings.deploy.blob', { enabled: serverConfig.blob.enabled ? t('common.yes') : t('common.no') })}
            </p>
          </section>

          <nav className="flex flex-col gap-2 text-[13px]">
            <Link href="/studio" className="text-iris-300 underline-offset-4 hover:underline">
              {t('settings.links.studio')}
            </Link>
            <Link href="/engines" className="text-ink-300 underline-offset-4 hover:underline">
              {t('settings.links.engines')}
            </Link>
            <Link href="/usage" className="text-ink-300 underline-offset-4 hover:underline">
              {t('settings.links.usage')}
            </Link>
          </nav>
        </aside>
      </div>
    </main>
  );
}
