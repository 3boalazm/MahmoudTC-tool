'use client';

/**
 * components/TranscriptionStudio.js
 * ---------------------------------------------------------------------------
 * Client orchestrator. Owns the transcription lifecycle and shares state
 * between the three cards:
 *
 *   AudioSourceCard  →  what to transcribe
 *   EngineControls   →  how to transcribe it
 *   TranscriptPanel  →  the result
 *
 * All network calls go to the same-origin `/api/transcribe` route, which holds
 * the provider keys. The browser never sees a credential.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import AudioSourceCard from '@/components/AudioSourceCard';
import EngineControls from '@/components/EngineControls';
import TranscriptPanel from '@/components/TranscriptPanel';
import UsagePanel from '@/components/UsagePanel';
import {
  BoltIcon,
  KeyIcon,
  LayersIcon,
  ShieldIcon,
  SparkIcon,
  SpinnerIcon,
  WaveIcon,
} from '@/components/Icons';
import Link from 'next/link';
import { useI18n } from '@/components/providers/I18nProvider.js';
import { useAudioSource } from '@/hooks/useAudioSource';
import {
  TranscriptionClientError,
  requestTranscription,
  uploadToBlob,
} from '@/lib/client/api';
import { engineLabel, formatBytes, formatDuration, formatElapsed, formatTranscriptSegments, modelLabel } from '@/lib/client/format';
import { DEFAULT_ENGINE_ORDER, ENGINES, ENGINE_IDS } from '@/lib/engines-meta';

/**
 * Optimistic placeholder shown until /api/health answers: every engine the
 * build knows about, all assumed configured so the picker is never empty.
 */
const FALLBACK_ENGINE_LIST = ENGINES.map((engine) => ({
  ...engine,
  available: true,
  position: DEFAULT_ENGINE_ORDER.indexOf(engine.id) + 1,
}));

const DEFAULT_AVAILABILITY = Object.fromEntries(ENGINE_IDS.map((id) => [id, true]));

