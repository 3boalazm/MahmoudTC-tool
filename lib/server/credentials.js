/**
 * lib/server/credentials.js
 * ---------------------------------------------------------------------------
 * Where a provider key can come from, and how one typed into the UI is stored.
 *
 * This app has no database and must run on Vercel, where the filesystem is
 * read-only and every request may land on a different instance. So a key typed
 * into the settings page cannot be "saved on the server" — it is stored in an
 * **httpOnly cookie on the visitor's own device** and sent back with each
 * request from that browser:
 *
 *   • `httpOnly`  — page scripts (and therefore any injected script) cannot read
 *                   it back; there is no XSS path to the key.
 *   • `sameSite=lax` — another site cannot make the browser attach it.
 *   • `secure` in production — it never travels over plain http.
 *   • It is only ever sent to *this* origin, and only this server reads it to
 *                   talk to the provider on your behalf.
 *
 * Precedence, per engine:
 *
 *   1. a key saved from the settings page (an explicit, personal choice)
 *   2. a key in the deployment's environment variables
 *   3. the built-in default shipped in `lib/server/default-keys.js`
 *   4. nothing → the engine is unavailable
 *
 * The settings page can also *disable* an engine for one browser (useful on a
 * shared or public deployment where the operator supplied the env key): the
 * entry then shadows the environment key with `disabled: true`.
 */

import { createHash } from 'node:crypto';

import { ENGINES, ENGINE_IDS } from '../engines-meta.js';
import { canVerify } from './verify.js';

/** One cookie for every engine keeps the jar tidy. */
export const KEYS_COOKIE = 'stt_keys';

/** Half a year: long enough to feel persistent, short enough to expire. */
export const KEYS_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

/** Cookie attributes shared by every write. */
export function keysCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: KEYS_COOKIE_MAX_AGE,
  };
}

const MAX_KEY_LENGTH = 512;

/**
 * Reads the cookie defensively: it is attacker-influenced input like any other,
 * so anything unexpected degrades to "no stored keys" rather than throwing.
 *
 * @returns {Record<string, { key?: string, disabled?: boolean }>}
 */
export function parseCredentialCookie(raw) {
  if (!raw || typeof raw !== 'string') return {};

  /*
   * The value is JSON, and may or may not arrive percent-encoded depending on
   * how the cookie was written, so accept both instead of guessing.
   */
  const attempt = (value) => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };
  const decoded =
    attempt(raw) ??
    attempt((() => {
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    })());

  if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) return {};

  const out = {};
  for (const id of ENGINE_IDS) {
    const entry = decoded[id];
    if (!entry || typeof entry !== 'object') continue;

    const key = typeof entry.key === 'string' ? entry.key.trim() : '';
    const disabled = entry.disabled === true;

    if (key && key.length <= MAX_KEY_LENGTH && !/\s/.test(key)) {
      out[id] = { key };
    } else if (disabled) {
      out[id] = { disabled: true };
    }
  }
  return out;
}

/**
 * Encodes the key map for storage. An empty map returns `''`, which the route
 * turns into a deletion.
 *
 * The value is plain JSON — the cookie layer handles transport escaping, and
 * encoding it here as well would only make the raw cookie harder to inspect.
 */
export function serialiseCredentialCookie(map = {}) {
  const clean = {};
  for (const id of ENGINE_IDS) {
    const entry = map[id];
    if (!entry) continue;
    if (entry.key) clean[id] = { key: entry.key };
    else if (entry.disabled) clean[id] = { disabled: true };
  }
  return Object.keys(clean).length ? JSON.stringify(clean) : '';
}

/**
 * Validates the *shape* of a pasted key.
 *
 * Deliberately not a prefix whitelist: providers rotate key formats, and a
 * wrong guess would lock someone out of a working key. What we do reject is the
 * set of mistakes that always fail — empty values, stray whitespace, and
 * copy-pasted quotes or `Bearer` prefixes.
 */
