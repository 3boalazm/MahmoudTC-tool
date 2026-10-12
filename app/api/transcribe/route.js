/**
 * POST /api/transcribe
 * ---------------------------------------------------------------------------
 * Server-side proxy for the speech-to-text engines.
 *
 * Responsibilities
 *   1. Validate the incoming multipart request (present, correct type, size) —
 *      or, when the browser uploaded straight to Vercel Blob to escape the
 *      4.5 MB serverless body limit, validate the `audioUrl` instead.
 *   2. Rate-limit per client so a runaway tab cannot drain provider credits.
 *   3. Try the primary engine (Deepgram Nova-2).
 *   4. On a *retryable* failure — rate limited (429), out of credit (402),
 *      expired/invalid key (401), server error (5xx), timeout, network fault,
 *      or an empty transcript — transparently retry with Gladia.
 *   5. Return one normalised JSON shape, or a clear, user-safe error when both
 *      engines fail.
 *
 * The API keys never leave this process: the browser only ever calls this URL.
 */

import {
  ERROR_CODES,
  TranscriptionError,
  describeCode,
  estimateAudioSeconds,
  httpStatusFor,
  transcribeWithDeepgram,
  transcribeWithGladia,
} from '@/lib/engines';
import { deleteBlob, isBlobEnabled, isOwnBlobUrl } from '@/lib/server/blob';
import { engineAvailability, hasAnyEngine, serverConfig } from '@/lib/server/config';
import { checkRateLimit, clientIdentifier } from '@/lib/server/rate-limit';
import { errorResponse, jsonResponse, redact } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Vercel function timeout. 60 s is the ceiling every plan supports (Hobby caps
 * here; Pro and above allow more), so it is the safe default.
 *
 * On Pro/Enterprise you can raise BOTH of these to finish very long recordings:
 *   1. this constant → 300
 *   2. FUNCTION_BUDGET_MS → e.g. 285000 (must stay under the value above)
 * `lib/server/config.js` clamps every provider timeout to fit the budget, so the
 * route always has time to return real JSON instead of dying mid-request.
 */
export const maxDuration = 60;

const ACCEPTED_EXTENSIONS = [
  'mp3', 'mpga', 'wav', 'wave', 'm4a', 'mp4', 'mpeg', 'webm', 'ogg', 'oga',
  'opus', 'flac', 'aac', 'amr', 'aiff', 'aif', '3gp', '3gpp', 'mkv', 'mov',
];

/** Audio/video MIME types both engines accept. */
const ACCEPTED_MIME =
  /^(audio|video)\/|^application\/(ogg|octet-stream)$|^audio\/(x-)?(m4a|mp4|mpeg|webm|ogg|opus|flac|aac|wav|amr|aiff|basic)$/i;

