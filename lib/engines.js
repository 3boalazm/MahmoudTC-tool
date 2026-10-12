/**
 * lib/engines.js
 * ---------------------------------------------------------------------------
 * Provider adapters for the two speech-to-text engines, plus the shared error
 * types and formatting helpers used by `/api/transcribe`.
 *
 * Design rules (the reason this file has no Next.js imports at all):
 *   1. Every adapter receives an already-buffered audio payload. Nothing in
 *      this file reads `process.env` directly — configuration is injected, so
 *      the module stays trivially unit-testable (`npm test`).
 *   2. Every failure is normalised into a `TranscriptionError` carrying a
 *      `code`, so the route handler can decide *mechanically* whether the
 *      failure is worth retrying on the fallback engine.
 *   3. Errors raised by a provider never contain the API key.
 */

/** Machine-readable failure codes. `fatal` codes are never retried. */
export const ERROR_CODES = {
  MISSING_KEY: 'MISSING_KEY',
  AUTH: 'AUTH',
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  RATE_LIMITED: 'RATE_LIMITED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  TIMEOUT: 'TIMEOUT',
  SERVER_ERROR: 'SERVER_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  EMPTY_TRANSCRIPT: 'EMPTY_TRANSCRIPT',
  NETWORK: 'NETWORK',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
};

/** Codes that mean "this provider is out of action" rather than "bad audio". */
const FALLBACK_WORTHY_CODES = new Set([
  ERROR_CODES.RATE_LIMITED,
  ERROR_CODES.PAYMENT_REQUIRED,
  ERROR_CODES.QUOTA_EXCEEDED,
  ERROR_CODES.AUTH,
  ERROR_CODES.SERVER_ERROR,
  ERROR_CODES.TIMEOUT,
  ERROR_CODES.NETWORK,
  ERROR_CODES.EMPTY_TRANSCRIPT,
  ERROR_CODES.PROVIDER_ERROR,
]);

export class TranscriptionError extends Error {
  /**
   * @param {string} code   one of ERROR_CODES
   * @param {string} message developer-facing explanation
   * @param {object} [meta] { provider, status, retryable, userMessage, cause }
   */
  constructor(code, message, meta = {}) {
    super(message);
    this.name = 'TranscriptionError';
    this.code = code;
    this.provider = meta.provider ?? null;
    this.status = meta.status ?? null;
    this.retryable = meta.retryable ?? FALLBACK_WORTHY_CODES.has(code);
    this.userMessage = meta.userMessage ?? message;
    if (meta.cause) this.cause = meta.cause;
  }

  /** Safe, log-friendly shape — never leaks keys or raw provider payloads. */
  toJSON() {
    return {
      code: this.code,
      provider: this.provider,
      status: this.status,
      retryable: this.retryable,
      message: this.message,
    };
  }
}

/** Wrap any thrown value into a TranscriptionError (used around fetch calls). */
export function toTranscriptionError(error, { provider, userMessage } = {}) {
  if (error instanceof TranscriptionError) return error;
  if (error?.name === 'AbortError' || error?.code === 'ABORT_ERR') {
    return new TranscriptionError(
      ERROR_CODES.TIMEOUT,
      `${provider}: request aborted after exceeding the configured timeout.`,
      { provider, userMessage },
    );
  }
  return new TranscriptionError(
    ERROR_CODES.NETWORK,
    `${provider}: network failure — ${error?.message || error}`,
    { provider, userMessage, cause: error },
  );
}

/**
 * Map an HTTP status (plus provider-specific hints) onto an ERROR_CODE.
 * Both Deepgram and Gladia use conventional status codes, so one table covers
 * them; `hint` lets a provider disambiguate a 400 (e.g. "quota exceeded").
 */
function classifyStatus(status, hint = '') {
  const text = String(hint).toLowerCase();
  if (status === 401 || status === 403) return ERROR_CODES.AUTH;
  if (status === 402) return ERROR_CODES.PAYMENT_REQUIRED;
  if (status === 429) return ERROR_CODES.RATE_LIMITED;
  if (status === 408 || status === 504) return ERROR_CODES.TIMEOUT;
  if (status >= 500) return ERROR_CODES.SERVER_ERROR;
  if (status === 400) {
    if (/quota|credit|balance|too many hours|insufficient/.test(text)) {
      return ERROR_CODES.QUOTA_EXCEEDED;
    }
    return ERROR_CODES.BAD_REQUEST;
  }
  if (status && status >= 400) return ERROR_CODES.PROVIDER_ERROR;
  return ERROR_CODES.PROVIDER_ERROR;
}

