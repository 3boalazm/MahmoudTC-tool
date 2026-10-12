'use client';

/**
 * components/InstallApp.js
 * ---------------------------------------------------------------------------
 * "Install this app" for mobile and desktop, with an honest fallback:
 *
 *   · Chromium / Edge / Samsung  → real `beforeinstallprompt` prompt
 *   · iOS Safari                 → no prompt exists, so we show the two taps
 *                                  the user needs (Share → Add to Home Screen)
 *   · already installed          → nothing is rendered at all
 *
 * Everything is progressive: with no service worker or no support, the buttons
 * simply do not appear and the rest of the interface is unaffected.
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { CheckIcon, ShieldIcon, SpinnerIcon, XIcon } from '@/components/Icons';
import { useI18n } from '@/components/providers/I18nProvider.js';

/** Are we running as the installed app rather than a browser tab? */
function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: minimal-ui)').matches ||
    window.navigator.standalone === true
  );
}

/**
 * Display mode is an external store: subscribing keeps the UI honest when the
 * user installs or uninstalls without a reload.
 */
function subscribeDisplayMode(onChange) {
  const queries = [
    window.matchMedia('(display-mode: standalone)'),
    window.matchMedia('(display-mode: minimal-ui)'),
  ];
  for (const query of queries) query.addEventListener('change', onChange);
  return () => {
    for (const query of queries) query.removeEventListener('change', onChange);
  };
}

function isIos() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [justInstalled, setJustInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  /** Flips once we are on the client, so SSR never renders the buttons. */
  const [mounted, setMounted] = useState(false);

  const runningStandalone = useSyncExternalStore(subscribeDisplayMode, isStandalone, () => false);
  const installed = runningStandalone || justInstalled;

  useEffect(() => {
    const onBeforeInstall = (event) => {
      event.preventDefault();
      setDeferred(event);
      setReady(true);
    };
    const onInstalled = () => {
      setJustInstalled(true);
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    // Deferred to a task: "we are mounted" is a fact about the browser, not a
    // synchronous state transition during the effect.
    const timer = setTimeout(() => setMounted(true), 0);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  /** True when we have something useful to offer. */
  const canOffer = mounted && !installed;

  const promptInstall = useCallback(async () => {
    if (!deferred) return 'unavailable';
    setBusy(true);
    try {
      deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      return choice?.outcome ?? 'dismissed';
    } catch {
      return 'unavailable';
    } finally {
      setBusy(false);
    }
  }, [deferred]);

  return {
    canOffer,
    canPromptNatively: Boolean(deferred),
    installed,
    busy,
    isIos: isIos(),
    promptInstall,
  };
}

/** Compact header control. */
export function InstallButton({ className = '' }) {
  const { t } = useI18n();
  const install = useInstallPrompt();
  const [sheet, setSheet] = useState(false);

  if (!install.canOffer) return null;

  const onClick = async () => {
    const outcome = await install.promptInstall();
    // iOS (and any browser without the event) needs the manual instructions.
    if (outcome === 'unavailable') setSheet(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        title={t('pwa.installTitle')}
        className={`inline-flex items-center gap-2 rounded-xl border border-mint-500/30 bg-mint-500/10 px-3 py-2 text-xs font-semibold text-mint-400 transition hover:bg-mint-500/20 ${className}`}
      >
        {install.busy ? (
          <SpinnerIcon className="size-3.5 animate-spin" />
        ) : (
          <ShieldIcon className="size-3.5" />
        )}
        <span className="hidden sm:inline">{t('common.install')}</span>
      </button>

      {sheet ? <InstallSheet onClose={() => setSheet(false)} /> : null}
    </>
  );
}

/** A card the user can dismiss, shown once under the studio. */
export function InstallBanner() {
  const { t } = useI18n();
  const install = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);
  const [sheet, setSheet] = useState(false);

  // Derived, so installing or dismissing hides it without an effect.
  const hidden = dismissed || install.installed;

  if (hidden || !install.canOffer) return null;

  return (
    <>
      <section className="glass-panel flex flex-wrap items-center gap-4 rounded-4xl p-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-mint-500/15 text-mint-400 ring-1 ring-mint-500/25">
          <ShieldIcon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-100">{t('pwa.installTitle')}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-400">{t('pwa.installBody')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              const outcome = await install.promptInstall();
              if (outcome === 'unavailable') setSheet(true);
              if (outcome === 'accepted') setDismissed(true);
            }}
            className="rounded-xl bg-iris-500 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-iris-400"
          >
            {t('pwa.installButton')}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-xl px-2.5 py-2 text-xs font-medium text-ink-400 transition hover:text-ink-200"
          >
            {t('pwa.later')}
          </button>
        </div>
      </section>

      {sheet ? <InstallSheet onClose={() => setSheet(false)} /> : null}
    </>
  );
}

/** Manual instructions — iOS Safari has no programmatic install. */
function InstallSheet({ onClose }) {
  const { t } = useI18n();
  const install = useInstallPrompt();

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('pwa.installTitle')}
      className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-3 backdrop-blur-sm sm:place-items-center"
      onClick={onClose}
    >
      <div
        className="glass-panel animate-rise w-full max-w-md rounded-4xl p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink-100">
              {install.isIos ? t('pwa.iosTitle') : t('pwa.manualHint')}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-400">
              {install.isIos ? t('pwa.iosBody') : t('pwa.installBody')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="grid size-8 shrink-0 place-items-center rounded-full border border-ink-500/25 text-ink-400 transition hover:text-ink-100"
          >
            <XIcon className="size-4" />
          </button>
        </header>

        {install.isIos ? (
          <ol className="mt-4 space-y-2 text-sm text-ink-300">
            <li className="flex items-center gap-2.5 rounded-2xl border border-ink-500/20 bg-surface-1/60 px-3.5 py-2.5">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-iris-500/20 font-mono text-[11px] text-iris-300">
                1
              </span>
              {t('pwa.iosShare')} ↑
            </li>
            <li className="flex items-center gap-2.5 rounded-2xl border border-ink-500/20 bg-surface-1/60 px-3.5 py-2.5">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-iris-500/20 font-mono text-[11px] text-iris-300">
                2
              </span>
              {t('pwa.iosAdd')} ⊞
            </li>
          </ol>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-iris-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-iris-400"
        >
          <CheckIcon className="size-4" />
          {t('common.close')}
        </button>
      </div>
    </div>
  );
}
