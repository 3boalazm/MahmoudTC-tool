/**
 * lib/server/http.js
 * ---------------------------------------------------------------------------
 * Response builders shared by the API routes. Every error leaving this app has
 * the same shape, so the client never has to guess:
 *
 *   {
 *     "error": {
 *       "code": "RATE_LIMITED",
 *       "message": "…user-safe sentence…",
 *       "detail": "optional developer detail",
 *       "attempts": [ { "engine": "deepgram", "ok": false, "code": "…" } ]
 *     }
 *   }
 */

import { ERROR_CODES, describeCode } from '@/lib/engines';

/** Cache-Control for responses that must never be stored or replayed. */
const NO_STORE = 'no-store, max-age=0';

export function jsonResponse(body, { status = 200, headers = {} } = {}) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': NO_STORE,
      ...headers,
    },
  });
}

export function errorResponse({
  status = 500,
  code = ERROR_CODES.PROVIDER_ERROR,
  message,
  detail,
  attempts,
  extraHeaders = {},
}) {
  return jsonResponse(
    {
      error: {
        code,
        message: message || describeCode(code),
        ...(detail ? { detail } : {}),
        ...(attempts?.length ? { attempts } : {}),
      },
    },
    { status, headers: extraHeaders },
  );
}

/** Redact anything that looks like a key before it reaches a log or a client. */
export function redact(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/(x-gladia-key|authorization|api[_-]?key)["'\s:=]+[^\s"',}]+/gi, '$1=[redacted]')
    .replace(/\b(Token|Bearer)\s+[A-Za-z0-9._-]{12,}/g, '$1 [redacted]');
}
