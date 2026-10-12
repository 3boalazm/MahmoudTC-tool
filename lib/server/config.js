/**
 * lib/server/config.js
 * ---------------------------------------------------------------------------
 * Single source of truth for runtime configuration. Everything is read from
 * `process.env` **on the server only** — nothing here is ever bundled into
 * client JavaScript, which is what keeps the API keys secret.
 *
 * Serverless awareness
 *   Vercel caps a serverless request body at 4.5 MB and a function's runtime at
 *   the plan maximum (60 s on Hobby, 300 s on Pro). The defaults below adapt to
 *   that automatically so a deploy cannot fail with an opaque platform error:
 *   the inline upload ceiling drops to 4 MB and every provider timeout is
 *   clamped so the route always gets a chance to return real JSON.
 */

const truthy = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const int = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/** Keys are accepted under a couple of common aliases to reduce setup friction. */
const firstDefined = (...values) =>
  values.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim() ??
  '';

/** True when running inside a Vercel deployment (production, preview or dev). */
const isVercel = process.env.VERCEL === '1' || Boolean(process.env.VERCEL_ENV);

/** Vercel hard-caps a serverless request body at 4.5 MB. */
const VERCEL_BODY_LIMIT_BYTES = 4.5 * 1024 * 1024;
const VERCEL_SAFE_UPLOAD_MB = 4;

/**
 * `maxDuration` declared in app/api/transcribe/route.js — keep these two in sync
 * (raise both to 300 on a Pro plan; see the comment in that file).
 */
const ROUTE_MAX_DURATION_SEC = 60;

/**
 * Wall-clock budget for the provider work inside one function invocation. We
 * deliberately stop short of the platform limit so the route can still write a
 * JSON error instead of being killed mid-flight.
 */
const defaultBudgetMs = isVercel
  ? (ROUTE_MAX_DURATION_SEC - 5) * 1000
  : 120_000;

const functionBudgetMs = int(process.env.FUNCTION_BUDGET_MS, defaultBudgetMs);

const maxUploadMb = int(
  process.env.MAX_UPLOAD_MB,
  isVercel ? VERCEL_SAFE_UPLOAD_MB : 25,
);

/** Vercel Blob credentials — present only when a Blob store is connected. */
const blobToken = firstDefined(process.env.BLOB_READ_WRITE_TOKEN);

export const serverConfig = {
  deepgram: {
    apiKey: firstDefined(
      process.env.DEEPGRAM_API_KEY,
      process.env.DEEPGRAM_KEY,
      process.env.DG_API_KEY,
    ),
    model: firstDefined(process.env.DEEPGRAM_MODEL) || 'nova-2',
    timeoutMs: Math.min(int(process.env.DEEPGRAM_TIMEOUT_MS, 120_000), functionBudgetMs),
    /** Optional override, e.g. a self-hosted gateway or a mock in tests. */
    baseUrl: firstDefined(process.env.DEEPGRAM_BASE_URL),
  },
  gladia: {
    apiKey: firstDefined(process.env.GLADIA_API_KEY, process.env.GLADIA_KEY),
    timeoutMs: Math.min(int(process.env.GLADIA_TIMEOUT_MS, 120_000), functionBudgetMs),
    // Leave headroom for the upload + create-job round trips.
    pollTimeoutMs: Math.min(
      int(process.env.GLADIA_POLL_TIMEOUT_MS, 120_000),
      Math.max(5_000, functionBudgetMs - 8_000),
    ),
    pollIntervalMs: int(process.env.GLADIA_POLL_INTERVAL_MS, isVercel ? 1_500 : 2_000),
    /** Optional override, e.g. a self-hosted gateway or a mock in tests. */
    baseUrl: firstDefined(process.env.GLADIA_BASE_URL),
  },
  upload: {
    /** Inline (through this function) ceiling. */
    maxBytes: maxUploadMb * 1024 * 1024,
    maxMb: maxUploadMb,
    /** Platform ceiling we must never exceed with our own defaults. */
    platformLimitBytes: isVercel ? VERCEL_BODY_LIMIT_BYTES : null,
  },
  blob: {
    /**
     * Large-file mode. When a Blob store is connected, the browser uploads the
     * audio straight to Vercel Blob (bypassing the 4.5 MB function body limit)
     * and the route hands the provider a URL instead of bytes.
     */
    enabled: Boolean(blobToken) && truthy(process.env.ALLOW_BLOB_UPLOAD, true),
    token: blobToken,
    /** Ceiling for a single browser upload, in megabytes. */
    maxUploadMb: int(process.env.BLOB_MAX_UPLOAD_MB, 200),
    /**
     * Audio is deleted from the store immediately after transcription, so this
     * is a *transient* buffer rather than storage.
     */
    deleteAfterUse: truthy(process.env.BLOB_DELETE_AFTER_USE, true),
    /**
     * Exact hostname pattern owned by Vercel Blob. Used to reject arbitrary
     * remote URLs, which would otherwise turn this route into an SSRF proxy.
     */
    urlPattern: /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i,
  },
  rateLimit: {
    max: int(process.env.RATE_LIMIT_MAX, 20),
    windowMs: int(process.env.RATE_LIMIT_WINDOW_SEC, 60) * 1000,
  },
  /**
   * When the primary engine returns a successful but empty transcript (silence,
   * music, wrong language), should we still ask the fallback engine? Defaults
   * to `true` because a silent result from one engine is often a real
   * transcript from another.
   */
  fallbackOnEmptyTranscript: truthy(process.env.FALLBACK_ON_EMPTY_TRANSCRIPT, true),
  /**
   * Allows the UI to expose the "automatic fallback" switch. Set to `false` in
   * hardened deployments where callers must not control fallback behaviour.
   */
  allowClientFallbackOption: truthy(process.env.ALLOW_CLIENT_FALLBACK_OPTION, true),
  /** Platform facts the UI needs to explain its own limits. */
  runtime: {
    isVercel,
    maxDurationSec: ROUTE_MAX_DURATION_SEC,
    functionBudgetMs,
    platformBodyLimitMb: isVercel ? VERCEL_BODY_LIMIT_BYTES / 1024 / 1024 : null,
  },
  isProduction: process.env.NODE_ENV === 'production',
};

/** Booleans describing which engines can actually run in this deployment. */
export function engineAvailability() {
  return {
    deepgram: Boolean(serverConfig.deepgram.apiKey),
    gladia: Boolean(serverConfig.gladia.apiKey),
  };
}

/** True when at least one engine has credentials. */
export function hasAnyEngine() {
  const { deepgram, gladia } = engineAvailability();
  return deepgram || gladia;
}
