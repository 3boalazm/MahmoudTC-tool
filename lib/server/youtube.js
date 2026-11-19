/**
 * lib/server/youtube.js
 * ---------------------------------------------------------------------------
 * Fetch a YouTube video's caption transcript, server-side, with no extra
 * dependencies and no audio download.
 *
 * Flow:
 *   1. GET the watch page (browser-like headers) and parse
 *      `ytInitialPlayerResponse` for caption tracks + title/duration.
 *   2. Pick the best track (manual > auto, preferred language first).
 *   3. GET the track's timedtext URL with `fmt=json3` and parse it into the
 *      normalised transcript shape the studio renders.
 *
 * SSRF note: the track URL comes from YouTube's own page, but we still
 * validate it — only `youtube.com` / `googlevideo.com` / `google.com`
 * timedtext hosts are fetched, over https, with no credentials or custom
 * ports. A compromised page can therefore never turn this into a proxy.
 *
 * Failure modes are reported as `YouTubeError` with a stable `code` so the
 * API route can map them onto user-safe messages:
 *   INVALID_VIDEO · NOT_FOUND · NO_CAPTIONS · BOT_CHECK · NETWORK · TIMEOUT
 */

import {
  extractYouTubeVideoId,
  normaliseCaptionLanguage,
  parseJson3Captions,
  parseWatchPage,
  pickCaptionTrack,
  youtubeWatchUrl,
} from '../youtube.js';

export class YouTubeError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = 'YouTubeError';
    this.code = code;
    this.status = status;
  }
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/** Hosts allowed for caption-track downloads (YouTube's own timedtext). */
const CAPTION_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'video.google.com',
  'google.com',
  'www.google.com',
];

/** Watch pages and caption tracks are small; refuse anything absurd. */
const MAX_BODY_BYTES = 8 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function isCaptionHost(hostname) {
  const host = String(hostname || '').toLowerCase();
  return CAPTION_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

/** Validate a caption-track URL before fetching it. */
export function isCaptionTrackUrl(value) {
  if (typeof value !== 'string') return false;
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    url.protocol === 'https:' &&
    !url.username &&
    !url.password &&
    !url.port &&
    isCaptionHost(url.hostname)
  );
}

/** Append `fmt=json3` (or replace an existing fmt) to a track URL. */
export function json3TrackUrl(baseUrl) {
  const url = new URL(baseUrl);
  url.searchParams.set('fmt', 'json3');
  return url.toString();
}

/**
 * Fetch a URL with a deadline, no automatic redirect following, and a size cap.
 * `guarded` is true for caption-track fetches, where every hop must stay on a
 * YouTube host (the watch page itself redirects to `consent.youtube.com`,
 * which is fine because the page is only ever parsed, never trusted for URLs).
 */
async function fetchWithTimeout(
  url,
  { timeoutMs = 15_000, fetchImpl = fetch, guarded = false, redirectsLeft = MAX_REDIRECTS } = {},
) {
  const controller = new AbortController();
  // One wall-clock deadline for the whole chain, redirects included.
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: {
        'user-agent': USER_AGENT,
        'accept-language': 'en-US,en;q=0.9,ar;q=0.8',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      // Hop count and target are checked by hand below, so a redirect can never
      // silently walk the caption fetch off YouTube.
      redirect: 'manual',
    });

    if (REDIRECT_STATUSES.has(response.status) && response.headers.get('location')) {
      if (redirectsLeft <= 0) {
        throw new YouTubeError('NETWORK', 'YouTube redirected too many times. Try again.', 502);
      }
      const target = new URL(response.headers.get('location'), url).toString();
      if (guarded && !isCaptionTrackUrl(target)) {
        throw new YouTubeError(
          'NETWORK',
          'The caption track redirected off YouTube. Try again, or upload the audio file instead.',
          502,
        );
      }
      const next = await fetchWithTimeout(target, {
        timeoutMs,
        fetchImpl,
        guarded,
        redirectsLeft: redirectsLeft - 1,
      });
      clearTimeout(timer);
      return next;
    }

    return response;
  } catch (error) {
    if (error instanceof YouTubeError) throw error;
    if (error?.name === 'AbortError') {
      throw new YouTubeError(
        'TIMEOUT',
        'YouTube took too long to respond. Try again in a moment.',
        504,
      );
    }
    throw new YouTubeError(
      'NETWORK',
      'Could not reach YouTube. Check your connection and try again.',
      502,
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Read a response body as text, enforcing a byte ceiling. Streams are read
 * chunk by chunk so a hostile/looping response cannot balloon memory.
 */
async function readBodyText(response) {
  const declared = Number(response.headers?.get?.('content-length') || 0);
  if (declared && declared > MAX_BODY_BYTES) {
    throw new YouTubeError('NETWORK', 'The YouTube response was unexpectedly large.', 502);
  }

  // Test doubles may expose only text().
  if (!response.body?.getReader) return response.text();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let out = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => {});
      throw new YouTubeError('NETWORK', 'The YouTube response was unexpectedly large.', 502);
    }
    out += decoder.decode(value, { stream: true });
  }
  return out + decoder.decode();
}

