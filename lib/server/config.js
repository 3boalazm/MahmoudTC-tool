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

import { DEFAULT_ENGINE_ORDER, ENGINE_IDS } from '../engines-meta.js';
import { effectiveKey } from './credentials.js';

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

/** Validate a comma-separated ENGINE_ORDER against the known engines. */
function parseEngineOrder(value) {
  const requested = String(value ?? '')
    .split(',')
    .map((id) => id.trim().toLowerCase())
    .filter((id) => ENGINE_IDS.includes(id));

  const unique = [...new Set(requested)];
  // Append anything the operator forgot so a typo can never disable an engine.
  for (const id of DEFAULT_ENGINE_ORDER) {
    if (!unique.includes(id)) unique.push(id);
  }
  return unique;
}

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
  assemblyai: {
    apiKey: firstDefined(
      process.env.ASSEMBLYAI_API_KEY,
      process.env.ASSEMBLYAI_KEY,
      process.env.AAI_API_KEY,
    ),
    /**
     * Left empty by default: AssemblyAI's own account default is always valid,
     * whereas a stale model id would be rejected with a 400. Set it to a current
     * model id (e.g. `universal-3-pro`, `universal-2`) to pin one.
     */
    model: firstDefined(process.env.ASSEMBLYAI_MODEL),
    timeoutMs: Math.min(int(process.env.ASSEMBLYAI_TIMEOUT_MS, 120_000), functionBudgetMs),
    pollTimeoutMs: Math.min(
      int(process.env.ASSEMBLYAI_POLL_TIMEOUT_MS, 120_000),
      Math.max(5_000, functionBudgetMs - 8_000),
    ),
    pollIntervalMs: int(process.env.ASSEMBLYAI_POLL_INTERVAL_MS, isVercel ? 1_500 : 2_000),
    baseUrl: firstDefined(process.env.ASSEMBLYAI_BASE_URL),
  },
  speechmatics: {
    apiKey: firstDefined(
      process.env.SPEECHMATICS_API_KEY,
      process.env.SPEECHMATICS_KEY,
      process.env.SM_API_KEY,
    ),
    /** standard | enhanced | melia-1 */
    model: firstDefined(process.env.SPEECHMATICS_MODEL) || 'enhanced',
    timeoutMs: Math.min(int(process.env.SPEECHMATICS_TIMEOUT_MS, 120_000), functionBudgetMs),
    pollTimeoutMs: Math.min(
      int(process.env.SPEECHMATICS_POLL_TIMEOUT_MS, 120_000),
      Math.max(5_000, functionBudgetMs - 8_000),
    ),
    pollIntervalMs: int(process.env.SPEECHMATICS_POLL_INTERVAL_MS, isVercel ? 1_500 : 2_000),
    /**
     * Region matters: a key issued for one region is rejected by another.
     * Current docs use the EU host; US accounts use `us1.asr.api.speechmatics.com`.
     */
    baseUrl:
      firstDefined(process.env.SPEECHMATICS_BASE_URL) ||
      'https://eu1.asr.api.speechmatics.com/v2',
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
   * Failover order for `engine=auto`, and the order the remaining engines are
   * tried in when the primary one fails. Only configured engines are used.
   */
  engineOrder: parseEngineOrder(process.env.ENGINE_ORDER),
  usage: {
    /** Exposes account-level consumption in the UI. Turn off on public deploys. */
    enabled: truthy(process.env.ENABLE_USAGE_PANEL, true),
    /** How long provider-reported usage is cached, in seconds. */
    cacheSeconds: int(process.env.USAGE_CACHE_SEC, 300),
    /** Look-back window for consumption queries, in days. */
    periodDays: int(process.env.USAGE_PERIOD_DAYS, 30),
    /** Timeout for the (non-critical) management API calls. */
    timeoutMs: int(process.env.USAGE_TIMEOUT_MS, 8_000),
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

/* -------------------------------------------------------------------------- */
/* Credentials                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The deployment's own keys (`DEEPGRAM_API_KEY`, …), keyed by engine id. These
 * are the fallback for a visitor who has not supplied their own.
 */
export function environmentKeys() {
  return Object.fromEntries(ENGINE_IDS.map((id) => [id, serverConfig[id]?.apiKey || null]));
}

/**
 * One engine's configuration for **this request**: the environment settings,
 * with the API key resolved `settings cookie → environment`.
 *
 * Everything else (models, timeouts, base URLs, poll intervals) stays
 * deployment-controlled — a visitor brings a key, not a provider contract.
 *
 * @param {string} engine
 * @param {Record<string, { key?: string, disabled?: boolean }>} [credentials]
 */
export function resolveEngineConfig(engine, credentials = {}) {
  const base = serverConfig[engine];
  if (!base) return null;

  return {
    ...base,
    apiKey: effectiveKey(engine, base.apiKey, credentials[engine]),
  };
}

/** Resolved configuration for every engine, keyed by engine id. */
export function resolveAllEngineConfigs(credentials = {}) {
  return Object.fromEntries(
    ENGINE_IDS.map((id) => [id, resolveEngineConfig(id, credentials)]),
  );
}

/**
 * Which engines can actually run for this request. Derived from the same rule
 * as everything else — "is there an effective key?" — so adding an engine never
 * means remembering to update this by hand.
 *
 * Called without arguments it reports the deployment's own capabilities.
 */
export function engineAvailability(credentials = {}) {
  return Object.fromEntries(
    ENGINE_IDS.map((id) => [id, Boolean(resolveEngineConfig(id, credentials)?.apiKey)]),
  );
}

/** Engine ids that have credentials, in the configured failover order. */
export function availableEngineOrder(credentials = {}) {
  const availability = engineAvailability(credentials);
  return serverConfig.engineOrder.filter((id) => availability[id]);
}

/** True when at least one engine has credentials for this request. */
export function hasAnyEngine(credentials = {}) {
  return availableEngineOrder(credentials).length > 0;
}