export async function POST(request) {
  /* ---------------------------------------------------------------------- */
  /* 0. Fail fast when the deployment has no credentials at all             */
  /* ---------------------------------------------------------------------- */
  if (!hasAnyEngine()) {
    return errorResponse({
      status: 503,
      code: ERROR_CODES.MISSING_KEY,
      message:
        'No speech-to-text engine is configured. Add DEEPGRAM_API_KEY and/or GLADIA_API_KEY to .env.local and restart the server.',
    });
  }

  /* ---------------------------------------------------------------------- */
  /* 1. Rate limit                                                          */
  /* ---------------------------------------------------------------------- */
  const limit = checkRateLimit(clientIdentifier(request), serverConfig.rateLimit);
  if (!limit.allowed) {
    return errorResponse({
      status: 429,
      code: ERROR_CODES.RATE_LIMITED,
      message: `Too many transcription requests from this client. Please retry in ${limit.retryAfterSeconds}s.`,
      extraHeaders: {
        'Retry-After': String(limit.retryAfterSeconds),
        'X-RateLimit-Limit': String(limit.limit),
        'X-RateLimit-Remaining': '0',
      },
    });
  }

  /* ---------------------------------------------------------------------- */
  /* 2. Reject oversized bodies before buffering them                       */
  /* ---------------------------------------------------------------------- */
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength && declaredLength > serverConfig.upload.maxBytes * 1.05) {
    return errorResponse({
      status: 413,
      code: ERROR_CODES.BAD_REQUEST,
      message: tooLargeMessage(declaredLength),
    });
  }

  /* ---------------------------------------------------------------------- */
  /* 3. Parse the request and resolve the audio source                      */
  /* ---------------------------------------------------------------------- */
  const parsed = await parseRequest(request);
  if (parsed.error) return parsed.error;

  const { getField, buffer, filename, contentType, audioUrl } = parsed;

  /* ---------------------------------------------------------------------- */
  /* 4. Work out which engines to attempt, in order                         */
  /* ---------------------------------------------------------------------- */
  const requestedEngine = normaliseEngine(getField('engine'));
  const wantsFallback =
    !serverConfig.allowClientFallbackOption ||
    readBoolean(getField('fallback'), true);

  const availability = engineAvailability();
  const plan = buildEnginePlan({ requestedEngine, wantsFallback, availability });

  if (!plan.length) {
    return errorResponse({
      status: 503,
      code: ERROR_CODES.MISSING_KEY,
      message: describeUnavailableSelection({ requestedEngine, availability }),
    });
  }

  const language = normaliseLanguage(getField('language'));
  const clientDuration = Number.parseFloat(String(getField('durationSeconds') ?? ''));
  const audio = audioUrl ? { url: audioUrl, filename } : { buffer, contentType, filename };

  /* ---------------------------------------------------------------------- */
  /* 5. Run the plan, collecting an attempt trail as we go                  */
  /* ---------------------------------------------------------------------- */
  const attempts = [];
  let lastError = null;

  for (const engine of plan) {
    const index = plan.indexOf(engine);
    const nextEngine = plan[index + 1];

    try {
      const result = await runEngine(engine, audio, { language });

      if (result.text) {
        attempts.push(successEntry(engine, result));
        await releaseSource(audioUrl);
        return jsonResponse(
          buildSuccessBody({
            result,
            attempts,
            plan,
            engine,
            buffer,
            contentType,
            clientDuration,
          }),
        );
      }

      // The request succeeded but produced no speech. Another engine is often
      // able to hear what the first one could not, so treat this as retryable.
      const empty = new TranscriptionError(
        ERROR_CODES.EMPTY_TRANSCRIPT,
        `${engine} returned an empty transcript.`,
        {
          provider: engine,
          userMessage: describeCode(ERROR_CODES.EMPTY_TRANSCRIPT),
        },
      );
      attempts.push(failureEntry(engine, empty));
      lastError = empty;

      if (nextEngine && serverConfig.fallbackOnEmptyTranscript) {
        log(`[transcribe] ${engine} returned no speech — trying ${nextEngine}`);
        continue;
      }
      break;
    } catch (error) {
      const failure =
        error instanceof TranscriptionError
          ? error
          : new TranscriptionError(
              ERROR_CODES.PROVIDER_ERROR,
              redact(String(error?.message || error)),
              { provider: engine },
            );

      attempts.push(failureEntry(engine, failure));
      lastError = failure;

      log(`[transcribe] ${engine} failed (${failure.code}) — ${failure.message}`);

      // Non-retryable failures (corrupt or unsupported audio) would fail on the
      // fallback engine too, so stop and report immediately.
      if (!failure.retryable) break;

      if (nextEngine) log(`[transcribe] falling back to ${nextEngine}`);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* 6. Everything failed — explain it clearly                              */
  /* ---------------------------------------------------------------------- */
  await releaseSource(audioUrl);

  const code = lastError?.code || ERROR_CODES.PROVIDER_ERROR;
  const bothTried = attempts.length > 1;

  // The raw provider message is logged above; the browser gets codes plus
  // user-safe reasons. Developers still see the gory detail outside production.
  return errorResponse({
    status: httpStatusFor(lastError),
    code,
    message: buildFailureMessage({ code, lastError, attempts, bothTried, requestedEngine }),
    detail: serverConfig.isProduction ? undefined : lastError?.message,
    attempts: attempts.map(({ detail: _detail, ...rest }) => rest),
  });
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Parse either multipart/form-data (small clip, sent inline) or a JSON body
 * carrying `audioUrl` (large clip, already in Vercel Blob).
 *
 * @returns {Promise<{error?: Response, form?: FormData, buffer?: Buffer|null,
 *                    filename?: string, contentType?: string, audioUrl?: string|null}>}
 */
async function parseRequest(request) {
  const contentTypeHeader = request.headers.get('content-type') || '';

  if (contentTypeHeader.includes('application/json')) {
    let payload;
    try {
      payload = await request.json();
    } catch {
      return {
        error: errorResponse({
          status: 400,
          code: ERROR_CODES.BAD_REQUEST,
          message: 'The JSON body could not be parsed.',
        }),
      };
    }
    const values = payload ?? {};
    return resolveRemoteSource(values, (key) => values[key]);
  }

  let form;
  try {
    form = await request.formData();
  } catch (error) {
    return {
      error: errorResponse({
        status: 400,
        code: ERROR_CODES.BAD_REQUEST,
        message:
          'The request body could not be read. Send the audio as multipart/form-data under the "audio" field, or as JSON with an "audioUrl".',
        detail: redact(String(error?.message || error)),
      }),
    };
  }

  // A multipart request can still describe a remote object (the studio uses
  // this so it always sends the settings alongside the source).
  const remoteUrl = form.get('audioUrl');
  if (typeof remoteUrl === 'string' && remoteUrl) {
    return resolveRemoteSource(
      { audioUrl: remoteUrl, filename: form.get('filename') },
      (key) => form.get(key),
    );
  }

  const file = form.get('audio') ?? form.get('file');
  if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
    return {
      error: errorResponse({
        status: 400,
        code: ERROR_CODES.BAD_REQUEST,
        message: 'No audio file was received. Attach it as the "audio" form field.',
      }),
    };
  }

  if (file.size === 0) {
    return {
      error: errorResponse({
        status: 400,
        code: ERROR_CODES.BAD_REQUEST,
        message: 'The uploaded audio file is empty.',
      }),
    };
  }

  if (file.size > serverConfig.upload.maxBytes) {
    return {
      error: errorResponse({
        status: 413,
        code: ERROR_CODES.BAD_REQUEST,
        message: tooLargeMessage(file.size),
      }),
    };
  }

  const filename = typeof file.name === 'string' && file.name ? file.name : 'audio';
  const fileType =
    file.type || guessContentTypeFromName(filename) || 'application/octet-stream';
  const extension = filename.includes('.') ? filename.split('.').pop().toLowerCase() : '';

  if (!ACCEPTED_MIME.test(fileType) && !ACCEPTED_EXTENSIONS.includes(extension)) {
    return {
      error: errorResponse({
        status: 415,
        code: ERROR_CODES.BAD_REQUEST,
        message: `${fileType || 'That file type'} is not a supported audio format. Try MP3, WAV, M4A, WebM, OGG, FLAC or AAC.`,
      }),
    };
  }

  try {
    return {
      getField: (key) => form.get(key),
      buffer: Buffer.from(await file.arrayBuffer()),
      filename,
      contentType: fileType,
      audioUrl: null,
    };
  } catch {
    return {
      error: errorResponse({
        status: 400,
        code: ERROR_CODES.BAD_REQUEST,
        message: 'The uploaded audio could not be read into memory.',
      }),
    };
  }
}

/**
 * Validate an `audioUrl` carrying caller-supplied remote audio.
 *
 * @param {{ audioUrl?: string, filename?: string }} payload
 * @param {(key: string) => unknown} getField reads the remaining request settings
 */
function resolveRemoteSource(payload, getField) {
  const audioUrl = typeof payload.audioUrl === 'string' ? payload.audioUrl.trim() : '';

  if (!audioUrl) {
    return {
      error: errorResponse({
        status: 400,
        code: ERROR_CODES.BAD_REQUEST,
        message: 'The "audioUrl" field is required when sending JSON.',
      }),
    };
  }

  if (!isOwnBlobUrl(audioUrl)) {
    return {
      error: errorResponse({
        status: 400,
        code: ERROR_CODES.BAD_REQUEST,
        message:
          'Only audio uploaded through this app’s Vercel Blob store can be fetched by URL. Upload the file instead.',
      }),
    };
  }

  const filename =
    (typeof payload.filename === 'string' && payload.filename) ||
    decodeURIComponent(audioUrl.split('/').pop() || 'audio');

  return { getField, buffer: null, filename, contentType: 'audio/*', audioUrl };
}

/**
 * Delete the uploaded object once transcription is over. `deleteAfterUse` can
 * be switched off, but leaving it on keeps the promise that nothing is stored.
 */
async function releaseSource(audioUrl) {
  if (!audioUrl || !serverConfig.blob.deleteAfterUse) return;
  await deleteBlob(audioUrl);
}

async function runEngine(engine, audio, { language }) {
  if (engine === 'deepgram') {
    return transcribeWithDeepgram(audio, {
      apiKey: serverConfig.deepgram.apiKey,
      model: serverConfig.deepgram.model,
      timeoutMs: serverConfig.deepgram.timeoutMs,
      baseUrl: serverConfig.deepgram.baseUrl,
      language,
    });
  }
  return transcribeWithGladia(audio, {
    apiKey: serverConfig.gladia.apiKey,
    timeoutMs: serverConfig.gladia.timeoutMs,
    pollTimeoutMs: serverConfig.gladia.pollTimeoutMs,
    pollIntervalMs: serverConfig.gladia.pollIntervalMs,
    baseUrl: serverConfig.gladia.baseUrl,
    language,
  });
}

/**
 * Engine order for this request.
 * - `auto`      → Deepgram first (preferred), Gladia as the safety net.
 * - `deepgram`  → Deepgram only; Gladia only if fallback is switched on and the
 *                 caller did not explicitly pin a single engine.
 * - `gladia`    → Gladia first, Deepgram as the safety net.
 */
function buildEnginePlan({ requestedEngine, wantsFallback, availability }) {
  const order =
    requestedEngine === 'gladia'
      ? ['gladia', 'deepgram']
      : ['deepgram', 'gladia'];

  const available = order.filter((engine) => availability[engine]);
  if (!available.length) return [];

  // An explicit engine choice with fallback disabled means "this engine only".
  if (requestedEngine !== 'auto' && !wantsFallback) {
    return available.includes(requestedEngine) ? [requestedEngine] : [];
  }
  return available;
}

function normaliseEngine(value) {
  const engine = String(value ?? '').trim().toLowerCase();
  return ['deepgram', 'gladia', 'auto'].includes(engine) ? engine : 'auto';
}

function normaliseLanguage(value) {
  const language = String(value ?? '').trim().toLowerCase();
  if (!language || language === 'auto') return '';
  // Guard against query-string injection — language codes are short tokens.
  return /^[a-z]{2}(-[a-z0-9]{2,8})?$/.test(language) ? language : '';
}

function readBoolean(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function guessContentTypeFromName(filename) {
  const extension = filename.split('.').pop()?.toLowerCase();
  const map = {
    mp3: 'audio/mpeg',
    mpga: 'audio/mpeg',
    wav: 'audio/wav',
    wave: 'audio/wav',
    m4a: 'audio/mp4',
    mp4: 'audio/mp4',
    mov: 'video/quicktime',
    webm: 'audio/webm',
    ogg: 'audio/ogg',
    oga: 'audio/ogg',
    opus: 'audio/opus',
    flac: 'audio/flac',
    aac: 'audio/aac',
    amr: 'audio/amr',
    aiff: 'audio/aiff',
    aif: 'audio/aiff',
    mkv: 'video/x-matroska',
    '3gp': 'audio/3gpp',
  };
  return map[extension] ?? '';
}

function successEntry(engine, result) {
  return {
    engine,
    ok: true,
    model: result.model ?? null,
    elapsedMs: result.elapsedMs ?? null,
  };
}

function failureEntry(engine, error) {
  return {
    engine,
    ok: false,
    code: error.code,
    status: error.status ?? null,
    retryable: Boolean(error.retryable),
    // Server logs get the detail; the browser gets a short reason.
    reason: describeCode(error.code),
    detail: error.message,
  };
}

function buildSuccessBody({
  result,
  attempts,
  plan,
  engine,
  buffer,
  contentType,
  clientDuration,
}) {
  const fallbackUsed = plan.indexOf(engine) > 0;
  const audioSeconds =
    Number.isFinite(clientDuration) && clientDuration > 0
      ? Math.round(clientDuration)
      : buffer
        ? estimateAudioSeconds(buffer.byteLength, contentType)
        : null;

  const warnings = [];
  if (fallbackUsed) {
    const primaryFailure = attempts.find((attempt) => !attempt.ok);
    warnings.push(
      `The primary engine was unavailable (${primaryFailure?.code ?? 'ERROR'}), so this transcript came from ${engine}.`,
    );
  }

  return {
    ok: true,
    text: result.text,
    engine: result.engine ?? engine,
    model: result.model ?? null,
    language: result.language ?? null,
    confidence: result.confidence ?? null,
    durationSeconds: result.duration ?? null,
    audioSeconds,
    requestId: result.requestId ?? null,
    elapsedMs: result.elapsedMs ?? null,
    fallbackUsed,
    words: result.words ?? [],
    segments: result.segments ?? [],
    // `detail` is intentionally dropped: it is for server logs, not the client.
    attempts: attempts.map(({ detail: _detail, ...rest }) => rest),
    warnings,
  };
}

function buildFailureMessage({ code, lastError, attempts, bothTried, requestedEngine }) {
  if (code === ERROR_CODES.EMPTY_TRANSCRIPT) {
    return 'No speech could be detected in that audio. Check that the recording is audible and not silent.';
  }
  if (code === ERROR_CODES.MISSING_KEY && requestedEngine !== 'auto') {
    return describeUnavailableSelection({
      requestedEngine,
      availability: engineAvailability(),
    });
  }

  const engines = [...new Set(attempts.map((attempt) => attempt.engine))].join(' and ');
  const reason = lastError?.userMessage || describeCode(code);

  return bothTried
    ? `Both transcription engines failed (${engines}). ${reason}`
    : `Transcription failed. ${reason}`;
}

function describeUnavailableSelection({ requestedEngine, availability }) {
  if (requestedEngine === 'deepgram' && !availability.deepgram) {
    return 'The Deepgram engine is selected but DEEPGRAM_API_KEY is not configured on this deployment.';
  }
  if (requestedEngine === 'gladia' && !availability.gladia) {
    return 'The Gladia engine is selected but GLADIA_API_KEY is not configured on this deployment.';
  }
  return 'No speech-to-text engine is available for this request.';
}

/**
 * One explanation for both oversize guards. When a Blob store is connected the
 * advice is actionable ("this will work if you re-import it"), because a
 * serverless body cap is not something the user can fix by trimming alone.
 */
function tooLargeMessage(bytes) {
  const sizeLabel = bytes ? `That file is ${formatBytes(bytes)}. ` : 'That file is too large. ';
  const inline = `The inline upload limit is ${serverConfig.upload.maxMb} MB.`;

  if (isBlobEnabled()) {
    return `${sizeLabel}${inline} Re-import it and the studio will route it through Vercel Blob storage instead, which has no such limit.`;
  }
  return `${sizeLabel}${inline} Trim the audio, raise MAX_UPLOAD_MB, or connect a Vercel Blob store for large files.`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function log(message) {
  // Keep production logs quiet unless something actually went wrong.
  console.warn(message);
}
