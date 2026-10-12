/**
 * /api/credentials
 * ---------------------------------------------------------------------------
 * Reads and writes the **visitor's own** provider keys.
 *
 * Why a cookie?
 *   This app has no database and has to run on Vercel, where a serverless
 *   instance cannot persist a file. Storing a key in an httpOnly cookie on the
 *   visitor's device keeps every promise the app already made: no server-side
 *   account, no shared key pool, nothing that can leak to another visitor.
 *
 *   GET    /api/credentials                → masked status of every engine
 *   POST   /api/credentials                → { engine, key?, action? }
 *   DELETE /api/credentials?engine=gladia  → forget one engine
 *   DELETE /api/credentials?all=1          → forget everything (disconnect)
 *
 * Actions
 *   save     (default when `key` is present) validate, store, then probe it
 *   test     probe the given key, or the one already in use, without storing
 *   disable  shadow the deployment's env key for this browser only
 *   enable   drop that shadow, going back to the environment key
 *
 * Guarantees
 *   • A key is never returned by any response — only a mask such as `sk_1••••4f2a`.
 *   • Cross-site requests are refused (`Sec-Fetch-Site`), so another site cannot
 *     read your status or write a key of its own.
 *   • Writes are rate-limited: probing a provider costs a round trip.
 */

import { NextResponse } from 'next/server';

import { ERROR_CODES } from '@/lib/engines';
import { ENGINES } from '@/lib/engines-meta';
import { serverConfig, environmentKeys } from '@/lib/server/config';
import {
  KEYS_COOKIE,
  credentialPanelState,
  keysCookieOptions,
  parseCredentialCookie,
  serialiseCredentialCookie,
  validateKeyShape,
} from '@/lib/server/credentials';
import { errorResponse, jsonResponse } from '@/lib/server/http';
import { checkRateLimit, clientIdentifier } from '@/lib/server/rate-limit';
import { verifyEngineCredentials } from '@/lib/server/verify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const KNOWN_ENGINES = ENGINES.map((engine) => engine.id);
const ACTIONS = ['save', 'test', 'disable', 'enable'];

/** Same-origin only: these endpoints read and write personal credentials. */
function crossSite(request) {
  const fetchSite = request.headers.get('sec-fetch-site');
  return Boolean(fetchSite) && !['same-origin', 'same-site', 'none'].includes(fetchSite);
}

function readCredentials(request) {
  return parseCredentialCookie(request.cookies.get(KEYS_COOKIE)?.value);
}

/** Every response carries the full, masked state so the UI never has to guess. */
function statePayload({ credentials, extra = {} } = {}) {
  return {
    ...credentialPanelState({
      credentials,
      envKeys: environmentKeys(),
      engineOrder: serverConfig.engineOrder,
      usagePanel: serverConfig.usage.enabled,
    }),
    ...extra,
  };
}

/** A JSON response that also (re)writes the credentials cookie. */
function jsonWithCredentials(body, map, { status = 200 } = {}) {
  const response = NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });

  const value = serialiseCredentialCookie(map);
  if (value) {
    response.cookies.set(KEYS_COOKIE, value, keysCookieOptions());
  } else {
    response.cookies.set(KEYS_COOKIE, '', { ...keysCookieOptions(), maxAge: 0 });
  }
  return response;
}

/* --------------------------------------------------------------------- GET */

export async function GET(request) {
  if (crossSite(request)) {
    return errorResponse({
      status: 403,
      code: ERROR_CODES.AUTH,
      message: 'Cross-site requests for credential status are not allowed.',
    });
  }

  return jsonResponse(statePayload({ credentials: readCredentials(request) }));
}

/* -------------------------------------------------------------------- POST */

