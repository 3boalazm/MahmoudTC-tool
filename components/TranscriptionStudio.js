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
import {
  BoltIcon,
  LayersIcon,
  ShieldIcon,
  SparkIcon,
  SpinnerIcon,
  WaveIcon,
} from '@/components/Icons';
import { useAudioSource } from '@/hooks/useAudioSource';
import {
  TranscriptionClientError,
  requestTranscription,
  uploadToBlob,
} from '@/lib/client/api';
import { engineLabel, formatBytes, formatDuration, modelLabel } from '@/lib/client/format';

const DEFAULT_AVAILABILITY = { deepgram: true, gladia: true };

export default function TranscriptionStudio() {
  /* ------------------------------------------------------------- settings */
  const [engine, setEngine] = useState('auto');
  const [fallback, setFallback] = useState(true);
  const [language, setLanguage] = useState('');
  const [availability, setAvailability] = useState(DEFAULT_AVAILABILITY);
  const [limits, setLimits] = useState({ maxUploadMb: 25 });
  /** Large-file mode (browser → Vercel Blob → provider URL) when configured. */
  const [largeUploads, setLargeUploads] = useState({ enabled: false });
  const [fallbackOptionEnabled, setFallbackOptionEnabled] = useState(true);
  const [healthChecked, setHealthChecked] = useState(false);

  /* -------------------------------------------------------------- runtime */
  const [status, setStatus] = useState('idle'); // idle | running | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [text, setText] = useState('');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRecordingBusy, setIsRecordingBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);

  const abortRef = useRef(null);
  const timerRef = useRef(null);
  const transcriptRef = useRef(null);

  const { audio, peaks, isDecoding, load, clear } = useAudioSource();

  /* ---------------------------------------------------- deployment probe */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/health', { cache: 'no-store' });
        const payload = await response.json();
        if (cancelled || !payload) return;
        setAvailability({
          deepgram: Boolean(payload.engines?.deepgram?.available ?? true),
          gladia: Boolean(payload.engines?.gladia?.available ?? true),
        });
        setFallbackOptionEnabled(Boolean(payload.features?.clientFallbackToggle ?? true));
        if (payload.limits?.maxUploadMb) {
          setLimits({
            maxUploadMb: payload.limits.maxUploadMb,
            platformBodyLimitMb: payload.limits.platformBodyLimitMb ?? null,
            maxDurationSeconds: payload.limits.maxDurationSeconds ?? null,
          });
        }
        setLargeUploads(
          payload.largeUploads?.enabled
            ? {
                enabled: true,
                maxUploadMb: payload.largeUploads.maxUploadMb ?? 200,
                deletedAfterUse: payload.largeUploads.deletedAfterUse ?? true,
              }
            : { enabled: false },
        );
        if (!payload.engines?.gladia?.available) setEngine((current) => (current === 'gladia' ? 'deepgram' : current));
        if (!payload.engines?.deepgram?.available) setEngine((current) => (current === 'deepgram' ? 'gladia' : current));
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
      const exceedsInline =
        audio.size > limits.maxUploadMb * 1024 * 1024 && largeUploads.enabled;

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
        audio: audioUrl ? undefined : audio.blob,
        audioUrl,
        filename: audio.name,
        engine,
        fallback: fallback && fallbackOptionEnabled,
        language,
        durationSeconds: audio.durationSeconds,
        signal: controller.signal,
      });

      setResult({ ...payload, sourceName: audio.name });
      setText(payload.text ?? '');
      setElapsedMs(payload.elapsedMs ?? Date.now() - startedAt);
      setStatus('done');
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
    setElapsedMs(0);
    setStatus('idle');
  }, [cancelTranscription, clear]);

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
  const plan = useMemo(() => {
    const order = engine === 'gladia' ? ['gladia', 'deepgram'] : ['deepgram', 'gladia'];
    const usable = order.filter((id) => availability[id]);
    if (!usable.length) return { chain: [], primary: null, fallback: null };
    if (engine !== 'auto' && !(fallback && fallbackOptionEnabled)) {
      return { chain: [engine], primary: engine, fallback: null };
    }
    return { chain: usable, primary: usable[0], fallback: usable[1] ?? null };
  }, [engine, availability, fallback, fallbackOptionEnabled]);

  const stageText = useMemo(() => {
    const seconds = elapsedMs / 1000;
    if (status !== 'running') return '';
    if (uploadProgress !== null) {
      return `Uploading to storage… ${Math.round(uploadProgress * 100)}%`;
    }
    if (seconds < 0.6) return 'Sending audio to the server proxy…';
    if (seconds < 2) return `Opening a stream to ${engineLabel(plan.primary)}…`;
    if (seconds < 12) return `Transcribing with ${modelLabel(plan.primary, plan.primary === 'deepgram' ? 'nova-2' : 'solaria-1')}…`;
    if (plan.fallback && seconds > 25) {
      return `Still working — ${engineLabel(plan.fallback)} fallback is available if ${engineLabel(plan.primary)} gives up…`;
    }
    return 'Still transcribing — long recordings can take a while…';
  }, [status, elapsedMs, plan, uploadProgress]);

  const canRun = Boolean(audio) && status !== 'running' && !isRecordingBusy && plan.chain.length > 0;

  return (
    <div id="studio" className="space-y-5">
      <AudioSourceCard
        audio={audio}
        peaks={peaks}
        isDecoding={isDecoding}
        onLoad={load}
        onClear={clear}
        disabled={status === 'running'}
        maxUploadMb={limits.maxUploadMb}
        largeUploads={largeUploads}
        onBusyChange={setIsRecordingBusy}
      />

      <EngineControls
        engine={engine}
        onEngineChange={setEngine}
        fallback={fallback}
        onFallbackChange={setFallback}
        language={language}
        onLanguageChange={setLanguage}
        availability={availability}
        fallbackOptionEnabled={fallbackOptionEnabled}
        disabled={status === 'running'}
      />

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
                  <span aria-hidden="true">·</span>
                  <span>{formatBytes(audio.size)}</span>
                  {audio.durationSeconds ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{formatDuration(audio.durationSeconds)}</span>
                    </>
                  ) : null}
                </>
              ) : (
                <span>No audio loaded yet</span>
              )}
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-500/20 bg-surface-1/70 px-3 py-1.5">
              <LayersIcon className="size-3.5 text-mint-400" />
              {plan.chain.length
                ? plan.chain.map((id) => engineLabel(id)).join('  →  ')
                : 'No engine available'}
              {plan.fallback && fallback && fallbackOptionEnabled ? (
                <span className="text-ink-500">(fallback armed)</span>
              ) : null}
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-500/20 bg-surface-1/70 px-3 py-1.5">
              <ShieldIcon className="size-3.5 text-iris-300" />
              Keys stay server-side
            </span>

            {uploadProgress !== null ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-iris-400/30 bg-iris-500/10 px-3 py-1.5 text-iris-300"
                aria-live="polite"
              >
                <SpinnerIcon className="size-3.5 animate-spin" />
                Uploading {Math.round(uploadProgress * 100)}%
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
                Cancel
              </button>
            ) : null}

            <button
              type="button"
              onClick={runTranscription}
              disabled={!canRun}
              title={
                canRun
                  ? 'Transcribe (⌘/Ctrl + Enter)'
                  : isRecordingBusy
                    ? 'Stop the recording first'
                    : 'Load or record some audio first'
              }
              className="group inline-flex min-w-[13rem] items-center justify-center gap-2.5 rounded-2xl bg-iris-500 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_40px_-18px_rgba(111,108,255,0.9)] transition hover:bg-iris-400 active:translate-y-px disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-ink-500 disabled:shadow-none"
            >
              {status === 'running' ? (
                <>
                  <SparkIcon className="size-4 animate-pulse" />
                  Transcribing…
                </>
              ) : (
                <>
                  <BoltIcon className="size-4 transition-transform group-hover:scale-110" />
                  Transcribe audio
                </>
              )}
            </button>
          </div>
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-ink-500">
          {healthChecked && !availability.deepgram && !availability.gladia
            ? 'No engine keys detected — add DEEPGRAM_API_KEY and/or GLADIA_API_KEY to .env.local and restart the dev server.'
            : [
                'Audio is sent to this app’s own API route and forwarded straight to the provider.',
                largeUploads.enabled
                  ? `Files up to ${limits.maxUploadMb} MB stream through the function; larger files (up to ${largeUploads.maxUploadMb} MB) upload directly to Vercel Blob and are deleted the moment transcription finishes.`
                  : `Maximum upload size: ${limits.maxUploadMb} MB.`,
              ].join(' ')}
        </p>
      </section>

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
        />
      </div>
    </div>
  );
}
