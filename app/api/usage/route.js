/**
 * GET /api/usage
 * ---------------------------------------------------------------------------
 * Consumption and remaining-limit report for every engine.
 *
 * ⚠️  This endpoint reports **account-level** billing information: how much
 * audio has been processed and, where the provider exposes it, how much credit
 * is left. It contains no secrets, but it is still business data — so it is
 * guarded three ways:
 *
 *   1. `ENABLE_USAGE_PANEL=false` disables it completely (recommended on any
 *      public deployment that does not have authentication in front of it).
 *   2. Cross-site browser requests are refused via `Sec-Fetch-Site`, so a
 *      malicious page cannot read your usage figures.
 *   3. It shares the same per-IP rate limit as transcription.
 *
 * Figures are cached briefly (USAGE_CACHE_SEC) because they are informational.
 */

import { engineAvailability, serverConfig } from '@/lib/server/config';
import { KEYS_COOKIE, parseCredentialCookie } from '@/lib/server/credentials';
import { buildUsageReport } from '@/lib/server/usage';
import { checkRateLimit, clientIdentifier } from '@/lib/server/rate-limit';
import { errorResponse, jsonResponse } from '@/lib/server/http';
import { ERROR_CODES } from '@/lib/engines';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  if (!serverConfig.usage.enabled) {
    return errorResponse({
      status: 404,
      code: ERROR_CODES.BAD_REQUEST,
      message:
        'The usage report is disabled on this deployment (ENABLE_USAGE_PANEL=false).',
    });
  }

  // Browser-initiated cross-site reads are always blocked; same-origin calls
  // (the studio) and non-browser clients (curl, scripts) are allowed.
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && !['same-origin', 'same-site', 'none'].includes(fetchSite)) {
    return errorResponse({
      status: 403,
      code: ERROR_CODES.AUTH,
      message: 'Cross-site requests for usage data are not allowed.',
    });
  }

  const limit = checkRateLimit(`usage:${clientIdentifier(request)}`, {
    max: Math.max(serverConfig.rateLimit.max, 60),
    windowMs: serverConfig.rateLimit.windowMs,
  });
  if (!limit.allowed) {
    return errorResponse({
      status: 429,
      code: ERROR_CODES.RATE_LIMITED,
      message: `Too many usage requests. Please retry in ${limit.retryAfterSeconds}s.`,
      extraHeaders: { 'Retry-After': String(limit.retryAfterSeconds) },
    });
  }

  // Usage follows the same credential rules as transcription: a key saved on the
  // settings page reports *that* account's figures, not the deployment's.
  const credentials = parseCredentialCookie(request.cookies.get(KEYS_COOKIE)?.value);
  const availability = engineAvailability(credentials);
  const report = await buildUsageReport({ availability, credentials });

  return jsonResponse({
    ok: true,
    ...report,
    rates: {
      requestsPerWindow: serverConfig.rateLimit.max,
      windowSeconds: Math.round(serverConfig.rateLimit.windowMs / 1000),
    },
    engineOrder: serverConfig.engineOrder.filter((id) => availability[id]),
  });
}
