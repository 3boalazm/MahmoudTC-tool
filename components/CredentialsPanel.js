'use client';

/**
 * components/CredentialsPanel.js
 * ---------------------------------------------------------------------------
 * "Connect my own API keys" — the piece of the app that turns a deployment with
 * no environment keys into a working installation, and lets anyone disconnect
 * again.
 *
 * The rules this panel obeys:
 *
 *   • A key is written once and never read back. The server stores it in an
 *     httpOnly cookie on this device and reports only a mask (`sk_1••••4f2a`).
 *   • Every action is explicit: save, test, disconnect. Nothing happens on blur.
 *   • Failures say what the provider said (rejected / out of credit / no answer),
 *     because "invalid key" and "wrong region" need different fixes.
 *   • An env-provided key cannot be deleted from here — it lives in the
 *     deployment — so the panel offers the next best thing: disable it for this
 *     browser.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { AlertIcon, CheckIcon, EyeOffIcon, KeyIcon, PlugIcon, SpinnerIcon, TrashIcon } from '@/components/Icons';
import { useI18n } from '@/components/providers/I18nProvider.js';

/** Status chips: colour + translation key per credential source. */
const SOURCE_STYLE = {
  settings: { tone: 'text-mint-300 bg-mint-500/10 ring-mint-500/30', key: 'settings.source.settings' },
  environment: { tone: 'text-iris-200 bg-iris-500/10 ring-iris-500/30', key: 'settings.source.environment' },
  disabled: { tone: 'text-amber-300 bg-amber-500/10 ring-amber-500/30', key: 'settings.source.disabled' },
  none: { tone: 'text-ink-400 bg-surface-2 ring-white/5', key: 'settings.source.none' },
};

/** Verification results that should read as success. */
const OK_CODES = new Set(['OK', 'DISABLED', 'ENABLED', 'DISCONNECTED', 'DISCONNECTED_ALL', 'NOT_CONNECTED']);

/**
 * @param {{ initialState?: object }} props `initialState` is rendered by the
 *        server, so the first paint already shows the real connections.
 */