/**
 * Fetch the caption transcript for a YouTube video.
 *
 * @param {string} videoIdOrUrl 11-char ID or any YouTube watch URL
 * @param {{ language?: string, timeoutMs?: number, fetchImpl?: Function }} [options]
 *   `language` is the caller's preferred caption language (e.g. 'ar', 'en').
 * @returns {Promise<object>} normalised result + YouTube metadata:
 *   { text, segments, words, duration, language, engine: 'youtube', model,
 *     videoId, videoTitle, captionLanguage, captionKind, elapsedMs }
 * @throws {YouTubeError}
 */
export async function fetchYouTubeTranscript(videoIdOrUrl, { language = '', timeoutMs = 15_000, fetchImpl = fetch } = {}) {
  const startedAt = Date.now();
  const videoId =
    extractYouTubeVideoId(videoIdOrUrl) ||
    (/^[A-Za-z0-9_-]{11}$/.test(String(videoIdOrUrl || '').trim())
      ? String(videoIdOrUrl).trim()
      : null);

  if (!videoId) {
    throw new YouTubeError(
      'INVALID_VIDEO',
      'That does not look like a YouTube video link. Paste a link such as https://www.youtube.com/watch?v=… or https://youtu.be/…',
    );
  }

  // ---- 1. watch page -------------------------------------------------------
  let pageResponse;
  try {
    pageResponse = await fetchWithTimeout(youtubeWatchUrl(videoId), { timeoutMs, fetchImpl });
  } catch (error) {
    if (error instanceof YouTubeError) throw error;
    throw new YouTubeError('NETWORK', 'Could not reach YouTube. Check your connection and try again.', 502);
  }

  if (pageResponse.status === 404 || pageResponse.status === 410) {
    throw new YouTubeError('NOT_FOUND', 'That YouTube video was not found (it may be private or deleted).', 404);
  }
  if (!pageResponse.ok) {
    throw new YouTubeError(
      'NETWORK',
      `YouTube answered with an error (HTTP ${pageResponse.status}). Try again in a moment.`,
      502,
    );
  }

  let html;
  try {
    html = await readBodyText(pageResponse);
  } catch (error) {
    if (error instanceof YouTubeError) throw error;
    throw new YouTubeError('NETWORK', 'The YouTube page could not be read. Try again.', 502);
  }

  const { tracks, title, durationSeconds } = parseWatchPage(html);

  if (!tracks.length) {
    // No player response at all usually means a bot/consent challenge.
    if (!html.includes('ytInitialPlayerResponse')) {
      throw new YouTubeError(
        'BOT_CHECK',
        'YouTube did not return the video page (it may be blocking automated requests right now). Try again in a moment, or upload the audio file instead.',
        502,
      );
    }
    throw new YouTubeError(
      'NO_CAPTIONS',
      'This video has no captions (neither uploaded nor auto-generated). Upload the audio file instead and the studio will transcribe it with speech-to-text.',
      404,
    );
  }

  // ---- 2. pick the best track ---------------------------------------------
  const preferred = language ? [language] : [];
  const track = pickCaptionTrack(tracks, preferred);
  if (!track || !isCaptionTrackUrl(track.baseUrl)) {
    throw new YouTubeError('NO_CAPTIONS', 'This video has no usable caption track. Upload the audio file instead.', 404);
  }

  const captionKind = track.kind === 'asr' ? 'auto' : 'manual';
  const captionLanguage = normaliseCaptionLanguage(track.languageCode) || null;

  // ---- 3. fetch + parse the captions --------------------------------------
  let captionResponse;
  try {
    captionResponse = await fetchWithTimeout(json3TrackUrl(track.baseUrl), {
      timeoutMs,
      fetchImpl,
      guarded: true,
    });
  } catch (error) {
    if (error instanceof YouTubeError) throw error;
    throw new YouTubeError('NETWORK', 'The caption track could not be downloaded. Try again.', 502);
  }

  if (!captionResponse.ok) {
    throw new YouTubeError(
      'NETWORK',
      `The caption track answered with an error (HTTP ${captionResponse.status}). Try again in a moment.`,
      502,
    );
  }

  let captionText;
  try {
    captionText = await readBodyText(captionResponse);
  } catch (error) {
    if (error instanceof YouTubeError) throw error;
    throw new YouTubeError('NETWORK', 'The caption track could not be read. Try again.', 502);
  }

  const parsed = parseJson3Captions(captionText);
  if (!parsed.text) {
    throw new YouTubeError(
      'NO_CAPTIONS',
      'The caption track came back empty. This video may have captions disabled — upload the audio file instead.',
      404,
    );
  }

  return {
    text: parsed.text,
    segments: parsed.segments,
    words: parsed.words,
    confidence: null,
    language: captionLanguage,
    duration: parsed.duration ?? durationSeconds,
    engine: 'youtube',
    model: captionKind === 'manual' ? 'captions' : 'auto-captions',
    requestId: videoId,
    elapsedMs: Date.now() - startedAt,
    // YouTube metadata (surfaced by the API, shown in the UI).
    videoId,
    videoTitle: title,
    captionLanguage,
    captionKind,
    sourceType: 'youtube',
  };
}
