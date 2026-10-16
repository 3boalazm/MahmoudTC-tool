'use client';

/**
 * components/TranscriptPanel.js
 * ---------------------------------------------------------------------------
 * The output side of the studio: status, transcript, quality metrics, export.
 *
 * States: idle → running → done | error. Each one is fully designed rather than
 * a bare conditional, and the transcript stays editable so users can fix a name
 * or a number before exporting.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useI18n } from '@/components/providers/I18nProvider.js';
import { ENGINE_MAP } from '@/lib/engines-meta.js';

import {
  AlertIcon,
  BoltIcon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  DownloadIcon,
  GlobeIcon,
  SpinnerIcon,
  SparkIcon,
  TrashIcon,
  WaveIcon,
  XIcon,
} from '@/components/Icons';
import {
  analyseText,
  baseName,
  buildPlainText,
  buildSrt,
  copyToClipboard,
  downloadFile,
  engineLabel,
  formatConfidence,
  formatDuration,
  formatElapsed,
  modelLabel,
} from '@/lib/client/format';

export default function TranscriptPanel({
  status,
  result,
  error,
  text,
  onTextChange,
  elapsedMs = 0,
  stageText = '',
  onRetry,
  onClear,
  onCancel,
  showSpeakers,
  showTimeline,
  speakerNames = {},
  speakers = [],
  onSpeakerNameChange,
  onMergeSpeakers,
  onShowSpeakersChange,
  onShowTimelineChange,
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const stats = useMemo(() => analyseText(text), [text]);
  const isDone = status === 'done';
  const isRunning = status === 'running';
  const isError = status === 'error';

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(text);
    setCopied(ok);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1_800);
  }, [text]);

  const fileName = baseName(result?.sourceName);

  const handleDownloadText = useCallback(() => {
    downloadFile(`${fileName}.txt`, buildPlainText(text, { wrapAt: 90 }));
  }, [fileName, text]);

  const srt = useMemo(() => (isDone ? buildSrt(result?.segments, { showSpeakers, speakerLabel: (number) => { const speaker = speakers[number - 1]; return speakerNames[speaker?.id]?.trim() || t('transcript.speaker', { number }); } }) : null), [isDone, result?.segments, showSpeakers, speakerNames, t]);
  const handleDownloadSrt = useCallback(() => {
    if (srt) downloadFile(`${fileName}.srt`, srt, 'application/x-subrip');
  }, [fileName, srt]);

  return (
    <section
      id="transcript"
      className="glass-panel animate-rise rounded-4xl p-5 shadow-[0_28px_80px_-40px_rgba(0,0,0,0.9)] sm:p-6"
      aria-labelledby="transcript-heading"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-iris-500/15 text-iris-300 ring-1 ring-iris-400/25">
            <SparkIcon className="size-5" />
          </span>
          <div>
            <h2 id="transcript-heading" className="text-base font-semibold text-ink-100">
              {t('transcript.heading')}
            </h2>
            <p className="text-sm text-ink-400">{t('transcript.subheading')}</p>
          </div>
        </div>

        {isDone ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="shine hover-lift press-scale inline-flex items-center gap-2 rounded-xl bg-iris-500 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-iris-400 active:translate-y-px"
            >
              {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
              {copied ? t('transcript.copied') : t('transcript.copy')}
            </button>
            <button
              type="button"
              onClick={handleDownloadText}
              className="inline-flex items-center gap-2 rounded-xl border border-ink-500/25 px-3 py-2 text-xs font-medium text-ink-300 transition hover:border-iris-400/40 hover:text-ink-100"
            >
              <DownloadIcon className="size-3.5" />
              .txt
            </button>
            <button
              type="button"
              onClick={handleDownloadSrt}
              disabled={!srt}
              title={srt ? t('transcript.srtHint') : t('transcript.srtUnavailable')}
              className="inline-flex items-center gap-2 rounded-xl border border-ink-500/25 px-3 py-2 text-xs font-medium text-ink-300 transition hover:border-iris-400/40 hover:text-ink-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <DownloadIcon className="size-3.5" />
              .srt
            </button>
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-2 rounded-xl border border-ink-500/25 px-3 py-2 text-xs font-medium text-ink-300 transition hover:border-rose-400/40 hover:text-rose-400"
            >
              <TrashIcon className="size-3.5" />
              {t('transcript.clear')}
            </button>
          </div>
        ) : null}
      </header>

      {/* --------------------------------------------------------- status */}
      <div className="mt-5" aria-live="polite" aria-busy={isRunning}>
        {isRunning ? <RunningState stageText={stageText} elapsedMs={elapsedMs} onCancel={onCancel} /> : null}

        {isError ? <ErrorState error={error} onRetry={onRetry} /> : null}

        {status === 'idle' ? <IdleState /> : null}

        {isDone ? (
          <>
            {result?.fallbackUsed ? (
              <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-400">
                <BoltIcon className="mt-0.5 size-4 shrink-0" />
                <p className="leading-relaxed">
                  {t('transcript.fallbackNotice')}{' '}
                  <span className="font-mono uppercase tracking-wide">
                    {modelLabel(result.engine, result.model)}
                  </span>
                </p>
              </div>
            ) : null}

            <StatGrid stats={stats} result={result} />

            <div className="mt-4 flex flex-wrap gap-3 rounded-2xl border border-ink-500/20 bg-surface-1/50 p-3">
              <label className="inline-flex cursor-pointer items-start gap-2.5 text-sm text-ink-200">
                <input
                  type="checkbox"
                  checked={showSpeakers}
                  onChange={(event) => onShowSpeakersChange(event.target.checked)}
                  className="mt-0.5 size-4 accent-[var(--color-iris-400)]"
                  aria-label={t('transcript.options.speakers')}
                />
                <span>
                  <span className="block font-medium">{t('transcript.options.speakers')}</span>
                  <span className="block text-xs text-ink-400">{t('transcript.options.speakersHint')}</span>
                </span>
              </label>
              <label className="inline-flex cursor-pointer items-start gap-2.5 text-sm text-ink-200">
                <input
                  type="checkbox"
                  checked={showTimeline}
                  onChange={(event) => onShowTimelineChange(event.target.checked)}
                  className="mt-0.5 size-4 accent-[var(--color-iris-400)]"
                  aria-label={t('transcript.options.timeline')}
                />
                <span>
                  <span className="block font-medium">{t('transcript.options.timeline')}</span>
                  <span className="block text-xs text-ink-400">{t('transcript.options.timelineHint')}</span>
                </span>
              </label>
            </div>
            {showSpeakers && speakers.length > 0 ? (
              <section className="mt-4 rounded-2xl border border-iris-400/25 bg-iris-500/5 p-4" aria-labelledby="speaker-names-heading">
                <div className="mb-3">
                  <h3 id="speaker-names-heading" className="text-sm font-semibold text-ink-100">
                    {t('transcript.speakerNames.heading')}
                  </h3>
                  <p className="mt-1 text-xs text-ink-400">
                    {t('transcript.speakerNames.hint')}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {speakers.map(({ id, number }) => (
                    <div key={number} className="min-w-0 rounded-xl border border-ink-500/15 p-3">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-medium text-ink-300">{t('transcript.speaker', { number })}</span>
                        <input
                          type="text"
                          value={speakerNames[id] ?? ''}
                          onChange={(event) => onSpeakerNameChange(id, event.target.value)}
                          placeholder={t('transcript.speakerNames.placeholder', { number })}
                          maxLength={80}
                          className="w-full rounded-xl border border-ink-500/20 bg-surface-1/80 px-3 py-2.5 text-sm text-ink-100 outline-none transition placeholder:text-ink-500 focus:border-iris-400/60"
                        />
                      </label>
                      {speakers.length > 1 ? (
                        <label className="mt-2 block">
                          <span className="mb-1 block text-[11px] text-ink-400">This is the same person as…</span>
                          <select defaultValue="" onChange={(event) => { if (event.target.value !== '') onMergeSpeakers(id, event.target.value); event.target.value = ''; }} className="w-full rounded-lg border border-ink-500/20 bg-surface-2 px-2.5 py-2 text-xs text-ink-100">
                            <option value="">Keep separate</option>
                            {speakers.filter((other) => String(other.id) !== String(id)).map((other) => (
                              <option key={String(other.id)} value={String(other.id)}>{t('transcript.speaker', { number: other.number })}</option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
            <div className="relative mt-4">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(event) => onTextChange(event.target.value)}
                spellCheck="true"
                aria-label={t('transcript.ariaLabel')}
                className="min-h-[18rem] w-full resize-y rounded-2xl border border-ink-500/20 bg-surface-1/80 p-4 text-[15px] leading-7 text-ink-100 shadow-inner transition placeholder:text-ink-500 focus:border-iris-400/60 focus:bg-surface-1 focus:outline-none sm:min-h-[22rem]"
                placeholder={t('transcript.placeholder')}
              />
              <div className="pointer-events-none absolute bottom-3 end-3 rounded-lg bg-surface-3/80 px-2 py-1 text-[10px] font-medium text-ink-400 backdrop-blur">
                {stats.words.toLocaleString()} {t('transcript.stats.words')} ·{' '}
                {stats.characters.toLocaleString()} {t('transcript.stats.characters')}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Sub-states                                                                  */
/* -------------------------------------------------------------------------- */

function IdleState() {
  const { t } = useI18n();

  return (
    <div className="rounded-2xl border border-dashed border-ink-500/25 bg-surface-1/40 px-6 py-10 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-surface-2 text-ink-400 ring-1 ring-ink-500/20">
        <WaveIcon className="size-5" />
      </div>
      <p className="mt-4 text-sm font-medium text-ink-200">{t('transcript.emptyTitle')}</p>
      <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-ink-400">
        {t('transcript.emptyBody').split(t('transcript.action')).map((part, index, all) => (
          <span key={index}>
            {part}
            {index < all.length - 1 ? (
              <span className="font-medium text-ink-300">{t('transcript.action')}</span>
            ) : null}
          </span>
        ))}
      </p>
    </div>
  );
}

function RunningState({ stageText, elapsedMs, onCancel }) {
  const { t } = useI18n();

  return (
    <div className="rounded-2xl border border-iris-400/25 bg-iris-500/8 p-5">
      <div className="flex items-center gap-3">
        <SpinnerIcon className="size-5 animate-spin text-iris-300" />
        <div className="flex-1">
          <p className="text-sm font-medium text-ink-100">
            {stageText || t('transcript.running')}
          </p>
          <p className="text-[11px] text-ink-400">
            <span dir="ltr" className="font-mono">
              {formatElapsed(elapsedMs)}
            </span>{' '}
            · {t('transcript.stats.processed')}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-xl border border-ink-500/25 px-3 py-1.5 text-xs font-medium text-ink-300 transition hover:border-rose-400/40 hover:text-rose-400"
        >
          <XIcon className="size-3" />
          {t('common.cancel')}
        </button>
      </div>

      <div className="mt-5 space-y-2.5" aria-hidden="true">
        {[92, 78, 86, 64, 71].map((width, index) => (
          <div
            key={index}
            className="h-2.5 animate-shimmer rounded-full bg-gradient-to-r from-surface-3 via-ink-500/30 to-surface-3 bg-[length:200%_100%]"
            style={{ width: `${width}%`, animationDelay: `${index * 120}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ error, onRetry }) {
  const { t } = useI18n();
  const attempts = error?.attempts ?? [];

  /** Prefer the translated message for the code the server returned. */
  const localized = error?.code ? t(`errors.code.${error.code}`) : null;
  const message =
    localized && localized !== `errors.code.${error.code}`
      ? localized
      : error?.message || t('transcript.failedBody');

  return (
    <div
      role="alert"
      className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-300"
    >
      <div className="flex items-start gap-3">
        <AlertIcon className="mt-0.5 size-5 shrink-0 text-rose-400" />
        <div className="flex-1">
          <p className="font-semibold text-rose-400">{t('transcript.failedTitle')}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-rose-300/90">{message}</p>
          {error?.code ? (
            <p className="mt-2 font-mono text-[11px] text-rose-400/80">code: {error.code}</p>
          ) : null}
          {error?.detail ? (
            <details className="mt-3 rounded-xl border border-rose-400/20 bg-black/10 p-3 text-xs text-rose-200/90">
              <summary className="cursor-pointer select-none font-medium">Provider diagnostic details</summary>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">{error.detail}</pre>
            </details>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-xl border border-rose-400/40 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/15"
        >
          {t('common.retry')}
        </button>
      </div>

      {attempts.length ? (
        <ul className="mt-4 space-y-1.5 border-t border-rose-500/20 pt-3">
          {attempts.map((attempt) => (
            <li
              key={`${attempt.engine}-${attempt.code}`}
              className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-rose-300/85"
            >
              <span className="font-mono uppercase tracking-wide text-rose-400">
                {engineLabel(attempt.engine)}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{attempt.code}</span>
              <span aria-hidden="true">·</span>
              <span>
                {(() => {
                  const reason = t(`errors.code.${attempt.code}`);
                  return reason.startsWith('errors.code.') ? attempt.reason : reason;
                })()}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function StatGrid({ stats, result }) {
  const { t } = useI18n();

  const items = [
    { label: t('transcript.stats.words'), value: stats.words.toLocaleString() },
    { label: t('transcript.stats.characters'), value: stats.characters.toLocaleString() },
    { label: t('transcript.stats.sentences'), value: stats.sentences.toLocaleString() },
    { label: t('transcript.stats.readTime'), value: stats.readingTime },
  ];

  const meta = [
    {
      icon: BoltIcon,
      label: t('transcript.stats.engine'),
      value: modelLabel(result?.engine, result?.model),
      // Colour follows the engine registry, so a new engine needs no edit here.
      tone: ENGINE_MAP[result?.engine]?.accent === 'mint' ? 'mint' : 'iris',
    },
    result?.language
      ? {
          icon: GlobeIcon,
          label: t('transcript.stats.language'),
          value: result.language.toUpperCase(),
        }
      : null,
    result?.audioSeconds
      ? {
          icon: ClockIcon,
          label: t('transcript.stats.audio'),
          value: formatDuration(result.audioSeconds),
        }
      : null,
    result?.elapsedMs
      ? {
          icon: SpinnerIcon,
          label: t('transcript.stats.processed'),
          value: formatElapsed(result.elapsedMs),
        }
      : null,
    formatConfidence(result?.confidence)
      ? {
          icon: CheckIcon,
          label: t('transcript.stats.confidence'),
          value: formatConfidence(result.confidence),
        }
      : null,
  ].filter(Boolean);

  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-ink-500/15 bg-surface-1/60 px-3.5 py-2.5"
          >
            <dt className="text-[10px] font-medium uppercase tracking-wider text-ink-500">
              {item.label}
            </dt>
            <dd className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-ink-100">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap gap-2">
        {meta.map((item) => {
          const Icon = item.icon;
          const tone =
            item.tone === 'mint'
              ? 'border-mint-500/30 bg-mint-500/10 text-mint-400'
              : 'border-ink-500/20 bg-surface-2/70 text-ink-300';
          return (
            <span
              key={item.label}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${tone}`}
            >
              <Icon className="size-3" />
              <span className="text-ink-500">{item.label}</span>
              <span className="font-medium">{item.value}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