/** User-facing copy for a failure code, used when both engines have failed. */
export function describeCode(code) {
  switch (code) {
    case ERROR_CODES.AUTH:
      return 'The speech-to-text credentials were rejected by the provider.';
    case ERROR_CODES.PAYMENT_REQUIRED:
      return 'The speech-to-text account has no remaining credit.';
    case ERROR_CODES.RATE_LIMITED:
      return 'The speech-to-text provider is currently rate limiting requests.';
    case ERROR_CODES.QUOTA_EXCEEDED:
      return 'The speech-to-text account has exhausted its usage quota.';
    case ERROR_CODES.TIMEOUT:
      return 'The transcription service took too long to respond.';
    case ERROR_CODES.SERVER_ERROR:
      return 'The transcription provider reported a server-side failure.';
    case ERROR_CODES.BAD_REQUEST:
      return 'The audio could not be processed by the provider.';
    case ERROR_CODES.MISSING_KEY:
      return 'No API key is configured for that engine.';
    case ERROR_CODES.EMPTY_TRANSCRIPT:
      return 'The audio was processed but no speech was detected.';
    default:
      return 'The transcription provider returned an unexpected result.';
  }
}

/** Status code the *client* should receive, derived from what went wrong. */
export function httpStatusFor(error) {
  switch (error?.code) {
    case ERROR_CODES.BAD_REQUEST:
      return 400;
    case ERROR_CODES.AUTH:
      return 502;
    case ERROR_CODES.PAYMENT_REQUIRED:
      return 402;
    case ERROR_CODES.RATE_LIMITED:
      return 429;
    case ERROR_CODES.TIMEOUT:
      return 504;
    case ERROR_CODES.MISSING_KEY:
      return 503;
    default:
      return 502;
  }
}

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                             */
/* -------------------------------------------------------------------------- */

const MAX_PROVIDER_MESSAGE = 400;

/** Best-effort extraction of a short human message from a provider payload. */
export function extractProviderMessage(body) {
  if (!body) return '';
  if (typeof body === 'string') return body.slice(0, MAX_PROVIDER_MESSAGE);

  // Validation errors arrive as an array of `{ message }` objects.
  if (Array.isArray(body)) {
    return body
      .map((item) => item?.message ?? String(item))
      .join('; ')
      .slice(0, MAX_PROVIDER_MESSAGE);
  }

  const candidate =
    body.err_msg ??
    body.message ??
    body.error ??
    body.detail ??
    body.request_id ??
    '';
  if (Array.isArray(candidate)) {
    return candidate
      .map((item) => item?.message ?? String(item))
      .join('; ')
      .slice(0, MAX_PROVIDER_MESSAGE);
  }
  if (typeof candidate === 'string') return candidate.slice(0, MAX_PROVIDER_MESSAGE);
  if (typeof body.error === 'object' && body.error?.message) {
    return String(body.error.message).slice(0, MAX_PROVIDER_MESSAGE);
  }
  if (typeof body.code === 'string') return body.code.slice(0, MAX_PROVIDER_MESSAGE);
  try {
    return JSON.stringify(body).slice(0, MAX_PROVIDER_MESSAGE);
  } catch {
    return '';
  }
}

