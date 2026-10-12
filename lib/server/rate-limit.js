/**
 * lib/server/rate-limit.js
 * ---------------------------------------------------------------------------
 * Deliberately tiny fixed-window rate limiter.
 *
 * Scope & honesty: this is an in-process counter. On a single Node instance it
 * protects your provider credits from a runaway client. On serverless or
 * multi-instance deployments each instance keeps its own window, so treat it as
 * a courtesy guard rather than a security boundary — swap in Redis / Upstash if
 * you need a hard distributed limit.
 */

const buckets = new Map();
let lastSweep = 0;

function sweep(now, windowMs) {
  // Opportunistic cleanup so the map cannot grow without bound.
  if (now - lastSweep < windowMs) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * @returns {{ allowed: boolean, remaining: number, limit: number,
 *             retryAfterSeconds: number, resetAt: number }}
 */
export function checkRateLimit(identifier, { max, windowMs } = {}) {
  const limit = max ?? 20;
  const window = windowMs ?? 60_000;
  const now = Date.now();
  sweep(now, window);

  const key = String(identifier || 'anonymous');
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + window;
    buckets.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: limit - 1,
      limit,
      retryAfterSeconds: Math.ceil(window / 1000),
      resetAt,
    };
  }

  bucket.count += 1;
  const allowed = bucket.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - bucket.count),
    limit,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    resetAt: bucket.resetAt,
  };
}

/** Best-effort client identity: proxy headers first, then a shared bucket. */
export function clientIdentifier(request) {
  const headers = request?.headers;
  const forwarded = headers?.get?.('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return (
    headers?.get?.('x-real-ip') ||
    headers?.get?.('cf-connecting-ip') ||
    'unknown'
  );
}

/** Test helper — clears all counters. */
export function resetRateLimits() {
  buckets.clear();
  lastSweep = 0;
}