export async function POST(request) {
  if (crossSite(request)) {
    return errorResponse({
      status: 403,
      code: ERROR_CODES.AUTH,
      message: 'Cross-site credential changes are not allowed.',
    });
  }

  // Saving or testing a key talks to a provider, so it shares a budget.
  const limit = checkRateLimit(`credentials:${clientIdentifier(request)}`, {
    max: Math.max(serverConfig.rateLimit.max, 20),
    windowMs: serverConfig.rateLimit.windowMs,
  });
  if (!limit.allowed) {
    return errorResponse({
      status: 429,
      code: ERROR_CODES.RATE_LIMITED,
      message: `Too many credential requests. Please retry in ${limit.retryAfterSeconds}s.`,
      extraHeaders: { 'Retry-After': String(limit.retryAfterSeconds) },
    });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return errorResponse({
      status: 400,
      code: ERROR_CODES.BAD_REQUEST,
      message: 'Expected a JSON body: { engine, key?, action? }.',
    });
  }

  const engine = String(payload?.engine ?? '').trim();
  if (!KNOWN_ENGINES.includes(engine)) {
    return errorResponse({
      status: 400,
      code: ERROR_CODES.BAD_REQUEST,
      message: `Unknown engine "${payload?.engine}". Known engines: ${KNOWN_ENGINES.join(', ')}.`,
    });
  }

  /*
   * A body that mentions a key is a save attempt — even when the key is empty,
   * because the validation message is the useful part of that answer.
   */
  const action = ACTIONS.includes(payload?.action)
    ? payload.action
    : payload && 'key' in payload
      ? 'save'
      : null;

  if (!action) {
    return errorResponse({
      status: 400,
      code: ERROR_CODES.BAD_REQUEST,
      message: `Nothing to do for "${engine}": pass a key to save, or an action (${ACTIONS.join(', ')}).`,
    });
  }

  const credentials = readCredentials(request);
  const next = { ...credentials };
  const envKey = environmentKeys()[engine] ?? null;

  /* ------------------------------------------------------------- disable/enable */

  if (action === 'disable') {
    next[engine] = { disabled: true };
    return jsonWithCredentials(
      statePayload({ credentials: next, extra: { result: { engine, ok: true, code: 'DISABLED' } } }),
      next,
    );
  }

  if (action === 'enable') {
    delete next[engine];
    return jsonWithCredentials(
      statePayload({ credentials: next, extra: { result: { engine, ok: true, code: 'ENABLED' } } }),
      next,
    );
  }

  /* ------------------------------------------------------------------- test */

  if (action === 'test') {
    const candidate = typeof payload?.key === 'string' && payload.key.trim() ? payload.key.trim() : null;
    const stored = next[engine]?.key ?? null;
    const key = candidate || stored || envKey;

    if (!key) {
      return jsonResponse(
        statePayload({
          credentials: next,
          extra: { result: { engine, ok: false, code: 'MISSING_KEY', status: null, detail: null } },
        }),
      );
    }

    const verification = await verifyEngineCredentials(engine, { ...serverConfig[engine], apiKey: key });
    return jsonResponse(
      statePayload({
        credentials: next,
        extra: { result: { engine, source: candidate ? 'input' : stored ? 'settings' : 'environment', ...verification } },
      }),
    );
  }

  /* -------------------------------------------------------------------- save */

  const shape = validateKeyShape(engine, payload?.key);
  if (!shape.ok) {
    return errorResponse({
      status: 400,
      code: ERROR_CODES.BAD_REQUEST,
      message: 'That does not look like an API key.',
      detail: shape.reason,
      extraHeaders: { 'X-Key-Rejected': shape.reason },
    });
  }

  const verification = await verifyEngineCredentials(engine, {
    ...serverConfig[engine],
    apiKey: shape.key,
  });

  /*
   * A 401 is the one answer that is not a matter of interpretation: this key
   * cannot be used. Refusing to store it means fixing a typo cannot cost you a
   * working key on the way in — and the previous key (yours or the deployment's)
   * stays in place until a real one is saved.
   *
   * Everything else is stored: `NO_CREDIT` needs a top-up, `UNREACHABLE` and
   * `TIMEOUT` say nothing about the key, and the panel reports the outcome
   * verbatim so the decision stays with the person holding the account.
   */
  if (verification.code === 'REJECTED') {
    return jsonResponse(
      statePayload({
        credentials,
        extra: { result: { engine, source: 'input', stored: false, ...verification } },
      }),
    );
  }

  next[engine] = { key: shape.key };

  return jsonWithCredentials(
    statePayload({
      credentials: next,
      extra: { result: { engine, source: 'input', stored: true, ...verification } },
    }),
    next,
  );
}

/* ------------------------------------------------------------------ DELETE */

export async function DELETE(request) {
  if (crossSite(request)) {
    return errorResponse({
      status: 403,
      code: ERROR_CODES.AUTH,
      message: 'Cross-site credential changes are not allowed.',
    });
  }

  const url = new URL(request.url);
  const credentials = readCredentials(request);

  if (url.searchParams.get('all') === '1' || url.searchParams.get('all') === 'true') {
    return jsonWithCredentials(
      statePayload({
        credentials: {},
        extra: { result: { engine: null, ok: true, code: 'DISCONNECTED_ALL', removed: Object.keys(credentials).length } },
      }),
      {},
    );
  }

  const engine = String(url.searchParams.get('engine') ?? '').trim();
  if (!KNOWN_ENGINES.includes(engine)) {
    return errorResponse({
      status: 400,
      code: ERROR_CODES.BAD_REQUEST,
      message: 'Pass ?engine=<id> or ?all=1.',
    });
  }

  const next = { ...credentials };
  const existed = Boolean(next[engine]?.key) || Boolean(next[engine]?.disabled);
  delete next[engine];

  return jsonWithCredentials(
    statePayload({
      credentials: next,
      extra: { result: { engine, ok: true, code: existed ? 'DISCONNECTED' : 'NOT_CONNECTED', removed: existed ? 1 : 0 } },
    }),
    next,
  );
}