async function readBody(response) {
  const contentType = response.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) return await response.json();
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch {
    return '';
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Collapse provider line breaks, keep paragraph structure, trim edges. */
function tidyTranscript(value) {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Accept either an in-memory clip or a remote URL — both providers support
 * both. Large uploads on serverless go through the URL path because a Vercel
 * Function cannot receive more than 4.5 MB of request body.
 *
 * @param {{ buffer?: Buffer|Uint8Array, url?: string, contentType?: string, filename?: string }} audio
 * @param {string} provider
 */
export function normaliseAudioSource(audio, provider) {
  const url = typeof audio?.url === 'string' && audio.url ? audio.url : null;
  const buffer = audio?.buffer ?? null;

  if (buffer) {
    return { mode: 'buffer', buffer, url: null };
  }
  if (url) {
    return { mode: 'url', buffer: null, url };
  }
  throw new TranscriptionError(
    ERROR_CODES.BAD_REQUEST,
    `${provider}: neither audio bytes nor an audio URL were supplied.`,
    {
      provider,
      retryable: false,
      userMessage: 'No audio data was available to send to the provider.',
    },
  );
}

/** Best-effort duration in seconds, used to estimate billable audio seconds. */
export function estimateAudioSeconds(byteLength, contentType = '') {
  const rate = /wav|aiff|pcm/i.test(contentType) ? 176_400 : 16_000; // bytes/sec
  if (!byteLength || !Number.isFinite(byteLength)) return null;
  return Math.max(1, Math.round(byteLength / rate));
}

/* -------------------------------------------------------------------------- */
/* Engine 1 — Deepgram (Nova-2)                                               */
/* -------------------------------------------------------------------------- */

export const DEEPGRAM_DEFAULT_MODEL = 'nova-2';
/**
 * Overridable so a self-hosted gateway or a local mock can stand in for the
 * provider. Defaults to Deepgram's public endpoint.
 */
export const DEEPGRAM_DEFAULT_BASE_URL = 'https://api.deepgram.com/v1/listen';
const trimSlash = (value) => String(value || '').replace(/\/+$/, '');

/** Languages Nova-2 transcribes natively; anything else uses auto-detection. */
const NOVA2_LANGUAGES = new Set([
  'en', 'en-us', 'en-au', 'en-gb', 'en-nz', 'en-in', 'multi',
  'bg', 'ca', 'zh', 'zh-cn', 'zh-hans', 'zh-tw', 'zh-hant', 'zh-hk',
  'cs', 'da', 'da-dk', 'nl', 'nl-be', 'et', 'fi', 'fr', 'fr-ca', 'de', 'de-ch',
  'el', 'hi', 'hu', 'id', 'it', 'ja', 'ko', 'ko-kr', 'lv', 'lt', 'ms', 'no',
  'pl', 'pt', 'pt-br', 'pt-pt', 'ro', 'ru', 'sk', 'es', 'es-419', 'sv', 'sv-se',
  'th', 'th-th', 'tr', 'uk', 'vi',
]);

/**
 * Build the Deepgram pre-recorded query string.
 * Docs: https://developers.deepgram.com/reference/speech-to-text/listen-pre-recorded
 */
export function buildDeepgramQuery(options = {}) {
  const model = options.model || DEEPGRAM_DEFAULT_MODEL;
  const requested = String(options.language || '').toLowerCase();
  const params = new URLSearchParams({
    model,
    smart_format: 'true',
    punctuate: 'true',
    paragraphs: 'true',
    diarize: 'false',
    filler_words: 'false',
  });

  const isNova2 = model.startsWith('nova-2');
  if (!requested || requested === 'auto') {
    // Nova-2 has no auto-detect; English is the sane baseline for `auto`.
    params.set('language', isNova2 ? 'en' : 'multi');
  } else if (isNova2 && !NOVA2_LANGUAGES.has(requested)) {
    // e.g. Arabic (`ar`) — nova-2 has no such language, so let the multi-model
    // transcription endpoint detect it instead of failing with a 400.
    params.set('detect_language', 'true');
  } else {
    params.set('language', requested);
  }
  return params.toString();
}

/**
 * Normalise a Deepgram `listen` response.
 * Response shape: results.channels[0].alternatives[0].{transcript,words[]}
 */
export function parseDeepgramResponse(payload) {
  const channel = payload?.results?.channels?.[0];
  const alternative = channel?.alternatives?.[0];
  const words = Array.isArray(alternative?.words) ? alternative.words : [];

  const segmentTexts = [];
  const segments = Array.isArray(channel?.alternatives?.[0]?.paragraphs?.paragraphs)
    ? channel.alternatives[0].paragraphs.paragraphs
    : [];
  for (const paragraph of segments) {
    for (const sentence of paragraph?.sentences ?? []) {
      if (sentence?.text) segmentTexts.push(sentence.text);
    }
  }

  const text = tidyTranscript(
    alternative?.transcript || segmentTexts.join(' '),
  );

  return {
    text,
    segments: segmentTexts.map((t) => ({ text: tidyTranscript(t) })),
    words: words.map((word) => ({
      word: word.punctuated_word || word.word,
      start: word.start,
      end: word.end,
      confidence: word.confidence,
    })),
    confidence:
      typeof alternative?.confidence === 'number'
        ? alternative.confidence
        : average(words.map((word) => word.confidence)),
    language:
      payload?.results?.channels?.[0]?.detected_language ||
      payload?.metadata?.language ||
      null,
    duration:
      payload?.metadata?.duration ??
      (words.length ? words[words.length - 1]?.end : null) ??
      null,
  };
}

function average(values) {
  const usable = values.filter((value) => typeof value === 'number' && value > 0);
  if (!usable.length) return null;
  const total = usable.reduce((sum, value) => sum + value, 0);
  return total / usable.length;
}

/**
 * Transcribe a buffered audio file with Deepgram Nova-2.
 *
 * @param {{ buffer: Buffer|Uint8Array, contentType: string, filename?: string }} audio
 * @param {{ apiKey: string, model?: string, language?: string, timeoutMs?: number }} config
 * @returns {Promise<object>} normalised transcription result
 */
export async function transcribeWithDeepgram(audio, config = {}) {
  const provider = 'deepgram';
  const { apiKey, timeoutMs = 120_000 } = config;

  if (!apiKey) {
    throw new TranscriptionError(
      ERROR_CODES.MISSING_KEY,
      'DEEPGRAM_API_KEY is not configured.',
      {
        provider,
        retryable: false,
        userMessage:
          'The primary engine (Deepgram) has no API key configured on this deployment.',
      },
    );
  }

  const source = normaliseAudioSource(audio, provider);
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const baseUrl = trimSlash(config.baseUrl) || DEEPGRAM_DEFAULT_BASE_URL;

  let response;
  try {
    response = await fetch(
      `${baseUrl}?${buildDeepgramQuery(config)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${apiKey}`,
          // Deepgram takes raw bytes with the audio's own MIME type, or a JSON
          // body of `{ "url": "…" }` when the file already lives somewhere else.
          'Content-Type':
            source.mode === 'url'
              ? 'application/json'
              : audio.contentType || 'application/octet-stream',
        },
        body:
          source.mode === 'url'
            ? JSON.stringify({ url: source.url })
            : source.buffer,
        signal: controller.signal,
        cache: 'no-store',
      },
    );
  } catch (error) {
    throw toTranscriptionError(error, {
      provider,
      userMessage: 'Could not reach the primary transcription engine.',
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await readBody(response);
    const detail = extractProviderMessage(body);
    const code = classifyStatus(response.status, detail);
    throw new TranscriptionError(
      code,
      `Deepgram responded ${response.status}: ${detail || 'no detail'}`,
      {
        provider,
        status: response.status,
        userMessage:
          code === ERROR_CODES.BAD_REQUEST
            ? `The primary engine rejected the audio (${detail || response.status}).`
            : describeCode(code),
      },
    );
  }

  const payload = await readBody(response);
  const result = parseDeepgramResponse(payload);

  return {
    ...result,
    engine: 'deepgram',
    model: config.model || DEEPGRAM_DEFAULT_MODEL,
    requestId:
      payload?.metadata?.request_id ?? response.headers.get('dg-request-id') ?? null,
    elapsedMs: Date.now() - startedAt,
  };
}

/* -------------------------------------------------------------------------- */
/* Engine 2 — Gladia (fallback)                                               */
/* -------------------------------------------------------------------------- */

export const GLADIA_DEFAULT_BASE_URL = 'https://api.gladia.io/v2';

/**
 * Transcribe a buffered audio file with Gladia.
 *
 * Gladia's v2 pre-recorded flow is asynchronous: upload the file, start a job,
 * then poll it. Docs: https://docs.gladia.io/api-reference/v2/transcription/init
 *
 * @param {{ buffer: Buffer|Uint8Array, contentType: string, filename?: string }} audio
 * @param {{ apiKey: string, language?: string, timeoutMs?: number,
 *           pollTimeoutMs?: number, pollIntervalMs?: number }} config
 */
export async function transcribeWithGladia(audio, config = {}) {
  const provider = 'gladia';
  const {
    apiKey,
    language,
    timeoutMs = 120_000,
    pollTimeoutMs = 120_000,
    pollIntervalMs = 2_000,
  } = config;

  if (!apiKey) {
    throw new TranscriptionError(
      ERROR_CODES.MISSING_KEY,
      'GLADIA_API_KEY is not configured.',
      {
        provider,
        retryable: false,
        userMessage:
          'The fallback engine (Gladia) has no API key configured on this deployment.',
      },
    );
  }

  const source = normaliseAudioSource(audio, provider);
  const startedAt = Date.now();
  const headers = { 'x-gladia-key': apiKey };
  const baseUrl = trimSlash(config.baseUrl) || GLADIA_DEFAULT_BASE_URL;

  /* ---- Step 1: get an audio_url — reuse the caller's, or upload ours ---- */
  let audioUrl = source.url;
  if (!audioUrl) {
    const uploaded = await requestJson(`${baseUrl}/upload`, {
      provider,
      method: 'POST',
      timeoutMs,
      headers,
      body: buildMultipartBody(audio),
    });
    audioUrl = uploaded?.audio_url;
    if (!audioUrl) {
      throw new TranscriptionError(
        ERROR_CODES.PROVIDER_ERROR,
        'Gladia upload succeeded but returned no audio_url.',
        { provider, userMessage: describeCode(ERROR_CODES.PROVIDER_ERROR) },
      );
    }
  }

  /* ---- Step 2: create the transcription job ----------------------------- */
  const jobBody = {
    audio_url: audioUrl,
    diarization: false,
    sentences: true,
  };
  const requested = String(language || '').toLowerCase();
  if (requested && requested !== 'auto') {
    jobBody.language_config = { languages: [requested] };
  } else {
    // Empty `languages` tells Gladia to detect the spoken language itself.
    jobBody.language_config = { languages: [], code_switching: false };
  }

  const job = await requestJson(`${baseUrl}/transcription`, {
    provider,
    method: 'POST',
    timeoutMs,
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(jobBody),
  });

  const jobId = job?.id;
  if (!jobId) {
    throw new TranscriptionError(
      ERROR_CODES.PROVIDER_ERROR,
      'Gladia did not return a transcription job id.',
      { provider, userMessage: describeCode(ERROR_CODES.PROVIDER_ERROR) },
    );
  }

  /* ---- Step 3: poll until the job is done (or fails) -------------------- */
  const deadline = Date.now() + pollTimeoutMs;
  let current = job;

  while (!isGladiaDone(current?.status)) {
    if (Date.now() > deadline) {
      throw new TranscriptionError(
        ERROR_CODES.TIMEOUT,
        `Gladia job ${jobId} was still "${current?.status}" after ${pollTimeoutMs}ms.`,
        { provider, userMessage: describeCode(ERROR_CODES.TIMEOUT) },
      );
    }
    await wait(pollIntervalMs);
    current = await requestJson(`${baseUrl}/transcription/${jobId}`, {
      provider,
      method: 'GET',
      timeoutMs,
      headers,
    });
  }

  if (current.status === 'error') {
    const detail = extractProviderMessage(current);
    throw new TranscriptionError(
      ERROR_CODES.PROVIDER_ERROR,
      `Gladia job ${jobId} failed (${current.error_code || 'unknown'}): ${detail}`,
      {
        provider,
        retryable: false,
        userMessage: `The fallback engine could not process this audio${
          current.error_code ? ` (${current.error_code})` : ''
        }.`,
      },
    );
  }

  const result = parseGladiaResult(current, jobId);
  return { ...result, elapsedMs: Date.now() - startedAt };
}

function isGladiaDone(status) {
  return status === 'done' || status === 'error';
}

/** Gladia uses XMLHttpRequest-flavoured `{success, message}` JSON bodies. */
async function requestJson(url, { provider, method, headers, body, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
      cache: 'no-store',
    });
  } catch (error) {
    throw toTranscriptionError(error, {
      provider,
      userMessage: `Could not reach the ${provider} transcription service.`,
    });
  } finally {
    clearTimeout(timer);
  }

  const payload = await readBody(response);

  if (!response.ok) {
    const detail = extractProviderMessage(payload);
    const code = classifyStatus(response.status, detail);
    throw new TranscriptionError(
      code,
      `Gladia responded ${response.status} on ${method} ${url}: ${detail || 'no detail'}`,
      {
        provider,
        status: response.status,
        userMessage:
          code === ERROR_CODES.BAD_REQUEST
            ? `The fallback engine rejected the audio (${detail || response.status}).`
            : describeCode(code),
      },
    );
  }
  return payload;
}

