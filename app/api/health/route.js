/**
 * GET /api/health
 * ---------------------------------------------------------------------------
 * Deployment introspection used by the UI to grey out engines it cannot use and
 * to decide how large a file it may upload inline.
 *
 * Reports *which* credentials exist — never the values themselves.
 */

import { ACCENT_CLASSES, ENGINES } from '@/lib/engines-meta';
import { isBlobEnabled } from '@/lib/server/blob';
import {
  availableEngineOrder,
  engineAvailability,
  resolveEngineConfig,
  serverConfig,
} from '@/lib/server/config';
import { KEYS_COOKIE, parseCredentialCookie } from '@/lib/server/credentials';
import { jsonResponse } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request) {
  /*
   * Availability is per visitor: a key saved on the settings page makes an
   * engine usable for that browser even when the deployment has no env key.
   */
  const credentials = parseCredentialCookie(request.cookies.get(KEYS_COOKIE)?.value);
  const availability = engineAvailability(credentials);
  const order = availableEngineOrder(credentials);
  const blobEnabled = isBlobEnabled();
  const configs = Object.fromEntries(
    ENGINES.map((engine) => [engine.id, resolveEngineConfig(engine.id, credentials)]),
  );

  return jsonResponse({
    ok: true,
    configured: order.length > 0,
    /** Full description of every supported engine, in failover order. */
    engines: ENGINES.map((engine) => ({
      id: engine.id,
      label: engine.label,
      available: availability[engine.id],
      // An empty ASSEMBLYAI_MODEL means "use the account default", so fall back
      // to the marketing name from the registry rather than rendering nothing.
      model: configs[engine.id]?.model || engine.model,
      configuredModel: serverConfig[engine.id]?.model || null,
      /** Where this request's key comes from: `settings`, `environment` or none. */
      keySource: credentials[engine.id]?.key
        ? 'settings'
        : credentials[engine.id]?.disabled
          ? 'disabled'
          : serverConfig[engine.id]?.apiKey
            ? 'environment'
            : null,
      blurb: engine.blurb,
      description: engine.description,
      supportsRemoteUrl: engine.supportsRemoteUrl,
      docsUrl: engine.docsUrl,
      dashboardUrl: engine.dashboardUrl,
      keyVar: engine.keyVar,
      usage: engine.usage,
      accent: engine.accent,
      // Position in the chain; null when this deployment has no key for it.
      position: order.indexOf(engine.id) >= 0 ? order.indexOf(engine.id) + 1 : null,
      role: order.indexOf(engine.id) === 0 ? 'primary' : order.includes(engine.id) ? 'fallback' : null,
    })),
    engineOrder: order,
    accents: ACCENT_CLASSES,
    credentials: {
      /** True when at least one key came from this browser's settings page. */
      fromSettings: Object.values(credentials).some((entry) => entry?.key),
      manageUrl: '/settings',
    },
    limits: {
      /** Files at or below this size are streamed through the API route. */
      maxUploadMb: serverConfig.upload.maxMb,
      /** Hard platform ceiling (4.5 MB on Vercel) — exceeded never, by design. */
      platformBodyLimitMb: serverConfig.runtime.platformBodyLimitMb,
      /** "Transcribe from a link" — the server downloads the file itself. */
      link: {
        enabled: serverConfig.link.enabled,
        maxMb: serverConfig.link.maxMb,
      },
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
      usagePanel: serverConfig.usage.enabled,
    },
    runtime: {
      platform: serverConfig.runtime.isVercel ? 'vercel' : 'self-hosted',
      nodeEnv: process.env.NODE_ENV ?? 'development',
    },
  });
}