export function validateKeyShape(engine, rawKey) {
  if (!ENGINES.some((entry) => entry.id === engine)) {
    return { ok: false, reason: 'unknown-engine' };
  }

  const key = typeof rawKey === 'string' ? rawKey.trim() : '';
  if (!key) return { ok: false, reason: 'empty' };
  // Order matters: the most specific diagnosis first, so the hint is the useful one.
  if (/^["'`]|["'`]$/.test(key)) return { ok: false, reason: 'quotes' };
  if (/^(bearer|token|key|apikey)\b/i.test(key)) return { ok: false, reason: 'prefix' };
  if (/\s/.test(key)) return { ok: false, reason: 'whitespace' };
  if (key.length < 8) return { ok: false, reason: 'too-short' };
  if (key.length > MAX_KEY_LENGTH) return { ok: false, reason: 'too-long' };
  if (/^(your[-_ ]?)?(api[-_ ]?)?key$/i.test(key) || /^x{6,}$/i.test(key)) {
    return { ok: false, reason: 'placeholder' };
  }

  return { ok: true, key };
}

/** `sk_live_…4f2a` — enough to recognise a key, not enough to use it. */
export function maskKey(key) {
  if (typeof key !== 'string' || !key) return null;
  if (key.length <= 8) return '••••';
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

/**
 * A stable, non-reversible tag for a key, used to keep provider-usage caches
 * apart. Two different keys must never share a cache entry: the numbers are
 * account-level data.
 */
export function fingerprintKey(key) {
  if (!key) return 'none';
  return createHash('sha256').update(key).digest('hex').slice(0, 12);
}

/** The key a request should use for one engine, honouring cookie precedence. */
export function effectiveKey(engine, envKey, entry) {
  if (entry?.disabled) return null;
  if (entry?.key) return entry.key;
  return envKey || null;
}

/**
 * Everything the settings page needs to describe one engine — without ever
 * revealing the key itself.
 */
export function credentialState(engine, envKey, entry) {
  const meta = ENGINES.find((item) => item.id === engine);
  const stored = entry?.key || null;
  const disabled = Boolean(entry?.disabled);
  const effective = effectiveKey(engine, envKey, entry);

  return {
    id: engine,
    label: meta?.label ?? engine,
    keyVar: meta?.keyVar ?? '',
    docsUrl: meta?.docsUrl ?? '',
    dashboardUrl: meta?.dashboardUrl ?? '',
    /** `settings` | `environment` | `none` */
    source: stored ? 'settings' : disabled ? 'disabled' : envKey ? 'environment' : 'none',
    configured: Boolean(effective),
    /** A key exists in the deployment but this browser turned it off. */
    disabled,
    /** True when the deployment itself holds a key (cannot be deleted from here). */
    fromEnvironment: Boolean(envKey),
    /** True when this browser stored its own key. */
    fromSettings: Boolean(stored),
    /*
     * Only a key the visitor stored themselves is shown masked. A key that
     * belongs to the deployment is never partially revealed: the visitor cannot
     * use it anyway, and its first and last characters are nobody's business.
     */
    masked: stored ? maskKey(stored) : envKey ? '••••••••' : null,
    canRemove: Boolean(stored) || disabled,
  };
}

/**
 * The complete, masked state the settings UI renders.
 *
 * Shared by `GET /api/credentials` and by the settings page itself, so the
 * panel can server-render its first paint instead of flashing a spinner — and
 * so the two can never drift.
 *
 * @param {{ credentials?: Record<string, { key?: string, disabled?: boolean }>,
 *           envKeys: Record<string, string|null>,
 *           engineOrder?: string[],
 *           usagePanel?: boolean }} options
 */
export function credentialPanelState({
  credentials = {},
  envKeys = {},
  engineOrder = ENGINE_IDS,
  usagePanel = true,
} = {}) {
  const report = credentialReport(credentials, envKeys);
  const availability = Object.fromEntries(
    report.engines.map((engine) => [engine.id, engine.configured]),
  );

  return {
    ok: true,
    ...report,
    /** The failover chain this browser can actually run, in configured order. */
    chain: engineOrder.filter((id) => availability[id]),
    engines: report.engines.map((engine) => ({
      ...engine,
      /** Whether a "test connection" button can do anything for this engine. */
      verifiable: canVerify(engine.id) && engine.configured,
    })),
    storage: {
      /** Where a key typed here ends up — worth stating plainly in the UI. */
      mechanism: 'httpOnly-cookie',
      cookie: KEYS_COOKIE,
      maxAgeDays: Math.round(KEYS_COOKIE_MAX_AGE / 86_400),
      secure: process.env.NODE_ENV === 'production',
    },
    canUseSettingsKeys: true,
    usagePanel: Boolean(usagePanel),
  };
}

/** The full, ordered status list used by `/api/credentials`. */
export function credentialReport(credentials, envKeys) {
  const engines = ENGINE_IDS.map((id) => credentialState(id, envKeys[id] ?? null, credentials[id]));
  return {
    engines,
    connected: engines.filter((engine) => engine.configured).length,
    total: engines.length,
    usingEnvironment: engines.some((engine) => engine.source === 'environment'),
  };
}
