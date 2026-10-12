/**
 * lib/url-guard.js
 * ---------------------------------------------------------------------------
 * Pure helpers for deciding whether a caller-supplied URL may be fetched by a
 * provider on our behalf.
 *
 * This matters: `/api/transcribe` accepts an `audioUrl` for large uploads, and
 * Deepgram/Gladia will happily dereference whatever URL we forward. Without a
 * strict allowlist the route would be an SSRF proxy into internal networks and
 * cloud metadata endpoints. Only objects inside this project's own Vercel Blob
 * store are ever allowed through.
 *
 * Kept dependency-free so it can be unit tested without a Next.js runtime.
 */

/**
 * Vercel Blob public objects live at
 * `https://<store-id>.public.blob.vercel-storage.com/<pathname>`.
 */
export const BLOB_URL_PATTERN =
  /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i;

/** Hard cap so a pathological URL cannot be used to bloat logs or headers. */
const MAX_URL_LENGTH = 2_048;

/**
 * @param {unknown} value
 * @param {RegExp} [pattern]
 * @returns {boolean} true only for a plain https object URL in our Blob store
 */
export function isBlobStorageUrl(value, pattern = BLOB_URL_PATTERN) {
  if (typeof value !== 'string') return false;
  if (!value || value.length > MAX_URL_LENGTH) return false;
  // Reject before parsing: URL() normalises some host tricks away silently.
  if (/[\s\\]/.test(value)) return false;
  if (!pattern.test(value)) return false;

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  return (
    parsed.protocol === 'https:' &&
    !parsed.username &&
    !parsed.password &&
    !parsed.port &&
    !parsed.hash
  );
}

/** Strip an object URL down to something safe to log. */
export function sanitiseUrl(value) {
  try {
    const parsed = new URL(String(value));
    return `${parsed.origin}/…`;
  } catch {
    return '<invalid-url>';
  }
}

/** Best-effort filename from an object URL, e.g. `…/stt-uploads/clip.webm`. */
export function filenameFromUrl(value, fallback = 'audio') {
  try {
    const name = decodeURIComponent(new URL(String(value)).pathname.split('/').pop() || '');
    return name.replace(/[^\w.\- ]+/g, '_') || fallback;
  } catch {
    return fallback;
  }
}