export default function TranscriptionStudio() {
  const { t } = useI18n();

  /* ------------------------------------------------------------- settings */
  const [engine, setEngine] = useState('auto');
  const [fallback, setFallback] = useState(true);
  const [language, setLanguage] = useState('');
  const [availability, setAvailability] = useState(DEFAULT_AVAILABILITY);
  /** Engine metadata straight from the deployment (order, keys, accents). */
  const [engines, setEngines] = useState(FALLBACK_ENGINE_LIST);
  const [engineOrder, setEngineOrder] = useState(DEFAULT_ENGINE_ORDER);
  const [usagePanelEnabled, setUsagePanelEnabled] = useState(true);
  /** Bumped after every completed transcription so the usage panel refetches. */
  const [usageRefreshToken, setUsageRefreshToken] = useState(0);
  const [limits, setLimits] = useState({ maxUploadMb: 25 });
  /** Large-file mode (browser → Vercel Blob → provider URL) when configured. */
  const [largeUploads, setLargeUploads] = useState({ enabled: false });
  const [links, setLinks] = useState({ enabled: true, maxMb: 50 });
  const [fallbackOptionEnabled, setFallbackOptionEnabled] = useState(true);
  const [healthChecked, setHealthChecked] = useState(false);
  /** True when at least one key came from this browser's settings page. */
  const [keysFromSettings, setKeysFromSettings] = useState(false);

  /* -------------------------------------------------------------- runtime */
  const [status, setStatus] = useState('idle'); // idle | running | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [text, setText] = useState('');
  const [speakerNames, setSpeakerNames] = useState({});
  const [showSpeakers, setShowSpeakers] = useState(true);
  const [showTimeline, setShowTimeline] = useState(true);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRecordingBusy, setIsRecordingBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);

  const abortRef = useRef(null);
  const timerRef = useRef(null);
  const transcriptRef = useRef(null);

  const { audio, peaks, isDecoding, load, loadLink, clear } = useAudioSource();

  const speakers = useMemo(() => {
    const seen = new Set();
    const entries = [];
    for (const segment of result?.segments ?? []) {
      const id = segment?.speaker;
      if (id === null || id === undefined || id === '' || seen.has(id)) continue;
      seen.add(id);
      entries.push({ id, number: entries.length + 1 });
    }
    return entries;
  }, [result?.segments]);

  /* ---------------------------------------------------- deployment probe */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/health', { cache: 'no-store' });
        const payload = await response.json();
        if (cancelled || !payload) return;

        const list = Array.isArray(payload.engines) && payload.engines.length
          ? payload.engines
          : FALLBACK_ENGINE_LIST;

        setEngines(list);
        setAvailability(
          Object.fromEntries(list.map((entry) => [entry.id, Boolean(entry.available)])),
        );
        if (Array.isArray(payload.engineOrder) && payload.engineOrder.length) {
          setEngineOrder(payload.engineOrder);
        }
        setKeysFromSettings(Boolean(payload.credentials?.fromSettings));
        setUsagePanelEnabled(Boolean(payload.features?.usagePanel ?? true));
        setFallbackOptionEnabled(Boolean(payload.features?.clientFallbackToggle ?? true));
        if (payload.limits?.maxUploadMb) {
          setLimits({
            maxUploadMb: payload.limits.maxUploadMb,
            platformBodyLimitMb: payload.limits.platformBodyLimitMb ?? null,
            maxDurationSeconds: payload.limits.maxDurationSeconds ?? null,
          });
        }
        if (payload.limits?.link) {
          setLinks({
            enabled: Boolean(payload.limits.link.enabled),
            maxMb: payload.limits.link.maxMb ?? 50,
          });
        }
        setLargeUploads(
          payload.largeUploads?.enabled
            ? {
                enabled: true,
                maxUploadMb: payload.largeUploads.maxUploadMb ?? 300,
                deletedAfterUse: payload.largeUploads.deletedAfterUse ?? true,
              }
            : { enabled: false },
        );
        // Never leave a pinned engine selected once we know it has no key.
        setEngine((current) => {
          if (current === 'auto') return current;
          const entry = list.find((candidate) => candidate.id === current);
          return entry && !entry.available ? 'auto' : current;
        });
      } catch {
        /* The studio still works; it just cannot grey out unusable engines. */
      } finally {
        if (!cancelled) setHealthChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ------------------------------------------------------------- cleanup */
  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  /* ---------------------------------------------------------- transcribe */
  const runTranscription = useCallback(async () => {
    if (!audio || status === 'running') return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus('running');
    setError(null);
    setResult(null);
    setElapsedMs(0);
    setUploadProgress(null);

    const startedAt = Date.now();
    stopTimer();
    timerRef.current = setInterval(() => setElapsedMs(Date.now() - startedAt), 100);

    try {
      /**
       * Serverless platforms reject request bodies above ~4.5 MB, so anything
       * larger is pushed to Vercel Blob first and the route receives a URL.
       * Local recordings are always small enough to go inline.
       */
      const isLink = audio.origin === 'link';
      const exceedsInline =
        !isLink && audio.size > limits.maxUploadMb * 1024 * 1024 && largeUploads.enabled;

      let audioUrl = null;
      if (exceedsInline) {
        setUploadProgress(0);
        audioUrl = await uploadToBlob(audio.blob, {
          filename: audio.name,
          signal: controller.signal,
          onProgress: setUploadProgress,
        });
        setUploadProgress(null);
      }

      const payload = await requestTranscription({
        // A pasted link is downloaded by the server; nothing is sent from here.
        audio: audioUrl || isLink ? undefined : audio.blob,
        audioUrl,
        mediaUrl: isLink ? audio.linkUrl : undefined,
        filename: audio.name,
        engine,
        fallback: fallback && fallbackOptionEnabled,
        language,
        durationSeconds: audio.durationSeconds,
        signal: controller.signal,
      });

      setSpeakerNames({});
      setResult({ ...payload, sourceName: audio.name });
      setText(formatTranscriptSegments(payload.segments, payload.text, {
        showSpeakers,
        showTimeline,
        speakerLabel: (number) => t('transcript.speaker', { number }),
      }));
      setElapsedMs(payload.elapsedMs ?? Date.now() - startedAt);
      setStatus('done');
      // The request just changed the consumption numbers on the server.
      setUsageRefreshToken((value) => value + 1);
      requestAnimationFrame(() => {
        transcriptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (thrown) {
      if (thrown?.code === 'ABORTED') {
        setStatus('idle');
        return;
      }
      setError(
        thrown instanceof TranscriptionClientError
          ? thrown
          : new TranscriptionClientError(thrown?.message || 'Transcription failed.', {}),
      );
      setStatus('error');
    } finally {
      stopTimer();
      setUploadProgress(null);
      abortRef.current = null;
    }
  }, [
    audio,
    engine,
    fallback,
    fallbackOptionEnabled,
    language,
    largeUploads.enabled,
    limits.maxUploadMb,
    status,
    stopTimer,
    showSpeakers,
    showTimeline,
    t,
  ]);

  const cancelTranscription = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    stopTimer();
    setStatus('idle');
  }, [stopTimer]);

  const clearAll = useCallback(() => {
    cancelTranscription();
    clear();
    setResult(null);
    setError(null);
    setText('');
    setSpeakerNames({});
    setElapsedMs(0);
    setStatus('idle');
  }, [cancelTranscription, clear]);

  const updateTranscriptOptions = useCallback((nextOptions) => {
    const nextShowSpeakers = nextOptions.showSpeakers ?? showSpeakers;
    const nextShowTimeline = nextOptions.showTimeline ?? showTimeline;
    if (nextOptions.showSpeakers !== undefined) setShowSpeakers(nextShowSpeakers);
    if (nextOptions.showTimeline !== undefined) setShowTimeline(nextShowTimeline);
    if (result) {
      setText(formatTranscriptSegments(result.segments, result.text, {
        showSpeakers: nextShowSpeakers,
        showTimeline: nextShowTimeline,
        speakerLabel: (number) => speakerNames[number]?.trim() || t('transcript.speaker', { number }),
      }));
    }
  }, [result, showSpeakers, showTimeline, speakerNames, t]);

  const updateSpeakerName = useCallback((number, name) => {
    const nextNames = { ...speakerNames, [number]: name };
    setSpeakerNames(nextNames);
    if (result) {
      setText(formatTranscriptSegments(result.segments, result.text, {
        showSpeakers,
        showTimeline,
        speakerLabel: (speakerNumber) =>
          nextNames[speakerNumber]?.trim() || t('transcript.speaker', { number: speakerNumber }),
      }));
    }
  }, [result, showSpeakers, showTimeline, speakerNames, t]);

  /* -------------------------------------------------- keyboard shortcuts */
  useEffect(() => {
    const onKeyDown = (event) => {
      const isRunCombo = (event.metaKey || event.ctrlKey) && event.key === 'Enter';
      if (isRunCombo) {
        event.preventDefault();
        runTranscription();
      } else if (event.key === 'Escape' && status === 'running') {
        cancelTranscription();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [runTranscription, cancelTranscription, status]);

  /* --------------------------------------------------------- derive bits */
  /**
   * Mirrors the server's `buildEnginePlan`: the configured chain is the base,
   * a pinned engine moves to the front, and turning fallback off collapses the
   * plan to that single engine.
   */
  const plan = useMemo(() => {
    const configured = engineOrder.filter((id) => availability[id]);
    const base = configured.length ? configured : ENGINE_IDS.filter((id) => availability[id]);
    if (!base.length) return { chain: [], primary: null, fallback: null };

    if (engine !== 'auto') {
      if (!availability[engine]) return { chain: [], primary: null, fallback: null };
      if (!(fallback && fallbackOptionEnabled)) {
        return { chain: [engine], primary: engine, fallback: null };
      }
      return { chain: [engine, ...base.filter((id) => id !== engine)], primary: engine, fallback: base.find((id) => id !== engine) ?? null };
    }

    return { chain: base, primary: base[0], fallback: base[1] ?? null };
  }, [engine, engineOrder, availability, fallback, fallbackOptionEnabled]);

  /** Model label for an engine id, taken from the deployment's own metadata. */
  const modelFor = useCallback(
    (id) => engines.find((entry) => entry.id === id)?.model ?? null,
    [engines],
  );

  const stageText = useMemo(() => {
    const seconds = elapsedMs / 1000;
    if (status !== 'running') return '';
    if (uploadProgress !== null) {
      return t('studio.stage.uploading', { percent: Math.round(uploadProgress * 100) });
    }
    if (seconds < 0.6) return t('studio.stage.sending');
    if (seconds < 2) return t('studio.stage.opening', { engine: engineLabel(plan.primary) });
    if (seconds < 12) {
      return t('studio.stage.transcribing', {
        engine: modelLabel(plan.primary, modelFor(plan.primary)),
      });
    }
    if (plan.fallback && seconds > 25) {
      return t('studio.stage.stillWorking', {
        fallback: engineLabel(plan.fallback),
        engine: engineLabel(plan.primary),
      });
    }
    return t('studio.stage.long');
  }, [status, elapsedMs, plan, uploadProgress, modelFor, t]);

  const canRun = Boolean(audio) && status !== 'running' && !isRecordingBusy && plan.chain.length > 0;

  return (
    <div id="studio" className="space-y-5">
      <AudioSourceCard
        audio={audio}
        peaks={peaks}
        isDecoding={isDecoding}
        onLoad={load}
        onLoadLink={loadLink}
        onClear={clear}
        disabled={status === 'running'}
        maxUploadMb={limits.maxUploadMb}
        largeUploads={largeUploads}
        links={links}
        onBusyChange={setIsRecordingBusy}
      />

      <EngineControls
        engine={engine}
        onEngineChange={setEngine}
        fallback={fallback}
        onFallbackChange={setFallback}
        language={language}
        onLanguageChange={setLanguage}
        engines={engines}
        fallbackOptionEnabled={fallbackOptionEnabled}
        disabled={status === 'running'}
      />

      <section
        aria-label={t('studio.ownership.aria')}
        className="relative overflow-hidden rounded-3xl border border-iris-400/25 bg-gradient-to-r from-iris-500/10 via-surface-1/80 to-mint-400/10 px-5 py-4 shadow-[0_16px_45px_-32px_rgba(111,108,255,0.65)] sm:px-6"
      >
        <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-10 size-32 rounded-full bg-iris-400/10 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl border border-iris-300/20 bg-surface-1/80 text-iris-300 shadow-inner">
            <SparkIcon className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-iris-300">
              {t('studio.ownership.eyebrow')}
            </p>
            <h2 className="mt-1 text-sm font-semibold tracking-tight text-ink-100 sm:text-base">
              {t('studio.ownership.title')}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-300 sm:text-sm">
              {t('studio.ownership.ownerLabel')} <span className="font-semibold text-ink-100">Mahmoud Aboalazm</span>
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- action bar */}
      <section
        id="run"
        className="glass-panel animate-rise rounded-4xl p-5 shadow-[0_28px_80px_-40px_rgba(0,0,0,0.9)] sm:p-6"
        aria-label="Run transcription"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-ink-400">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-500/20 bg-surface-1/70 px-3 py-1.5">
              <WaveIcon className="size-3.5 text-iris-300" />
              {audio ? (
                <>
                  <span className="max-w-[14rem] truncate font-medium text-ink-200">{audio.name}</span>
                  {audio.size > 0 ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{formatBytes(audio.size)}</span>
                    </>
                  ) : null}
                  {audio.durationSeconds ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{formatDuration(audio.durationSeconds)}</span>
                    </>
                  ) : null}
                </>
              ) : (
                <span>{t('studio.noAudio')}</span>
              )}
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-500/20 bg-surface-1/70 px-3 py-1.5">
              <LayersIcon className="size-3.5 text-mint-400" />
              {plan.chain.length
                ? plan.chain.map((id) => engineLabel(id)).join(' · ')
                : t('studio.noEngine')}
              {plan.fallback && fallback && fallbackOptionEnabled ? (
                <span className="text-ink-500">({t('studio.fallbackArmed')})</span>
              ) : null}
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-500/20 bg-surface-1/70 px-3 py-1.5">
              <ShieldIcon className="size-3.5 text-iris-300" />
              {t('studio.keysServerSide')}
            </span>

            {uploadProgress !== null ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-iris-400/30 bg-iris-500/10 px-3 py-1.5 text-iris-300"
                aria-live="polite"
              >
                <SpinnerIcon className="size-3.5 animate-spin" />
                {t('studio.uploading', { percent: Math.round(uploadProgress * 100) })}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            {status === 'running' ? (
              <button
                type="button"
                onClick={cancelTranscription}
                className="rounded-2xl border border-ink-500/30 px-4 py-3 text-sm font-semibold text-ink-300 transition hover:border-rose-400/40 hover:text-rose-400"
              >
                {t('studio.cancel')}
              </button>
            ) : null}

            <button
              type="button"
              onClick={runTranscription}
              disabled={!canRun}
              title={
                canRun
                  ? t('studio.runHint')
                  : isRecordingBusy
                    ? t('studio.runHintRecording')
                    : t('studio.runHintNoAudio')
              }
              className="press-scale group inline-flex min-w-[13rem] items-center justify-center gap-2.5 rounded-2xl bg-iris-500 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_40px_-18px_rgba(111,108,255,0.9)] transition hover:bg-iris-400 active:translate-y-px disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-ink-500 disabled:shadow-none"
            >
              {status === 'running' ? (
                <>
                  <SparkIcon className="size-4 animate-pulse" />
                  {t('studio.running')}
                </>
              ) : (
                <>
                  <BoltIcon className="size-4 transition-transform group-hover:scale-110" />
                  {t('studio.run')}
                </>
              )}
            </button>
          </div>
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-ink-500">
          {healthChecked && plan.chain.length === 0
            ? t('studio.footerNoKeys', {
                keys: engines.map((entry) => entry.keyVar).join(', '),
              })
            : [
                t('studio.footerInline'),
                largeUploads.enabled
                  ? t('studio.footerBlob', {
                      inline: limits.maxUploadMb,
                      max: largeUploads.maxUploadMb,
                    })
                  : t('studio.footerLimit', { size: limits.maxUploadMb }),
              ].join(' ')}
        </p>

        {/*
          * Settings is the answer to both "nothing works" and "where did my key
          * go", so the link appears exactly in those two situations.
        */}
        {healthChecked && (plan.chain.length === 0 || keysFromSettings) ? (
          <p className="mt-2 text-[11px]">
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink-500/20 bg-surface-2/60 px-2.5 py-1.5 font-medium text-ink-200 transition hover:border-iris-400/40 hover:text-ink-100"
            >
              <KeyIcon className="size-3" />
              {keysFromSettings ? t('studio.manageKeys') : t('studio.connectEngine')}
            </Link>
          </p>
        ) : null}
      </section>

      {status === 'running' ? (
        <section
          className="glass-panel rounded-3xl border border-iris-400/25 p-4 sm:p-5"
          aria-label={t('transcript.running')}
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-iris-500/15 text-iris-300">
              <SpinnerIcon className="size-4 animate-spin" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink-100">
                  {uploadProgress !== null
                    ? t('studio.stage.uploading', { percent: Math.round(uploadProgress * 100) })
                    : stageText || t('transcript.running')}
                </p>
                {uploadProgress !== null ? (
                  <span className="font-mono text-sm font-semibold tabular-nums text-iris-300">
                    {Math.round(uploadProgress * 100)}%
                  </span>
                ) : (
                  <span className="text-xs text-ink-400">
                    {formatElapsed(elapsedMs)}
                  </span>
                )}
              </div>
              {uploadProgress !== null ? (
                <p className="mt-1 text-xs text-ink-400" dir="ltr">
                  {formatBytes(Math.min(audio?.size ?? 0, Math.round((audio?.size ?? 0) * uploadProgress)))}
                  {' / '}
                  {formatBytes(audio?.size ?? 0)}
                </p>
              ) : (
                <p className="mt-1 text-xs leading-relaxed text-ink-400">
                  {t('transcript.running')} · {formatElapsed(elapsedMs)}
                </p>
              )}
              <div
                className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-3"
                role="progressbar"
                aria-label={uploadProgress !== null
                  ? t('studio.stage.uploading', { percent: Math.round(uploadProgress * 100) })
                  : t('transcript.running')}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={uploadProgress !== null ? Math.round(uploadProgress * 100) : undefined}
              >
                {uploadProgress !== null ? (
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-iris-500 to-mint-400 transition-[width] duration-200"
                    style={{ width: `${Math.round(uploadProgress * 100)}%` }}
                  />
                ) : (
                  <div className="h-full w-1/3 animate-shimmer rounded-full bg-gradient-to-r from-iris-500/30 via-iris-300 to-mint-400/40 bg-[length:200%_100%]" />
                )}
              </div>
              {uploadProgress === null ? (
                <p className="mt-2 text-[11px] text-ink-500">
                  {t('studio.stage.long')}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <div ref={transcriptRef} className="scroll-mt-6">
        <TranscriptPanel
          status={status}
          result={result}
          error={error}
          text={text}
          onTextChange={setText}
          elapsedMs={elapsedMs}
          stageText={stageText}
          onRetry={runTranscription}
          onCancel={cancelTranscription}
          onClear={clearAll}
          showSpeakers={showSpeakers}
          showTimeline={showTimeline}
          speakerNames={speakerNames}
          speakers={speakers}
          onSpeakerNameChange={updateSpeakerName}
          onShowSpeakersChange={(checked) => updateTranscriptOptions({ showSpeakers: checked })}
          onShowTimelineChange={(checked) => updateTranscriptOptions({ showTimeline: checked })}
        />
      </div>

      <UsagePanel
        key={usageRefreshToken}
        engines={engines}
        engineOrder={engineOrder}
        enabled={usagePanelEnabled}
      />
    </div>
  );
}
