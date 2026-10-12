/**
 * lib/server/usage.js
 * ---------------------------------------------------------------------------
 * Answers two different questions honestly:
 *
 *   1. "What did *this app* consume?" — counted locally, per engine. Always
 *      available, but only since the process started (it is an in-memory
 *      counter, not a database).
 *
 *   2. "What does my provider account say I have left?" — fetched from the
 *      provider's own management API where one exists:
 *        · Deepgram      → remaining balance (credit) + audio hours used
 *        · Speechmatics  → audio hours and job counts for the period
 *        · Gladia        → not exposed publicly
 *        · AssemblyAI    → not exposed publicly
 *
 * Nothing here ever invents a number. When a provider does not publish usage,
 * the field is `null` and the UI says so, rather than showing a fabricated
 * "remaining" figure the account owner might act on.
 */

import {
  summariseSpeechmaticsUsage,
} from '@/lib/engines';
import { resolveEngineConfig, serverConfig } from '@/lib/server/config';
import { fingerprintKey } from '@/lib/server/credentials';
import { ENGINES, ENGINE_IDS } from '@/lib/engines-meta';

/* -------------------------------------------------------------------------- */
/* Local counters                                                             */
/* -------------------------------------------------------------------------- */

/** engineId → counters */
const counters = new Map();

function bucketFor(engine) {
  if (!counters.has(engine)) {
    counters.set(engine, {
      requests: 0,
      successes: 0,
      failures: 0,
      audioSeconds: 0,
      fallbackWins: 0,
      lastUsedAt: null,
      lastErrorCode: null,
      totalMs: 0,
    });
  }
  return counters.get(engine);
}

/**
 * Record the outcome of one engine attempt.
 * Called from the transcribe route for every attempt, success or failure.
 *
 * @param {string} engine
 * @param {{ ok: boolean, audioSeconds?: number|null, elapsedMs?: number|null,
 *           code?: string|null, usedFallback?: boolean }} outcome
 */
export function recordAttempt(engine, outcome = {}) {
  if (!ENGINE_IDS.includes(engine)) return;
  const bucket = bucketFor(engine);

  bucket.requests += 1;
  bucket.lastUsedAt = new Date().toISOString();
  bucket.totalMs += outcome.elapsedMs ?? 0;

  if (outcome.ok) {
    bucket.successes += 1;
    bucket.audioSeconds += Math.max(0, Math.round(outcome.audioSeconds ?? 0));
    if (outcome.usedFallback) bucket.fallbackWins += 1;
  } else {
    bucket.failures += 1;
    bucket.lastErrorCode = outcome.code ?? null;
  }
}

/** Snapshot of the local counters, one entry per engine. */
export function localUsage() {
  const startedAt = processStartIso();
  return ENGINE_IDS.map((id) => {
    const bucket = bucketFor(id);
    return {
      engine: id,
      requests: bucket.requests,
      successes: bucket.successes,
      failures: bucket.failures,
      audioSeconds: bucket.audioSeconds,
      audioMinutes: Math.round((bucket.audioSeconds / 60) * 10) / 10,
      fallbackWins: bucket.fallbackWins,
      averageMs: bucket.requests ? Math.round(bucket.totalMs / bucket.requests) : null,
      lastUsedAt: bucket.lastUsedAt,
      lastErrorCode: bucket.lastErrorCode,
      since: startedAt,
    };
  });
}

let processStartedAt = null;
function processStartIso() {
  if (!processStartedAt) processStartedAt = new Date().toISOString();
  return processStartedAt;
}

/** Test helper. */
export function resetLocalUsage() {
  counters.clear();
  processStartedAt = new Date().toISOString();
}

/* -------------------------------------------------------------------------- */
/* Provider-reported usage (best effort, cached)                              */
/* -------------------------------------------------------------------------- */

/*
 * Cache key: `engineId:keyFingerprint`.
 *
 * The fingerprint matters — these are account-level figures, so two different
 * keys must never share an entry. A visitor who brings their own key sees their
 * own numbers, and nothing leaks across browsers.
 */
const cache = new Map();

function cached(cacheKey) {
  const entry = cache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() - entry.at > serverConfig.usage.cacheSeconds * 1000) return null;
  return entry.value;
}

function store(cacheKey, value) {
  // Bounded so a busy deployment cannot grow this without limit.
  if (cache.size > 200) cache.clear();
  cache.set(cacheKey, { at: Date.now(), value });
  return value;
}