export default function CredentialsPanel({ initialState = null }) {
  const { t } = useI18n();

  const [state, setState] = useState(initialState);
  const [status, setStatus] = useState(initialState ? 'ready' : 'loading');
  const [loadError, setLoadError] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [revealed, setRevealed] = useState({});
  const [busy, setBusy] = useState(null); // `${engine}:${action}`
  const [results, setResults] = useState({});
  const [formError, setFormError] = useState(null);

  const abortRef = useRef(null);

  const applyState = useCallback((payload) => {
    if (!payload?.engines) return;
    setState(payload);
    // Clear the draft for the engine that was just stored: it is saved now.
    const result = payload.result;
    if (result?.stored) {
      setDrafts((current) => ({ ...current, [result.engine]: '' }));
    }
  }, []);

  useEffect(() => {
    // Fresh state came with the HTML: nothing to fetch until an action runs.
    if (initialState) return undefined;

    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      try {
        setStatus('loading');
        const response = await fetch('/api/credentials', {
          signal: controller.signal,
          headers: { accept: 'application/json' },
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error?.message ?? `HTTP ${response.status}`);
        applyState(payload);
        setStatus('ready');
      } catch (error) {
        if (controller.signal.aborted) return;
        setLoadError(error?.message ?? String(error));
        setStatus('error');
      }
    })();

    return () => controller.abort();
  }, [applyState, initialState]);

  const run = useCallback(
    async (engine, action, extra = {}) => {
      const tag = `${engine}:${action}`;
      setBusy(tag);
      setFormError(null);
      try {
        const response = await fetch('/api/credentials', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ engine, action, ...extra }),
        });
        const payload = await response.json();

        if (!response.ok) {
          setFormError({
            engine,
            reason: payload?.error?.detail ?? 'unknown',
            message: payload?.error?.message ?? `HTTP ${response.status}`,
          });
          setResults((current) => ({ ...current, [engine]: null }));
          return;
        }

        applyState(payload);
        setResults((current) => ({ ...current, [engine]: payload.result ?? null }));
      } catch (error) {
        setFormError({ engine, reason: 'network', message: error?.message ?? String(error) });
      } finally {
        setBusy(null);
      }
    },
    [applyState],
  );

  const disconnect = useCallback(async (engine) => {
    setBusy(`${engine}:remove`);
    setFormError(null);
    try {
      const query = engine ? `?engine=${encodeURIComponent(engine)}` : '?all=1';
      const response = await fetch(`/api/credentials${query}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok) {
        setFormError({ engine, reason: 'unknown', message: payload?.error?.message ?? `HTTP ${response.status}` });
        return;
      }
      applyState(payload);
      setResults((current) => ({ ...current, [engine ?? 'all']: payload.result ?? null }));
    } catch (error) {
      setFormError({ engine, reason: 'network', message: error?.message ?? String(error) });
    } finally {
      setBusy(null);
    }
  }, [applyState]);

  if (status === 'loading' && !state) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-surface-1/70 p-6 text-sm text-ink-300">
        <SpinnerIcon className="size-4 animate-spin" />
        {t('settings.loading')}
      </div>
    );
  }

  if (status === 'error' && !state) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 text-sm text-rose-200">
        <p className="flex items-center gap-2 font-medium">
          <AlertIcon className="size-4" />
          {t('settings.loadErrorTitle')}
        </p>
        <p className="mt-1 text-rose-200/80">{loadError}</p>
      </div>
    );
  }

  const engines = state?.engines ?? [];
  const connected = state?.connected ?? 0;
  const total = state?.total ?? engines.length;

  /*
   * Prefer a translated explanation for the rejection reason the API reported
   * (`empty`, `too-short`, `quotes`, …); fall back to the server's own sentence
   * when the reason is something we do not know yet.
   */
  const invalidKey = formError ? `settings.invalid.${formError.reason}` : null;
  const translatedInvalid = invalidKey ? t(invalidKey, { engine: formError.engine }) : null;
  const notice =
    translatedInvalid && translatedInvalid !== invalidKey ? translatedInvalid : formError?.message;

  return (
    <div className="flex flex-col gap-5">
      {/* ------------------------------------------------------------ summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/5 bg-surface-1/70 p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-iris-500/10 text-iris-200 ring-1 ring-iris-500/20">
            <PlugIcon className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink-100">
              {t('settings.summary.connected', { connected, total })}
            </p>
            <p className="font-mono text-[11px] text-ink-500">
              {t('settings.summary.chain', { chain: (state?.chain ?? []).join(' → ') || '—' })}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => disconnect(null)}
          disabled={busy !== null || !engines.some((engine) => engine.canRemove)}
          className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy === 'all:remove' ? <SpinnerIcon className="size-3.5 animate-spin" /> : <TrashIcon className="size-3.5" />}
          {t('settings.actions.disconnectAll')}
        </button>
      </div>

      {/* -------------------------------------------------------------- notice */}
      {notice ? (
        <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-100">
          <AlertIcon className="mt-0.5 size-3.5 shrink-0" />
          <span>{notice}</span>
        </p>
      ) : null}

      {/* --------------------------------------------------------------- cards */}
      <ul className="grid gap-4">
        {engines.map((engine) => {
          const style = SOURCE_STYLE[engine.source] ?? SOURCE_STYLE.none;
          const value = drafts[engine.id] ?? '';
          const result = results[engine.id];
          const saving = busy === `${engine.id}:save`;
          const testing = busy === `${engine.id}:test`;
          const removing = busy === `${engine.id}:remove`;

          return (
            <li
              key={engine.id}
              className="rounded-2xl border border-white/5 bg-surface-1/70 p-4 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-surface-2 text-ink-300 ring-1 ring-white/5">
                    <KeyIcon className="size-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-ink-100">{engine.label}</h3>
                    <p className="font-mono text-[11px] text-ink-500">
                      {engine.keyVar}
                      {engine.masked ? ` · ${engine.masked}` : ''}
                    </p>
                  </div>
                </div>

                <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${style.tone}`}>
                  {t(style.key)}
                </span>
              </div>

              {/* ------------------------------------------------------- input */}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <input
                    type={revealed[engine.id] ? 'text' : 'password'}
                    value={value}
                    onChange={(event) =>
                      setDrafts((current) => ({ ...current, [engine.id]: event.target.value }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && value.trim()) run(engine.id, 'save', { key: value });
                    }}
                    placeholder={t('settings.input.placeholder', { engine: engine.label })}
                    aria-label={t('settings.input.label', { engine: engine.label })}
                    autoComplete="off"
                    spellCheck="false"
                    dir="ltr"
                    className="w-full rounded-xl border border-white/10 bg-surface-2/70 px-3 py-2 pe-10 font-mono text-xs text-ink-100 placeholder:text-ink-500 focus:border-iris-400/60 focus:outline-none focus:ring-2 focus:ring-iris-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setRevealed((current) => ({ ...current, [engine.id]: !current[engine.id] }))}
                    aria-label={revealed[engine.id] ? t('settings.input.hide') : t('settings.input.reveal')}
                    className="absolute inset-y-0 end-2 grid place-items-center px-2 text-ink-500 transition hover:text-ink-200"
                  >
                    {revealed[engine.id] ? <EyeOffIcon className="size-4" /> : <KeyIcon className="size-4" />}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => run(engine.id, 'save', { key: value })}
                    disabled={!value.trim() || busy !== null}
                    className="shine hover-lift press-scale inline-flex items-center gap-2 rounded-xl bg-iris-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-iris-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving ? <SpinnerIcon className="size-3.5 animate-spin" /> : <CheckIcon className="size-3.5" />}
                    {t('settings.actions.save')}
                  </button>

                  <button
                    type="button"
                    onClick={() => run(engine.id, 'test', value.trim() ? { key: value } : {})}
                    disabled={busy !== null || (!value.trim() && !engine.configured)}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-surface-2/60 px-3 py-2 text-xs font-semibold text-ink-200 transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {testing ? <SpinnerIcon className="size-3.5 animate-spin" /> : <PlugIcon className="size-3.5" />}
                    {t('settings.actions.test')}
                  </button>

                  {engine.canRemove ? (
                    <button
                      type="button"
                      onClick={() => disconnect(engine.id)}
                      disabled={busy !== null}
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {removing ? <SpinnerIcon className="size-3.5 animate-spin" /> : <TrashIcon className="size-3.5" />}
                      {engine.fromSettings ? t('settings.actions.disconnect') : t('settings.actions.enable')}
                    </button>
                  ) : null}

                  {!engine.canRemove && engine.fromEnvironment ? (
                    <button
                      type="button"
                      onClick={() => run(engine.id, 'disable')}
                      disabled={busy !== null}
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <EyeOffIcon className="size-3.5" />
                      {t('settings.actions.disable')}
                    </button>
                  ) : null}
                </div>
              </div>

              {/* ------------------------------------------------------ result */}
              {result ? (
                <p
                  className={`mt-3 flex items-start gap-2 text-xs ${
                    result.ok ? 'text-mint-300' : 'text-amber-200'
                  }`}
                >
                  {result.ok ? <CheckIcon className="mt-0.5 size-3.5 shrink-0" /> : <AlertIcon className="mt-0.5 size-3.5 shrink-0" />}
                  <span>
                    {t(`settings.result.${result.code}`, { engine: engine.label })}
                    {result.detail ? <span className="text-ink-500"> · {result.detail}</span> : null}
                  </span>
                </p>
              ) : null}

              {/* ------------------------------------------------------- hints */}
              <p className="mt-3 text-[11px] leading-relaxed text-ink-500">
                {engine.source === 'environment'
                  ? t('settings.hint.environment', { var: engine.keyVar })
                  : engine.disabled
                    ? t('settings.hint.disabled')
                    : engine.source === 'settings'
                      ? t('settings.hint.settings')
                      : t('settings.hint.empty', { var: engine.keyVar })}
              </p>

              <div className="mt-3 flex flex-wrap gap-3 text-[11px]">
                <a
                  href={engine.dashboardUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-iris-300 underline-offset-4 hover:underline"
                >
                  {t('settings.links.dashboard')}
                </a>
                <a
                  href={engine.docsUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-ink-400 underline-offset-4 hover:underline"
                >
                  {t('settings.links.docs')}
                </a>
              </div>
            </li>
          );
        })}
      </ul>

      {engines.length === 0 ? <p className="text-sm text-ink-400">{t('settings.noEngines')}</p> : null}
    </div>
  );
}

/** Exported for the unit tests: the codes the panel knows how to render. */
export const KNOWN_RESULT_CODES = [...OK_CODES];
