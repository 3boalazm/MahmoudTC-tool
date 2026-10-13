/**
 * lib/client/format.js
 * ---------------------------------------------------------------------------
 * Presentation helpers shared by the client components. Pure functions only —
 * safe to import from anywhere, easy to unit test.
 */

// Relative (not `@/`) so this module also runs under bare `node --test`.
import { ENGINE_MAP } from '../engines-meta.js';

/** 74 → "01:14", 3725 → "1:02:05" */
export function formatDuration(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '00:00';
  const seconds = Math.floor(totalSeconds % 60);
  const minutes = Math.floor((totalSeconds / 60) % 60);
  const hours = Math.floor(totalSeconds / 3600);
  const pad = (value) => String(value).padStart(2, '0');
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

/** 1_234_567 → "1.2 MB" */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** index;
  // Whole numbers stay whole ("2 KB"); fractions keep one decimal ("1.5 MB").
  const rounded = Math.round(value * 10) / 10;
  const pretty = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${pretty} ${units[index]}`;
}

/** 1250 → "1.3s" */
export function formatElapsed(milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return '—';
  if (milliseconds < 1000) return `${Math.round(milliseconds)}ms`;
  return `${(milliseconds / 1000).toFixed(milliseconds < 10_000 ? 1 : 0)}s`;
}

/** Aggregate counts shown under the transcript. */
export function analyseText(text) {
  const value = typeof text === 'string' ? text : '';
  const trimmed = value.trim();
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];
  const sentences = trimmed ? trimmed.split(/[.!?…]+(?:\s|$)/).filter((s) => s.trim()).length : 0;
  const paragraphs = trimmed ? trimmed.split(/\n{2,}/).filter((s) => s.trim()).length : 0;
  const readingSeconds = Math.round((words.length / 200) * 60); // 200 wpm
  return {
    characters: value.length,
    charactersNoSpaces: value.replace(/\s/g, '').length,
    words: words.length,
    sentences,
    paragraphs,
    readingTime: formatDuration(readingSeconds),
  };
}

/** `0.9134` → "91%" */
export function formatConfidence(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return `${Math.round(value * 100)}%`;
}

/**
 * Turn an engine id into a human label. Engine names live in one place
 * (`lib/engines-meta.js`) so a new provider never needs a second edit here.
 */
export function engineLabel(engine) {
  if (engine === 'auto') return 'Auto';
  if (!engine || engine === 'none') return '—';
  return ENGINE_MAP[engine]?.label ?? engine;
}

/** "Deepgram Nova-2", falling back to just the engine name. */
export function modelLabel(engine, model) {
  if (engine === 'auto') return model ? `Auto · ${model}` : 'Auto';
  const meta = ENGINE_MAP[engine];
  if (!meta) return engineLabel(engine);
  const pretty = model
    ? meta.prettyModels?.[model] ?? model
    : meta.shortModel ?? null;
  return pretty ? `${meta.label} ${pretty}` : meta.label;
}

/**
 * Format provider segments as readable transcript chunks.
 * Groups roughly two sentences together (or up to 12 seconds), while keeping
 * speaker turns separate when requested and showing only real provider times.
 */
export function formatTranscriptSegments(
  segments = [],
  fallbackText = '',
  { showSpeakers = true, showTimeline = true, speakerLabel = (number) => `Speaker ${number}` } = {},
) {
  const usable = (Array.isArray(segments) ? segments : [])
    .filter((segment) => typeof segment?.text === 'string' && segment.text.trim());
  if (!usable.length) {
    const sentences = String(fallbackText || '').trim().match(/[^.!?؟。]+[.!?؟。]?/g) || [];
    const chunks = [];
    for (let index = 0; index < sentences.length; index += 2) {
      const chunk = sentences.slice(index, index + 2).join(' ').trim();
      if (chunk) chunks.push(chunk);
    }
    return chunks.join('\n\n') || String(fallbackText || '').trim();
  }

  const speakerNumbers = new Map();
  const groups = [];
  let current = null;
  const flush = () => {
    if (!current) return;
    const text = current.text.trim().replace(/\s+([,.;!?،؛؟])/g, '$1');
    if (text) groups.push({ ...current, text });
    current = null;
  };

  for (const segment of usable) {
    const speaker = segment.speaker ?? null;
    const start = Number.isFinite(segment.start) ? segment.start : null;
    const end = Number.isFinite(segment.end) ? segment.end : null;
    const sentenceCount = (current?.text.match(/[.!?؟。](?=\s|$)/g) || []).length;
    const speakerChanged = showSpeakers && current && current.speaker !== speaker;
    const tooManySentences = current && sentenceCount >= 2;
    const tooLong = current && start !== null && current.start !== null && start - current.start >= 12;
    if (speakerChanged || tooManySentences || tooLong) flush();

    if (!current) current = { text: '', speaker, start, end };
    const nextText = segment.text.trim();
    current.text = current.text ? `${current.text} ${nextText}` : nextText;
    if (current.start === null && start !== null) current.start = start;
    if (end !== null) current.end = end;
  }
  flush();

  return groups.map((group) => {
    const lines = [];
    if (showTimeline && group.start !== null && group.end !== null && group.end >= group.start) {
      lines.push(`[${formatDuration(group.start)}–${formatDuration(group.end)}]`);
    }
    if (showSpeakers && group.speaker !== null && group.speaker !== undefined && group.speaker !== '') {
      if (!speakerNumbers.has(group.speaker)) speakerNumbers.set(group.speaker, speakerNumbers.size + 1);
      lines.push(speakerLabel(speakerNumbers.get(group.speaker)));
    }
    lines.push(group.text);
    return lines.join('\n');
  }).join('\n\n');
}

/** SRT timestamp: 00:00:01,250 */
function srtTime(seconds) {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe / 60) % 60);
  const secs = Math.floor(safe % 60);
  const millis = Math.round((safe - Math.floor(safe)) * 1000);
  const pad = (value, size = 2) => String(value).padStart(size, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad(millis, 3)}`;
}