const isoDate = (date) => date.toISOString().slice(0, 10);

/** `YYYY-MM-DD` for the start of the configured look-back window. */
function periodStart(days = serverConfig.usage.periodDays) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return isoDate(date);
}

const periodEnd = () => isoDate(new Date());

/** Small helper for these non-critical management calls. */
async function getJson(url, headers) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), serverConfig.usage.timeoutMs);
  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) {
      return { ok: false, status: response.status, body: null };
    }
    return { ok: true, status: response.status, body: await response.json() };
  } catch (error) {
    return { ok: false, status: 0, error: error?.message || String(error), body: null };
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ Deepgram */

/**
 * Deepgram is the only provider here that exposes a *remaining balance*, which
 * makes it the only one able to answer "how much is left?" with real data.
 *
 * GET /v1/projects                                  → pick the first project
 * GET /v1/projects/{id}/balances                    → remaining credit
 * GET /v1/projects/{id}/usage/breakdown?start=&end= → hours processed
 *
 * https://developers.deepgram.com/reference/manage/billing/get
 */
export async function fetchDeepgramUsage(credentials = {}) {
  const config = resolveEngineConfig('deepgram', credentials);
  const apiKey = config?.apiKey;
  if (!apiKey) return null;

  const cacheKey = `deepgram:${fingerprintKey(apiKey)}`;
  const cachedValue = cached(cacheKey);
  if (cachedValue) return cachedValue;

  const base = (config.baseUrl || 'https://api.deepgram.com/v1/listen').replace(
    /\/v1\/listen\/?$/,
    '',
  );
  const headers = { Authorization: `Token ${apiKey}` };

  const projects = await getJson(`${base}/v1/projects`, headers);
  if (!projects.ok || !Array.isArray(projects.body?.projects) || !projects.body.projects.length) {
    return store(cacheKey, {
      available: false,
      error:
        projects.status === 401 || projects.status === 403
          ? 'The API key cannot read management data (needs a key with member/admin scope).'
          : 'Deepgram usage could not be read right now.',
    });
  }

  const project = projects.body.projects[0];
  const id = project.project_id;

  const [balances, breakdown] = await Promise.all([
    getJson(`${base}/v1/projects/${id}/balances`, headers),
    getJson(
      `${base}/v1/projects/${id}/usage/breakdown?start=${periodStart()}&end=${periodEnd()}&grouping=models`,
      headers,
    ),
  ]);

  const balanceList = Array.isArray(balances.body?.balances) ? balances.body.balances : [];
  const remaining = balanceList.reduce((total, entry) => total + (entry.amount ?? 0), 0);

  const rows = Array.isArray(breakdown.body?.results) ? breakdown.body.results : [];
  const hours = rows.reduce((total, row) => total + (row.hours ?? 0), 0);
  const requests = rows.reduce((total, row) => total + (row.requests ?? 0), 0);

  return store(cacheKey, {
    available: true,
    project: { id, name: project.name ?? null },
    period: { start: periodStart(), end: periodEnd() },
    remaining:
      balances.ok && balanceList.length
        ? {
            amount: Math.round(remaining * 100) / 100,
            units: balanceList[0].units ?? 'USD',
            entries: balanceList.length,
          }
        : null,
    consumption: breakdown.ok
      ? {
          hours: Math.round(hours * 100) / 100,
          requests,
          byModel: rows
            .map((row) => ({
              model: (row.grouping?.models ?? []).join(', ') || null,
              hours: Math.round((row.hours ?? 0) * 100) / 100,
              requests: row.requests ?? 0,
            }))
            .filter((row) => row.hours > 0)
            .slice(0, 6),
        }
      : null,
  });
}

/* -------------------------------------------------------------- Speechmatics */

/**
 * GET {base}/usage?since=&until=  → { since, until, summary[], details[] }
 * https://docs.speechmatics.com/api-ref/batch/get-usage-statistics
 *
 * Note: this reports **batch** usage only, and exposes no remaining-credit
 * figure — plans are billed by minute/hour, so "left" is not knowable from here.
 */
export async function fetchSpeechmaticsUsage(credentials = {}) {
  const config = resolveEngineConfig('speechmatics', credentials);
  const apiKey = config?.apiKey;
  if (!apiKey) return null;

  const cacheKey = `speechmatics:${fingerprintKey(apiKey)}`;
  const cachedValue = cached(cacheKey);
  if (cachedValue) return cachedValue;

  const base = config.baseUrl;
  const result = await getJson(
    `${base}/usage?since=${periodStart()}&until=${periodEnd()}`,
    { Authorization: `Bearer ${apiKey}` },
  );

  if (!result.ok) {
    return store(cacheKey, {
      available: false,
      error:
        result.status === 401 || result.status === 403
          ? 'The Speechmatics key was rejected, or it belongs to a different region than SPEECHMATICS_BASE_URL.'
          : 'Speechmatics usage could not be read right now.',
    });
  }

  return store(cacheKey, {
    available: true,
    period: { start: periodStart(), end: periodEnd() },
    // The API returns usage, never a balance — we do not pretend otherwise.
    remaining: null,
    consumption: summariseSpeechmaticsUsage(result.body),
    note: 'Batch usage only. Speechmatics does not expose a remaining-credit figure.',
  });
}

/* ------------------------------------------------------- Providers with none */

/**
 * Gladia and AssemblyAI publish no usage or balance endpoint, so there is
 * nothing truthful to fetch. Returning `null` lets the UI fall back to local
 * counters and say exactly that, instead of showing an invented number.
 */
const NO_PROVIDER_USAGE = {
  gladia: 'Gladia exposes usage only in its dashboard, not over the API.',
  assemblyai:
    'AssemblyAI exposes usage only in its dashboard, not over the API (there is no public usage endpoint).',
};

/* -------------------------------------------------------------------------- */
/* Aggregation                                                                */
/* -------------------------------------------------------------------------- */

const FETCHERS = {
  deepgram: fetchDeepgramUsage,
  speechmatics: fetchSpeechmaticsUsage,
};

/**
 * Build the full usage report returned by `GET /api/usage`.
 *
 * Everything is best-effort and independent: a provider outage degrades one
 * card, never the whole panel.
 *
 * @param {{ availability: Record<string, boolean>,
 *           credentials?: Record<string, { key?: string, disabled?: boolean }> }} options
 */
export async function buildUsageReport({ availability, credentials = {} }) {
  const local = Object.fromEntries(localUsage().map((entry) => [entry.engine, entry]));

  const providerResults = await Promise.all(
    ENGINE_IDS.map(async (id) => {
      const fetcher = FETCHERS[id];
      if (!fetcher) {
        return [id, { available: false, skipped: true, error: NO_PROVIDER_USAGE[id] ?? null }];
      }
      if (!availability[id]) {
        return [id, { available: false, skipped: true, error: 'No API key configured.' }];
      }
      try {
        return [id, (await fetcher(credentials)) ?? { available: false, error: 'No data returned.' }];
      } catch (error) {
        return [id, { available: false, error: error?.message || String(error) }];
      }
    }),
  );

  const engines = ENGINE_IDS.map((id) => {
    const meta = ENGINES.find((engine) => engine.id === id);
    const provider = Object.fromEntries(providerResults)[id] ?? null;
    return {
      engine: id,
      label: meta?.label ?? id,
      model: meta?.model ?? null,
      configured: Boolean(availability[id]),
      reportsUsage: meta?.usage ?? 'none',
      dashboardUrl: meta?.dashboardUrl ?? null,
      provider,
      local: local[id],
    };
  });

  return {
    period: { start: periodStart(), end: periodEnd(), days: serverConfig.usage.periodDays },
    cacheSeconds: serverConfig.usage.cacheSeconds,
    engines,
    totals: {
      requests: engines.reduce((total, entry) => total + (entry.local?.requests ?? 0), 0),
      audioMinutes: Math.round(
        engines.reduce((total, entry) => total + (entry.local?.audioSeconds ?? 0), 0) / 60,
      ),
      fallbackWins: engines.reduce((total, entry) => total + (entry.local?.fallbackWins ?? 0), 0),
    },
    // Kept explicit so the UI (and the reader of the README) is never misled
    // about what these numbers are.
    disclosure: {
      localCounters:
        'Per-engine counters since this server process started. They reset on every deploy or restart and are per-instance.',
      providerFigures:
        'Provider figures come from each vendor’s own API and are cached for a few minutes.',
      missing:
        'No remaining-credit figure exists for engines whose provider does not publish one; those cards say so explicitly.',
    },
  };
}
