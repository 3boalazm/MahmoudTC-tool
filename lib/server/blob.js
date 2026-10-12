/**
 * lib/server/blob.js
 * ---------------------------------------------------------------------------
 * "Large file mode" for serverless deployments.
 *
 * Why this exists: a Vercel Function rejects any request body above 4.5 MB with
 * a platform-level 413 before your code runs. Audio files blow past that in
 * seconds, so anything larger cannot travel browser → function → provider.
 *
 * The workaround is the standard Vercel pattern: the browser uploads straight
 * to Vercel Blob using a short-lived token minted by `/api/blob/upload`, then
 * this app passes the resulting URL to Deepgram and Gladia (both accept remote
 * audio URLs), and finally deletes the object. The bytes never touch the
 * function, and nothing is left behind.
 *
 * Everything here degrades gracefully: with no `BLOB_READ_WRITE_TOKEN` the
 * feature reports itself as disabled and the app falls back to inline uploads.
 */

import { serverConfig } from '@/lib/server/config';
import { isBlobStorageUrl, sanitiseUrl } from '@/lib/url-guard';

export function isBlobEnabled() {
  return serverConfig.blob.enabled;
}

/** Maximum size a browser may upload to the store, in bytes. */
export function blobMaxBytes() {
  return serverConfig.blob.maxUploadMb * 1024 * 1024;
}

/**
 * Guard against SSRF: only URLs inside this project's own Vercel Blob store are
 * accepted as an `audioUrl`, so the proxy can never be pointed at internal
 * metadata endpoints or arbitrary third-party hosts.
 */
export function isOwnBlobUrl(value) {
  return isBlobStorageUrl(value, serverConfig.blob.urlPattern);
}

/**
 * Delete an object from the store. Best-effort by design: a failed cleanup must
 * never turn a successful transcription into an error for the user.
 *
 * @returns {Promise<boolean>} whether the object was removed
 */
export async function deleteBlob(url) {
  if (!isBlobEnabled() || !isOwnBlobUrl(url)) return false;
  try {
    // Imported lazily so the SDK is only loaded on the path that needs it.
    const { del } = await import('@vercel/blob');
    await del(url, { token: serverConfig.blob.token });
    return true;
  } catch (error) {
    console.warn(`[blob] cleanup failed for ${sanitiseUrl(url)}: ${error?.message || error}`);
    return false;
  }
}

export { sanitiseUrl };
