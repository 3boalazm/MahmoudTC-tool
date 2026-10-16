/**
 * lib/client/api.js
 * ---------------------------------------------------------------------------
 * Thin client for the transcription API. Owns two contracts:
 *
 *   1. `requestTranscription` — POST /api/transcribe, with the audio either
 *      inline (multipart) or as a remote `audioUrl` for large files.
 *   2. `uploadToBlob` — browser → Vercel Blob direct upload, which is how a
 *      file bigger than the serverless 4.5 MB body limit reaches the provider.
 *
 * Every failure is normalised into a `TranscriptionClientError`, so the UI never
 * has to defensively parse provider payloads.
 */

export class TranscriptionClientError extends Error {
  constructor(message, { code = 'CLIENT_ERROR', status = 0, attempts = [], detail } = {}) {
    super(message);
    this.name = 'TranscriptionClientError';
    this.code = code;
    this.status = status;
    this.attempts = attempts;
    this.detail = detail;
  }
}

/**
 * @param {object} params
 * @param {Blob}   [params.audio]          recorded blob or selected File
 * @param {string} [params.audioUrl]       Vercel Blob URL for large files
 * @param {string} [params.mediaUrl]       link to an audio/video file the server downloads
 * @param {string} [params.filename]
 * @param {'auto'|'deepgram'|'gladia'} [params.engine]
 * @param {boolean} [params.fallback]      allow automatic engine failover
 * @param {string} [params.language]       ISO-639-1 code or '' for auto
 * @param {'auto'|'single'|'multiple'} [params.speakerMode] Speaker handling mode
 * @param {number} [params.durationSeconds]
 * @param {AbortSignal} [params.signal]
 */
export async function requestTranscription({
  audio,
  audioUrl,
  mediaUrl,
  filename,
  engine = 'auto',
  fallback = true,
  language = '',
  speakerMode = 'auto',
  durationSeconds,
  signal,
}) {
  if (!audio && !audioUrl && !mediaUrl) {
    throw new TranscriptionClientError('No audio was provided for transcription.', {
      code: 'NO_AUDIO',
    });
  }

  // Large-file mode: the bytes are already in Blob storage, so the route only
  // needs a URL. Sending it as multipart keeps one code path on the server.
  const body = new FormData();
  if (mediaUrl) {
    body.append('mediaUrl', mediaUrl);
  } else if (audioUrl) {
    body.append('audioUrl', audioUrl);
    body.append('filename', filename || 'audio');
  } else {
    body.append('audio', audio, filename || 'audio.webm');
  }
  body.append('engine', engine);
  body.append('fallback', fallback ? 'true' : 'false');
  body.append('speakerMode', ['single', 'multiple', 'auto'].includes(speakerMode) ? speakerMode : 'auto');
  if (language) body.append('language', language);
  if (Number.isFinite(durationSeconds) && durationSeconds > 0) {
    body.append('durationSeconds', String(durationSeconds));
  }

  let response;
  try {
    response = await fetch('/api/transcribe', {
      method: 'POST',
      body,
      signal,
      headers: { Accept: 'application/json' },
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new TranscriptionClientError('Transcription cancelled.', { code: 'ABORTED' });
    }
    throw new TranscriptionClientError(
      'Could not reach the transcription service. Check your connection and try again.',
      { code: 'NETWORK' },
    );
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = payload?.error ?? {};
    throw new TranscriptionClientError(
      error.message || `Transcription failed (HTTP ${response.status}).`,
      {
        code: error.code || 'PROVIDER_ERROR',
        status: response.status,
        attempts: error.attempts ?? [],
        detail: error.detail,
      },
    );
  }

  if (!payload?.text) {
    throw new TranscriptionClientError(
      payload?.error?.message || 'No speech was detected in that audio.',
      { code: payload?.error?.code || 'EMPTY_TRANSCRIPT', attempts: payload?.attempts ?? [] },
    );
  }

  return payload;
}

/**
 * Upload a large file straight to Vercel Blob.
 *
 * The file travels browser → Blob storage, never through a serverless function,
 * which is what makes it immune to the 4.5 MB request-body cap. The SDK talks to
 * `/api/blob/upload` only to exchange a short-lived token.
 *
 * @param {File|Blob} file
 * @param {{ filename?: string, onProgress?: (fraction: number) => void, signal?: AbortSignal }} options
 * @returns {Promise<string>} the public blob URL to hand to /api/transcribe
 */
export async function uploadToBlob(file, { filename, onProgress, signal } = {}) {
  const pathname = sanitiseBlobPath(filename || file.name || 'audio.webm');

  let upload;
  try {
    ({ upload } = await import('@vercel/blob/client'));
  } catch {
    throw new TranscriptionClientError(
      'Large-file uploads are unavailable because the storage SDK is not installed.',
      { code: 'BLOB_UNAVAILABLE' },
    );
  }

  try {
    const blob = await upload(pathname, file, {
      access: 'public', // Deepgram and Gladia must be able to fetch the URL.
      handleUploadUrl: '/api/blob/upload',
      contentType: file.type || undefined,
      abortSignal: signal,
      onUploadProgress: ({ percentage }) => {
        onProgress?.(Math.max(0, Math.min(1, (percentage ?? 0) / 100)));
      },
    });
    return blob.url;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new TranscriptionClientError('Upload cancelled.', { code: 'ABORTED' });
    }
    throw new TranscriptionClientError(
      error?.message ||
        'The file could not be uploaded to storage. Try a smaller file or check the Blob store configuration.',
      { code: 'BLOB_UPLOAD_FAILED' },
    );
  }
}

/** Keep the pathname tame: relative, no traversal, safe characters only. */
function sanitiseBlobPath(name) {
  const cleaned = String(name)
    .replace(/^.*[\\/]/, '') // strip any directory part
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(-80);
  const extension = cleaned.includes('.') ? '' : '.webm';
  return `stt-uploads/${cleaned || 'audio'}${extension}`;
}

