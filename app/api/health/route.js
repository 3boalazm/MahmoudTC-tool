/**
 * GET /api/health
 * ---------------------------------------------------------------------------
 * Deployment introspection used by the UI to grey out engines it cannot use and
 * to decide how large a file it may upload inline.
 *
 * Reports *which* credentials exist — never the values themselves.
 */

import { isBlobEnabled } from '@/lib/server/blob';
import { engineAvailability, serverConfig } from '@/lib/server/config';
import { jsonResponse } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  const engines = engineAvailability();
  const blobEnabled = isBlobEnabled();

  return jsonResponse({
    ok: true,
    configured: engines.deepgram || engines.gladia,
    engines: {
      deepgram: {
        available: engines.deepgram,
        role: 'primary',
        model: serverConfig.deepgram.model,
      },
      gladia: {
        available: engines.gladia,
        role: 'fallback',
        model: 'solaria-1',
      },
    },
    limits: {
      /** Files at or below this size are streamed through the API route. */
      maxUploadMb: serverConfig.upload.maxMb,
      /** Hard platform ceiling (4.5 MB on Vercel) — exceeded never, by design. */
      platformBodyLimitMb: serverConfig.runtime.platformBodyLimitMb,
      requestsPerWindow: serverConfig.rateLimit.max,
      windowSeconds: Math.round(serverConfig.rateLimit.windowMs / 1000),
      maxDurationSeconds: serverConfig.runtime.maxDurationSec,
    },
    largeUploads: {
      /**
       * When true the browser may upload straight to Vercel Blob and hand the
       * provider a URL, escaping the serverless body limit entirely.
       */
      enabled: blobEnabled,
      provider: blobEnabled ? 'vercel-blob' : null,
      maxUploadMb: blobEnabled ? serverConfig.blob.maxUploadMb : null,
      endpoint: blobEnabled ? '/api/blob/upload' : null,
      deletedAfterUse: serverConfig.blob.deleteAfterUse,
    },
    features: {
      autoFallback: true,
      clientFallbackToggle: serverConfig.allowClientFallbackOption,
      fallbackOnEmptyTranscript: serverConfig.fallbackOnEmptyTranscript,
    },
    runtime: {
      platform: serverConfig.runtime.isVercel ? 'vercel' : 'self-hosted',
      nodeEnv: process.env.NODE_ENV ?? 'development',
    },
  });
}
