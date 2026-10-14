/**
 * POST /api/blob/upload
 * ---------------------------------------------------------------------------
 * Mints the short-lived client tokens that let the browser upload audio
 * **directly** to Vercel Blob. This is what unlocks files larger than the 4.5 MB
 * serverless request limit.
 *
 * Only mounted meaningfully when a Blob store is connected; otherwise it
 * answers 503 and the client keeps using inline uploads.
 *
 * Security notes
 *   • `onBeforeGenerateToken` is the authorisation gate. This app ships without
 *     user accounts, so the gate enforces: the feature must be enabled, the
 *     caller must be under the same rate limit as /api/transcribe, only
 *     audio/video MIME types are accepted, and a hard size ceiling applies.
 *     If you add authentication, check the session here — the official docs
 *     make this the recommended pattern.
 *   • Blobs are requested with `public` access because Deepgram and Gladia must
 *     fetch the URL themselves; they are deleted as soon as transcription ends.
 */

import { handleUpload } from '@vercel/blob/client';

import { ERROR_CODES } from '@/lib/engines';
import { blobMaxBytes, isBlobEnabled } from '@/lib/server/blob';
import { serverConfig } from '@/lib/server/config';
import { checkRateLimit, clientIdentifier } from '@/lib/server/rate-limit';
import { errorResponse, jsonResponse, redact } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_CONTENT_TYPES = [
  'audio/*',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/ogg',
  'application/octet-stream',
];

/** Only these extensions get a token, so the store never fills with junk. */
const ALLOWED_EXTENSIONS = [
  'mp3', 'wav', 'm4a', 'mp4', 'webm', 'ogg', 'oga', 'opus', 'flac', 'aac',
  'amr', 'aiff', 'aif', 'mov', 'mpeg', 'mpga', '3gp', 'mkv',
];

export async function POST(request) {
  if (!isBlobEnabled()) {
    return errorResponse({
      status: 503,
      code: ERROR_CODES.MISSING_KEY,
      message:
        'Large-file uploads are not configured on this deployment. Connect a Vercel Blob store (BLOB_READ_WRITE_TOKEN) or keep uploads under the inline limit.',
    });
  }

  const limit = checkRateLimit(`blob:${clientIdentifier(request)}`, serverConfig.rateLimit);
  if (!limit.allowed) {
    return errorResponse({
      status: 429,
      code: ERROR_CODES.RATE_LIMITED,
      message: `Too many upload requests. Please retry in ${limit.retryAfterSeconds}s.`,
      extraHeaders: { 'Retry-After': String(limit.retryAfterSeconds) },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse({
      status: 400,
      code: ERROR_CODES.BAD_REQUEST,
      message: 'Expected a JSON body describing the upload.',
    });
  }

  try {
    const result = await handleUpload({
      body,
      request,
      token: serverConfig.blob.token,

      onBeforeGenerateToken: async (pathname) => {
        const extension = pathname.includes('.')
          ? pathname.split('.').pop().toLowerCase()
          : '';

        if (!ALLOWED_EXTENSIONS.includes(extension)) {
          throw new Error(
            `Unsupported file extension ".${extension}". Allowed: ${ALLOWED_EXTENSIONS.join(', ')}.`,
          );
        }

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: blobMaxBytes(),
          addRandomSuffix: true,
          // Allow enough time for slower mobile networks and large audio uploads.
          // The token is scoped to this validated audio upload and remains short-lived.
          validUntil: Date.now() + 30 * 60 * 1000,
          tokenPayload: JSON.stringify({ issuedAt: Date.now() }),
        };
      },

      /**
       * Fired by Vercel once the browser finishes uploading. It cannot reach
       * localhost, so on `npm run dev` this simply does not run — the client
       * already has the URL it needs, so nothing depends on it.
       */
      onUploadCompleted: async ({ blob }) => {
        console.warn(`[blob] upload completed: ${blob?.pathname ?? 'unknown'}`);
      },
    });

    return jsonResponse(result);
  } catch (error) {
    return errorResponse({
      status: 400,
      code: ERROR_CODES.BAD_REQUEST,
      message: redact(String(error?.message || 'The upload could not be authorised.')),
    });
  }
}