/**
 * Build an SRT subtitle file from the timed segments a provider returned.
 * Returns `null` when the engine gave no timings (nothing useful to export).
 */
export function buildSrt(segments = [], { showSpeakers = true, speakerLabel = (number) => `Speaker ${number}` } = {}) {
  const usable = segments.filter(
    (segment) => segment?.text && Number.isFinite(segment.end) && segment.end > 0,
  );
  if (!usable.length) return null;

  const speakerNumbers = new Map();
  return usable
    .map((segment, index) => {
      const start = Number.isFinite(segment.start) ? segment.start : 0;
      let caption = segment.text.trim();
      if (showSpeakers && segment.speaker !== null && segment.speaker !== undefined && segment.speaker !== '') {
        if (!speakerNumbers.has(segment.speaker)) {
          speakerNumbers.set(segment.speaker, speakerNumbers.size + 1);
        }
        caption = `${speakerLabel(speakerNumbers.get(segment.speaker))}: ${caption}`;
      }
      return [
        String(index + 1),
        `${srtTime(start)} --> ${srtTime(Math.max(segment.end, start + 0.4))}`,
        caption,
        '',
      ].join('\n');
    })
    .join('\n');
}

/** Build a plain-text transcript with light paragraph wrapping. */
export function buildPlainText(text, { wrapAt = 0 } = {}) {
  const value = (text || '').trim();
  if (!wrapAt) return value;
  return value
    .split(/\n{2,}/)
    .map((paragraph) => {
      const words = paragraph.split(/\s+/).filter(Boolean);
      const lines = [];
      let line = '';
      for (const word of words) {
        if ((line + ' ' + word).trim().length > wrapAt) {
          lines.push(line.trim());
          line = word;
        } else {
          line = `${line} ${word}`;
        }
      }
      if (line.trim()) lines.push(line.trim());
      return lines.join('\n');
    })
    .join('\n\n');
}

/** Trigger a browser download without leaking a link element. */
export function downloadFile(filename, contents, mimeType = 'text/plain') {
  const blob = new Blob([contents], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

/**
 * Copy text to the clipboard, falling back to a hidden textarea on browsers
 * (or non-HTTPS origins) where `navigator.clipboard` is unavailable.
 */
export async function copyToClipboard(text) {
  const value = text ?? '';
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      /* fall through to the legacy path */
    }
  }
  if (typeof document === 'undefined') return false;
  try {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    textarea.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Derive a tidy base filename for exports: "interview.m4a" → "interview". */
export function baseName(name) {
  const value = (name || 'transcript').replace(/\.[^./\\]+$/, '');
  return value.replace(/[^\w\-. ]+/g, '_').slice(0, 60) || 'transcript';
}