/**
 * Build a multipart/form-data body without relying on the global FormData.
 *
 * @param {Array<{name: string, value: string|Buffer|Uint8Array,
 *                filename?: string, contentType?: string}>} fields
 * @returns {{ body: Buffer, contentType: string }}
 */
export function buildMultipartForm(fields) {
  const boundary = `----sttstudio${Date.now().toString(16)}${Math.random()
    .toString(16)
    .slice(2)}`;

  const chunks = [];
  for (const field of fields) {
    // Strip quotes and CRLF so a crafted name can never escape the header.
    const name = String(field.name).replace(/["\r\n]/g, '');
    const isFile = field.filename !== undefined || Buffer.isBuffer(field.value);

    let headers = `--${boundary}\r\nContent-Disposition: form-data; name="${name}"`;
    if (isFile) {
      const safeName = String(field.filename || 'audio').replace(/["\r\n]/g, '');
      headers += `; filename="${safeName}"`;
    }
    headers += '\r\n';
    if (isFile) {
      headers += `Content-Type: ${field.contentType || 'application/octet-stream'}\r\n`;
    }
    headers += '\r\n';

    chunks.push(Buffer.from(headers, 'utf8'));
    chunks.push(Buffer.isBuffer(field.value) ? field.value : Buffer.from(field.value, 'utf8'));
    chunks.push(Buffer.from('\r\n', 'utf8'));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`, 'utf8'));

  return {
    body: Buffer.concat(chunks),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

/** Single-file convenience wrapper (audio upload to Gladia, and friends). */
function buildMultipartBody({ buffer, contentType, filename }) {
  return buildMultipartForm([
    { name: 'audio', value: buffer, filename: filename || 'audio', contentType },
  ]);
}

/** Normalise a Gladia v2 job result. */
export function parseGladiaResult(job, jobId = null) {
  const inner = job?.result?.transcription ?? {};
  const utterances = Array.isArray(inner?.utterances) ? inner.utterances : [];
  const segments = utterances.length
    ? utterances.map((utterance) => ({
        text: tidyTranscript(utterance?.text),
        start: utterance?.start ?? null,
        end: utterance?.end ?? null,
        speaker: utterance?.speaker ?? null,
      }))
    : [];

  const words = Array.isArray(job?.result?.transcription?.words)
    ? job.result.transcription.words
    : [];

  const text = tidyTranscript(
    inner?.full_transcript || segments.map((segment) => segment.text).join(' '),
  );

  return {
    text,
    segments,
    words: words.map((word) => ({
      word: word?.word,
      start: word?.start,
      end: word?.end,
      confidence: word?.confidence,
    })),
    confidence: null,
    language: inner?.languages?.[0] ?? job?.request_params?.language_config?.languages?.[0] ?? null,
    duration:
      job?.file?.audio_duration ?? (utterances.length ? utterances.at(-1)?.end : null) ?? null,
    engine: 'gladia',
    model: 'solaria-1',
    requestId: job?.request_id ?? jobId,
  };
}

/** The header object callers must merge in for the multipart upload request. */
export function gladiaUploadHeaders(apiKey) {
  return { 'x-gladia-key': apiKey };
}


/* -------------------------------------------------------------------------- */
/* Engine 3 — AssemblyAI                                                      */
/* -------------------------------------------------------------------------- */

export const ASSEMBLYAI_DEFAULT_BASE_URL = 'https://api.assemblyai.com/v2';

/**
 * Transcribe a buffered clip (or remote URL) with AssemblyAI.
 *
 * Flow: upload the bytes → create a transcript job → poll until it completes.
 * Docs: https://www.assemblyai.com/docs/api-reference/transcripts/submit
 *
 * @param {{ buffer?: Buffer|Uint8Array, url?: string, contentType?: string, filename?: string }} audio
 * @param {{ apiKey: string, baseUrl?: string, model?: string, language?: string,
 *           timeoutMs?: number, pollTimeoutMs?: number, pollIntervalMs?: number }} config
 */
export async function transcribeWithAssemblyAI(audio, config = {}) {
  const provider = 'assemblyai';
  /**
   * `model` stays undefined unless ASSEMBLYAI_MODEL is set: the account default
   * is always a valid id, whereas a stale hard-coded one would 400.
   */
  const { apiKey, language, timeoutMs = 120_000, pollTimeoutMs = 120_000, pollIntervalMs = 2_000 } = config;

  if (!apiKey) {
    throw new TranscriptionError(ERROR_CODES.MISSING_KEY, 'ASSEMBLYAI_API_KEY is not configured.', {
      provider,
      retryable: false,
      userMessage: 'The AssemblyAI engine has no API key configured on this deployment.',
    });
  }

  const source = normaliseAudioSource(audio, provider);
  const startedAt = Date.now();
  const baseUrl = trimSlash(config.baseUrl) || ASSEMBLYAI_DEFAULT_BASE_URL;
  const headers = { authorization: apiKey };

  /* ---- Step 1: give AssemblyAI a URL it can read ------------------------ */
  let audioUrl = source.url;
  if (!audioUrl) {
    const uploaded = await requestJson(`${baseUrl}/upload`, {
      provider,
      method: 'POST',
      timeoutMs,
      headers: { ...headers, 'Content-Type': audio.contentType || 'application/octet-stream' },
      body: source.buffer,
    });
    audioUrl = uploaded?.upload_url;
    if (!audioUrl) {
      throw new TranscriptionError(
        ERROR_CODES.PROVIDER_ERROR,
        'AssemblyAI upload succeeded but returned no upload_url.',
        { provider, userMessage: describeCode(ERROR_CODES.PROVIDER_ERROR) },
      );
    }
  }

  /* ---- Step 2: create the transcript job -------------------------------- */
  const jobBody = { audio_url: audioUrl };
  if (config.model) {
    // Only sent when explicitly configured — the account default is always valid,
    // whereas a stale model id would be rejected with a 400.
    jobBody.speech_models = [config.model];
  }
  const requested = String(language || '').toLowerCase();
  if (requested && requested !== 'auto') {
    jobBody.language_code = requested;
  } else {
    jobBody.language_detection = true;
  }

  const job = await requestJson(`${baseUrl}/transcript`, {
    provider,
    method: 'POST',
    timeoutMs,
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(jobBody),
  });

  const jobId = job?.id;
  if (!jobId) {
    throw new TranscriptionError(
      ERROR_CODES.PROVIDER_ERROR,
      'AssemblyAI did not return a transcript id.',
      { provider, userMessage: describeCode(ERROR_CODES.PROVIDER_ERROR) },
    );
  }

  /* ---- Step 3: poll until the job finishes ------------------------------ */
  const deadline = Date.now() + pollTimeoutMs;
  let current = job;

  while (!isAssemblyAIDone(current?.status)) {
    if (Date.now() > deadline) {
      throw new TranscriptionError(
        ERROR_CODES.TIMEOUT,
        `AssemblyAI transcript ${jobId} was still "${current?.status}" after ${pollTimeoutMs}ms.`,
        { provider, userMessage: describeCode(ERROR_CODES.TIMEOUT) },
      );
    }
    await wait(pollIntervalMs);
    current = await requestJson(`${baseUrl}/transcript/${jobId}`, {
      provider,
      method: 'GET',
      timeoutMs,
      headers,
    });
  }

  if (current.status === 'error') {
    const detail = extractProviderMessage(current) || current.error || 'unknown error';
    throw new TranscriptionError(
      ERROR_CODES.PROVIDER_ERROR,
      `AssemblyAI transcript ${jobId} failed: ${detail}`,
      {
        provider,
        retryable: false,
        userMessage: `AssemblyAI could not process this audio (${String(detail).slice(0, 120)}).`,
      },
    );
  }

  const result = parseAssemblyAITranscript(current);
  return {
    ...result,
    engine: 'assemblyai',
    model: jobBody.speech_models?.[0] ?? 'universal',
    requestId: current.id ?? jobId,
    elapsedMs: Date.now() - startedAt,
  };
}

function isAssemblyAIDone(status) {
  return status === 'completed' || status === 'error';
}

/**
 * Normalise an AssemblyAI transcript object.
 * Note: AssemblyAI timings are **milliseconds**, every other provider uses seconds.
 */
export function parseAssemblyAITranscript(payload = {}) {
  const words = Array.isArray(payload.words) ? payload.words : [];

  const segments = Array.isArray(payload.utterances)
    ? payload.utterances.map((utterance) => ({
        text: tidyTranscript(utterance?.text),
        start: toSeconds(utterance?.start),
        end: toSeconds(utterance?.end),
        speaker: utterance?.speaker ?? null,
      }))
    : [];

  return {
    text: tidyTranscript(payload.text || segments.map((segment) => segment.text).join(' ')),
    segments,
    words: words.map((word) => ({
      word: word?.text ?? word?.word,
      start: toSeconds(word?.start),
      end: toSeconds(word?.end),
      confidence: word?.confidence,
    })),
    confidence: typeof payload.confidence === 'number' ? payload.confidence : average(words.map((w) => w?.confidence)),
    // AssemblyAI reports locale-style codes ("en_us"); callers want "en".
    language: payload.language_code ? String(payload.language_code).split(/[-_]/)[0] : null,
    duration: payload.audio_duration ?? null,
  };
}

/** Milliseconds → seconds, tolerant of a provider that already sent seconds. */
function toSeconds(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value / 1000 : null;
}

/* -------------------------------------------------------------------------- */
/* Engine 4 — Speechmatics (batch API)                                        */
/* -------------------------------------------------------------------------- */

export const SPEECHMATICS_DEFAULT_BASE_URL = 'https://eu1.asr.api.speechmatics.com/v2';
const SPEECHMATICS_DEFAULT_MODEL = 'enhanced';

/**
 * Transcribe a buffered clip with Speechmatics.
 *
 * Flow: submit a batch job (multipart `config` + `data_file`) → poll the job →
 * fetch the transcript. Docs:
 * https://docs.speechmatics.com/api-ref/batch/create-a-new-job
 *
 * @param {{ buffer?: Buffer|Uint8Array, url?: string, contentType?: string, filename?: string }} audio
 * @param {{ apiKey: string, baseUrl?: string, model?: string, language?: string,
 *           timeoutMs?: number, pollTimeoutMs?: number, pollIntervalMs?: number }} config
 */
export async function transcribeWithSpeechmatics(audio, config = {}) {
  const provider = 'speechmatics';
  const {
    apiKey,
    model = SPEECHMATICS_DEFAULT_MODEL,
    language,
    timeoutMs = 120_000,
    pollTimeoutMs = 120_000,
    pollIntervalMs = 2_000,
  } = config;

  if (!apiKey) {
    throw new TranscriptionError(
      ERROR_CODES.MISSING_KEY,
      'SPEECHMATICS_API_KEY is not configured.',
      {
        provider,
        retryable: false,
        userMessage: 'The Speechmatics engine has no API key configured on this deployment.',
      },
    );
  }

  const source = normaliseAudioSource(audio, provider);
  if (source.mode === 'url') {
    // Speechmatics can only ingest bytes we hand it (or a URL inside its own job
    // config), so remote sources are rejected here rather than silently failing.
    throw new TranscriptionError(
      ERROR_CODES.BAD_REQUEST,
      'Speechmatics requires the audio bytes; a remote URL was supplied.',
      {
        provider,
        retryable: false,
        userMessage:
          'Speechmatics does not accept this file directly. Pick another engine for uploads from storage.',
      },
    );
  }

  const startedAt = Date.now();
  const baseUrl = trimSlash(config.baseUrl) || SPEECHMATICS_DEFAULT_BASE_URL;
  const headers = { Authorization: `Bearer ${apiKey}` };

  /* ---- Step 1: submit the job ------------------------------------------ */
  const requested = String(language || '').toLowerCase();
  const jobConfig = {
    type: 'transcription',
    transcription_config: {
      language: !requested || requested === 'auto' ? 'en' : requested,
      model,
    },
  };

  const form = buildMultipartForm([
    { name: 'config', value: JSON.stringify(jobConfig) },
    {
      name: 'data_file',
      value: source.buffer,
      filename: audio.filename || 'audio',
      contentType: audio.contentType || 'application/octet-stream',
    },
  ]);

  const created = await requestJson(`${baseUrl}/jobs/`, {
    provider,
    method: 'POST',
    timeoutMs,
    headers: { ...headers, 'Content-Type': form.contentType },
    body: form.body,
  });

  const jobId = created?.id ?? created?.job?.id;
  if (!jobId) {
    throw new TranscriptionError(
      ERROR_CODES.PROVIDER_ERROR,
      'Speechmatics did not return a job id.',
      { provider, userMessage: describeCode(ERROR_CODES.PROVIDER_ERROR) },
    );
  }

  /* ---- Step 2: wait for the job to finish ------------------------------- */
  const deadline = Date.now() + pollTimeoutMs;
  let status = created?.job?.status ?? 'running';

  while (status !== 'done' && status !== 'rejected' && status !== 'deleted') {
    if (Date.now() > deadline) {
      throw new TranscriptionError(
        ERROR_CODES.TIMEOUT,
        `Speechmatics job ${jobId} was still "${status}" after ${pollTimeoutMs}ms.`,
        { provider, userMessage: describeCode(ERROR_CODES.TIMEOUT) },
      );
    }
    await wait(pollIntervalMs);
    const details = await requestJson(`${baseUrl}/jobs/${jobId}`, {
      provider,
      method: 'GET',
      timeoutMs,
      headers,
    });
    status = details?.job?.status ?? status;
    if (details?.job?.errors?.length) {
      const first = details.job.errors[0];
      throw new TranscriptionError(
        ERROR_CODES.PROVIDER_ERROR,
        `Speechmatics job ${jobId} failed: ${first?.type ?? ''} ${first?.message ?? ''}`.trim(),
        {
          provider,
          retryable: false,
          userMessage: `Speechmatics rejected this audio${
            first?.message ? ` (${String(first.message).slice(0, 120)})` : ''
          }.`,
        },
      );
    }
  }

  if (status !== 'done') {
    throw new TranscriptionError(
      ERROR_CODES.PROVIDER_ERROR,
      `Speechmatics job ${jobId} ended with status "${status}".`,
      {
        provider,
        retryable: false,
        userMessage: 'Speechmatics could not process this audio.',
      },
    );
  }

  /* ---- Step 3: pull the transcript ------------------------------------- */
  const transcript = await requestJson(
    `${baseUrl}/jobs/${jobId}/transcript?format=json-v2`,
    { provider, method: 'GET', timeoutMs, headers },
  );
  const parsed = parseSpeechmaticsTranscript(transcript);

  return {
    ...parsed,
    engine: 'speechmatics',
    model,
    requestId: jobId,
    elapsedMs: Date.now() - startedAt,
  };
}

/**
 * Normalise a Speechmatics `json-v2` transcript.
 *
 * The response is a flat list of `word`, `punctuation` and `entity` items, each
 * with its own alternatives and timings. Rebuilding readable text requires
 * honouring the language's word delimiter (provided in `language_pack_info`)
 * and the `attaches_to` direction of every punctuation mark.
 */
export function parseSpeechmaticsTranscript(payload = {}) {
  const results = Array.isArray(payload?.results) ? payload.results : [];
  const words = [];
  const segments = [];

  // Most languages separate words with a space; Japanese and friends do not, and
  // the response tells us which delimiter this language uses.
  const delimiter = payload?.metadata?.language_pack_info?.word_delimiter ?? ' ';

  let text = '';
  let pendingPrefix = '';
  let segmentStart = 0;
  let segmentStartTime = null;
  let segmentEndTime = null;

  /** Close the sentence being accumulated (called on end-of-sentence marks). */
  const flushSegment = () => {
    const cleaned = tidyTranscript(text.slice(segmentStart));
    if (cleaned) {
      segments.push({ text: cleaned, start: segmentStartTime, end: segmentEndTime });
    }
    segmentStart = text.length;
    segmentStartTime = null;
    segmentEndTime = null;
  };

  for (const item of results) {
    const alternative = item?.alternatives?.[0];
    const content = alternative?.content ?? '';
    if (!content) continue;

    if (item.type === 'punctuation') {
      // `attaches_to: 'previous'` glues the mark to the word before it; 'next'
      // glues it to the one after; anything else is safest treated as trailing.
      if (item.attaches_to === 'next') {
        pendingPrefix = content;
      } else {
        text += content;
      }
      if (item.is_eos) flushSegment();
      continue;
    }

    if (segmentStartTime === null) segmentStartTime = item.start_time ?? null;
    if (item.end_time !== undefined && item.end_time !== null) segmentEndTime = item.end_time;

    text += text ? delimiter : '';
    text += pendingPrefix + content;
    pendingPrefix = '';

    words.push({
      word: content,
      start: item.start_time ?? null,
      end: item.end_time ?? null,
      confidence: alternative?.confidence ?? null,
    });
  }

  flushSegment(); // whatever is left after the final word

  return {
    text: tidyTranscript(text),
    segments,
    words,
    confidence: average(words.map((word) => word.confidence)),
    language: payload?.metadata?.transcription_config?.language ?? null,
    duration: payload?.job?.duration ?? null,
  };
}

/**
 * Pull just the counters out of a `/usage` response, so the UI can show
 * "audio hours used" without knowing the provider's payload shape.
 */
export function summariseSpeechmaticsUsage(payload = {}) {
  // The API documents a `summary` array plus a `details` array; either can be
  // empty depending on the account, so prefer whichever carries data.
  const collection =
    Array.isArray(payload?.summary) && payload.summary.length
      ? payload.summary
      : Array.isArray(payload?.details)
        ? payload.details
        : [];
  const transcription = collection.filter((row) => row?.type === 'transcription');
  const rows = transcription.length ? transcription : collection;

  return {
    since: payload?.since ?? null,
    until: payload?.until ?? null,
    jobs: rows.reduce((total, row) => total + (row?.count ?? 0), 0),
    hours: Math.round(rows.reduce((total, row) => total + (row?.duration_hrs ?? 0), 0) * 100) / 100,
    breakdown: rows.map((row) => ({
      language: row?.language ?? null,
      model: row?.model ?? row?.operating_point ?? null,
      count: row?.count ?? 0,
      hours: row?.duration_hrs ?? 0,
    })),
  };
}

export { buildMultipartBody };
