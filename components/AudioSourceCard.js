'use client';

/**
 * components/AudioSourceCard.js
 * ---------------------------------------------------------------------------
 * "Where is the audio coming from?" — file upload or microphone recording.
 * Both routes end in the same place: an in-memory clip handed to the parent,
 * ready to POST to `/api/transcribe`.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { LevelMeter, Waveform } from '@/components/Waveform';
import {
  AlertIcon,
  ClockIcon,
  FileAudioIcon,
  MicIcon,
  StopIcon,
  TrashIcon,
  UploadIcon,
  WaveIcon,
  XIcon,
} from '@/components/Icons';
import { useRecorder } from '@/hooks/useRecorder';
import { formatBytes, formatDuration } from '@/lib/client/format';

const FILE_ACCEPT =
  'audio/*,video/mp4,.mp3,.m4a,.wav,.webm,.ogg,.oga,.opus,.flac,.aac,.amr,.aiff,.aif,.mp4,.mov';

export default function AudioSourceCard({
  audio,
  peaks,
  isDecoding,
  onLoad,
  onClear,
  disabled = false,
  maxUploadMb = 25,
  /** { enabled, maxUploadMb } — large files go browser → Vercel Blob directly. */
  largeUploads = { enabled: false },
  onBusyChange,
}) {
  const [tab, setTab] = useState('file');
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState(null);
  const inputRef = useRef(null);

  const recorder = useRecorder();

  /**
   * What the picker may accept. With a Blob store connected the ceiling becomes
   * the store's limit, because oversized files bypass the function entirely;
   * otherwise it is the serverless-safe inline limit.
   */
  const effectiveMaxMb = largeUploads.enabled
    ? Math.max(maxUploadMb, largeUploads.maxUploadMb ?? maxUploadMb)
    : maxUploadMb;

  /* Tell the parent when recording is in progress so it can lock the UI. */
  useEffect(() => {
    onBusyChange?.(recorder.isRecording);
  }, [recorder.isRecording, onBusyChange]);

  /* ------------------------------------------------------------------ file */
  const acceptFile = useCallback(
    (file) => {
      if (!file) return;
      setFileError(null);

      if (file.size === 0) {
        setFileError('That file is empty.');
        return;
      }
      if (file.size > effectiveMaxMb * 1024 * 1024) {
        setFileError(
          `${formatBytes(file.size)} exceeds the ${effectiveMaxMb} MB limit. Trim the audio${
            largeUploads.enabled ? '' : ', connect a Vercel Blob store, or raise MAX_UPLOAD_MB'
          }.`,
        );
        return;
      }
      if (file.type && !/^(audio|video)\//.test(file.type) && !/\.[a-z0-9]+$/i.test(file.name)) {
        setFileError('That does not look like an audio file. Try MP3, WAV, M4A, WebM or OGG.');
        return;
      }

      onLoad(file, {
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        origin: 'file',
      });
    },
    [effectiveMaxMb, largeUploads.enabled, onLoad],
  );

  /* Adopt a finished recording automatically — no extra click needed. */
  const adoptedUrlRef = useRef(null);
  useEffect(() => {
    const captured = recorder.recording;
    if (!captured || adoptedUrlRef.current === captured.url) return;
    adoptedUrlRef.current = captured.url;
    onLoad(captured.blob, {
      name: `recording-${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.${captured.extension}`,
      mimeType: captured.mimeType,
      durationSeconds: captured.durationSeconds,
      origin: 'recording',
    });
  }, [recorder.recording, onLoad]);

  const clearAll = useCallback(() => {
    adoptedUrlRef.current = null;
    recorder.discard();
    setFileError(null);
    onClear();
    if (inputRef.current) inputRef.current.value = '';
  }, [onClear, recorder]);

  const isLocked = disabled || recorder.isRecording;
  const isActive = recorder.status === 'recording' || recorder.status === 'paused';

  return (
    <section
      id="source"
      className="glass-panel animate-rise rounded-4xl p-5 shadow-[0_28px_80px_-40px_rgba(0,0,0,0.9)] sm:p-6"
      aria-labelledby="source-heading"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-iris-500/15 text-iris-300 ring-1 ring-iris-400/25">
            <WaveIcon className="size-5" />
          </span>
          <div>
            <h2 id="source-heading" className="text-base font-semibold text-ink-100">
              1 · Choose your audio
            </h2>
            <p className="text-sm text-ink-400">
              Upload a file or record straight from your microphone.
            </p>
          </div>
        </div>

        {audio ? (
          <button
            type="button"
            onClick={clearAll}
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-xl border border-ink-500/25 px-3 py-1.5 text-xs font-medium text-ink-300 transition hover:border-rose-400/40 hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <TrashIcon className="size-3.5" />
            Clear audio
          </button>
        ) : null}
      </header>

      {/* ---------------------------------------------------------- tabs */}
      <div
        role="tablist"
        aria-label="Audio source"
        className="mt-5 grid grid-cols-2 gap-1.5 rounded-2xl bg-surface-1/70 p-1.5 ring-1 ring-inset ring-ink-500/15"
      >
        <TabButton
          active={tab === 'file'}
          onClick={() => setTab('file')}
          disabled={isLocked}
          icon={<UploadIcon className="size-4" />}
          label="Upload file"
          hint="MP3, WAV, M4A, WebM…"
          panelId="panel-file"
        />
        <TabButton
          active={tab === 'record'}
          onClick={() => setTab('record')}
          disabled={isLocked}
          icon={<MicIcon className="size-4" />}
          label="Record live"
          hint="Browser microphone"
          panelId="panel-record"
        />
      </div>

      {/* ------------------------------------------------------ upload tab */}
      <div
        id="panel-file"
        role="tabpanel"
        aria-labelledby="tab-file"
        hidden={tab !== 'file'}
        className="mt-4"
      >
        <div
          onDragOver={(event) => {
            event.preventDefault();
            if (!isLocked) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            if (isLocked) return;
            acceptFile(event.dataTransfer?.files?.[0]);
          }}
          className={`relative rounded-3xl border border-dashed px-6 py-9 text-center transition ${
            isDragging
              ? 'border-iris-400 bg-iris-500/10'
              : 'border-ink-500/30 bg-surface-1/50 hover:border-iris-400/45 hover:bg-surface-2/60'
          } ${isLocked ? 'opacity-60' : ''}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={FILE_ACCEPT}
            className="sr-only"
            onChange={(event) => {
              acceptFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-iris-500/15 text-iris-300 ring-1 ring-iris-400/25">
            <UploadIcon className="size-6" />
          </div>
          <p className="mt-4 text-sm font-medium text-ink-200">
            Drop audio here, or{' '}
            <button
              type="button"
              disabled={isLocked}
              onClick={() => inputRef.current?.click()}
              className="rounded font-semibold text-iris-300 underline decoration-iris-400/40 decoration-2 underline-offset-4 transition hover:text-iris-200 disabled:cursor-not-allowed"
            >
              browse your files
            </button>
          </p>
          <p className="mt-2 text-xs text-ink-400">
            MP3 · WAV · M4A · WebM · OGG · FLAC · AAC — up to {effectiveMaxMb} MB
          </p>
          {largeUploads.enabled ? (
            <p className="mt-1.5 text-[11px] text-ink-500">
              Files above {maxUploadMb} MB upload directly to Vercel Blob and are deleted as soon as
              transcription finishes.
            </p>
          ) : null}
        </div>

        {fileError ? <InlineError message={fileError} /> : null}
      </div>

      {/* ------------------------------------------------------ record tab */}
      <div
        id="panel-record"
        role="tabpanel"
        aria-labelledby="tab-record"
        hidden={tab !== 'record'}
        className="mt-4"
      >
        {!recorder.isSupported ? (
          <InlineError message="This browser cannot record audio (MediaRecorder is unavailable). Upload a file instead." />
        ) : (
          <div className="rounded-3xl border border-ink-500/20 bg-surface-1/50 p-5">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => (isActive ? recorder.stop() : recorder.start())}
                  disabled={disabled && !isActive}
                  aria-label={isActive ? 'Stop recording' : 'Start recording'}
                  className={`relative grid size-16 shrink-0 place-items-center rounded-full transition focus-visible:outline-offset-4 disabled:cursor-not-allowed disabled:opacity-50 ${
                    isActive
                      ? 'bg-rose-500 text-white'
                      : 'bg-iris-500 text-white hover:bg-iris-400'
                  }`}
                >
                  {isActive ? (
                    <>
                      <span className="absolute inset-0 animate-halo rounded-full bg-rose-500/45" />
                      <StopIcon className="relative size-6" />
                    </>
                  ) : (
                    <MicIcon className="size-6" />
                  )}
                </button>

                <div>
                  <p
                    className="font-mono text-2xl font-semibold tabular-nums text-ink-100"
                    aria-live="off"
                  >
                    {formatDuration(recorder.elapsed)}
                  </p>
                  <p className="text-xs text-ink-400" role="status">
                    {recorder.status === 'requesting'
                      ? 'Waiting for microphone permission…'
                      : recorder.status === 'paused'
                        ? 'Paused — resume or stop to finish'
                        : recorder.status === 'stopping'
                          ? 'Finishing up…'
                          : recorder.status === 'recording'
                            ? 'Recording… speak naturally'
                            : 'Press the microphone to start'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={recorder.togglePause}
                  disabled={!isActive || recorder.status === 'stopping'}
                  className="rounded-xl border border-ink-500/25 px-3 py-2 text-xs font-medium text-ink-300 transition hover:border-iris-400/40 hover:text-ink-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {recorder.status === 'paused' ? 'Resume' : 'Pause'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    recorder.stop();
                  }}
                  disabled={!isActive}
                  className="rounded-xl border border-ink-500/25 px-3 py-2 text-xs font-medium text-ink-300 transition hover:border-rose-400/40 hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Stop
                </button>
              </div>
            </div>

            <div className="mt-5">
              <LevelMeter levels={recorder.levels} isActive={isActive} />
              <p className="mt-2 text-center text-[11px] text-ink-500">
                Live input level — if the bars barely move, check your microphone.
              </p>
            </div>

            {recorder.error ? (
              <InlineError
                message={recorder.error}
                onDismiss={recorder.clearError}
              />
            ) : null}

            {recorder.recording && audio?.origin === 'recording' ? (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-mint-500/25 bg-mint-500/10 px-4 py-3">
                <p className="text-xs text-mint-400">
                  Recording captured ({formatDuration(recorder.recording.durationSeconds)}) and
                  attached below.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    adoptedUrlRef.current = null;
                    recorder.discard();
                    onClear();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-mint-500/30 px-2.5 py-1 text-[11px] font-medium text-mint-400 transition hover:bg-mint-500/15"
                >
                  <XIcon className="size-3" />
                  Record again
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* --------------------------------------------------- loaded audio */}
      {audio ? (
        <div className="mt-5 rounded-3xl border border-ink-500/20 bg-surface-1/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-mint-500/15 text-mint-400 ring-1 ring-mint-500/25">
                <FileAudioIcon className="size-4.5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink-100" title={audio.name}>
                  {audio.name}
                </p>
                <p className="flex items-center gap-2 text-[11px] text-ink-400">
                  <span>{formatBytes(audio.size)}</span>
                  <span aria-hidden="true">•</span>
                  <span className="inline-flex items-center gap-1">
                    <ClockIcon className="size-3" />
                    {audio.durationSeconds
                      ? formatDuration(audio.durationSeconds)
                      : isDecoding
                        ? 'analysing…'
                        : 'unknown'}
                  </span>
                  {audio.origin === 'recording' ? (
                    <>
                      <span aria-hidden="true">•</span>
                      <span className="text-mint-400">microphone</span>
                    </>
                  ) : null}
                </p>
              </div>
            </div>

            <audio
              src={audio.url}
              controls
              preload="metadata"
              className="h-9 w-full max-w-[16rem] [color-scheme:dark]"
            >
              Your browser does not support audio playback.
            </audio>
          </div>

          <Waveform peaks={peaks} isDecoding={isDecoding} className="mt-4" height={52} />
        </div>
      ) : null}
    </section>
  );
}

function TabButton({ active, onClick, disabled, icon, label, hint, panelId }) {
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${panelId.replace('panel-', '')}`}
      aria-selected={active}
      aria-controls={panelId}
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? 'bg-surface-3 text-ink-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
          : 'text-ink-400 hover:bg-surface-2/70 hover:text-ink-200'
      }`}
    >
      <span className={active ? 'text-iris-300' : ''}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block truncate text-[11px] text-ink-500">{hint}</span>
      </span>
    </button>
  );
}

function InlineError({ message, onDismiss }) {
  return (
    <div
      role="alert"
      className="mt-3 flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-400"
    >
      <AlertIcon className="mt-0.5 size-4 shrink-0" />
      <p className="flex-1 leading-relaxed">{message}</p>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="rounded p-0.5 text-rose-400/80 transition hover:text-rose-400"
        >
          <XIcon className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
