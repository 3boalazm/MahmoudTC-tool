/**
 * lib/server/verify.js
 * ---------------------------------------------------------------------------
 * "Test connection" for one engine, given a key.
 *
 * A cheap authenticated probe per provider — not a transcription — so the
 * settings page can answer "does this key actually work?" in one round trip
 * without spending audio credits.
 *
 * Each probe maps a provider response onto the same small vocabulary the UI
 * translates:
 *
 *   OK          — the provider accepted the key
 *   REJECTED    — 401/403: wrong key, wrong region, or expired
 *   FORBIDDEN   — the key works but lacks the scope this probe needs
 *   UNREACHABLE — network/timeout: nothing could be concluded about the key
 *   UNEXPECTED  — the provider answered oddly (e.g. HTML from a proxy)
 *
 * A probe must never be able to fail *closed*: a 404 or a 400 means the request
 * reached an authenticated endpoint and was answered, which is all we need.
 */

import {
  ASSEMBLYAI_DEFAULT_BASE_URL,
  DEEPGRAM_DEFAULT_BASE_URL,
  GLADIA_DEFAULT_BASE_URL,
  SPEECHMATICS_DEFAULT_BASE_URL,
} from '../engines.js';
import { resolveEngineConfig } from './config.js';

/** Probes are interactive: keep them short so the button feels responsive. */
const PROBE_TIMEOUT_MS = 8_000;

/** A syntactically valid id that will never exist, for the Gladia read probe. */
const NULL_UUID = '00000000-0000-0000-0000-000000000000';

/**
 * Definitions are data, so the route stays a thin wrapper and a new engine
 * needs one entry here rather than a new branch in the UI.
 *
 * `okStatuses` is the set of responses that prove the key was accepted: the
 * provider processed an authenticated request and simply had nothing to show.
 */
const PROBES = {
  deepgram: {
    label: 'Deepgram',
    /*
     * /v1/auth/token validates the key itself and works with *any* scope, so a
     * perfectly good listen-only key is never reported as broken. The
     * management endpoints (used by the usage panel) need member/admin scope and
     * would produce exactly that false negative.
     */
    url: (config) =>
      `${(config.baseUrl || DEEPGRAM_DEFAULT_BASE_URL).replace(/\/v1\/listen\/?$/, '')}/v1/auth/token`,
    headers: (key) => ({ Authorization: `Token ${key}` }),
    okStatuses: [200],
  },
  gladia: {
    label: 'Gladia',
    // Reading a non-existent job: 404 means "authenticated, nothing there".
    url: (config) => `${config.baseUrl || GLADIA_DEFAULT_BASE_URL}/pre-recorded/${NULL_UUID}`,
    headers: (key) => ({ 'x-gladia-key': key }),
    okStatuses: [200, 404],
  },
  assemblyai: {
    label: 'AssemblyAI',
    url: (config) => `${config.baseUrl || ASSEMBLYAI_DEFAULT_BASE_URL}/transcript?limit=1`,
    headers: (key) => ({ authorization: key }),
    okStatuses: [200, 404],
  },
  speechmatics: {
    label: 'Speechmatics',
    url: (config) => `${config.baseUrl || SPEECHMATICS_DEFAULT_BASE_URL}/jobs?limit=1`,
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
    okStatuses: [200, 404],
  },
};

export const VERIFY_ENGINES = Object.keys(PROBES);

/**
 * Probe one engine.
 *
 * @param {string} engine
 * @param {{ apiKey?: string, baseUrl?: string }} [config] resolved engine config;
 *        defaults to the deployment's own configuration.
 * @returns {Promise<{ ok: boolean, code: string, status: number|null, detail: string|null }>}
 */
export async function verifyEngineCredentials(engine, config = resolveEngineConfig(engine, {})) {
  const probe = PROBES[engine];
  if (!probe) {
    return { ok: false, code: 'UNKNOWN_ENGINE', status: null, detail: null };
  }
  if (!config?.apiKey) {
    return { ok: false, code: 'MISSING_KEY', status: null, detail: null };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(probe.url(config), {
      method: 'GET',
      headers: { ...probe.headers(config.apiKey), accept: 'application/json' },
      signal: controller.signal,
      cache: 'no-store',
    });

    if (probe.okStatuses.includes(response.status)) {
      return { ok: true, code: 'OK', status: response.status, detail: null };
    }

    const known = {
      401: 'REJECTED',
      402: 'NO_CREDIT',
      403: 'FORBIDDEN',
      429: 'RATE_LIMITED',
    }[response.status];
    if (known) return { ok: false, code: known, status: response.status, detail: null };

    // Anything else still proves the request got through — but the provider is
    // unhappy, so report it rather than claiming success.
    return {
      ok: false,
      code: response.status >= 500 ? 'PROVIDER_ERROR' : 'UNEXPECTED',
      status: response.status,
      detail: null,
    };
  } catch (error) {
    const aborted = error?.name === 'AbortError';
    return {
      ok: false,
      code: aborted ? 'TIMEOUT' : 'UNREACHABLE',
      status: null,
      detail: aborted ? `No answer within ${PROBE_TIMEOUT_MS / 1000}s` : error?.message || String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

/** True when this deployment knows how to probe the engine. */
export function canVerify(engine) {
  return Boolean(PROBES[engine]);
}

/** Exported for tests that reason about the probe budget. */
export { PROBE_TIMEOUT_MS };
