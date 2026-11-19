/**
 * lib/youtube.js
 * ---------------------------------------------------------------------------
 * Pure helpers for YouTube links: extract a video ID from any common YouTube
 * URL shape, pick the best caption track, and turn YouTube's timedtext (JSON3)
 * payload into the same normalised transcript shape the STT engines return.
 *
 * Dependency-free (no Node built-ins) so it is unit-testable and importable
 * from the browser for early, friendly validation — the same rule as
 * `lib/remote-media.js`.
 *
 * Why captions and not audio download? YouTube serves audio as signed,
 * expiring adaptive streams behind bot checks, which is fragile on serverless
 * (datacenter IPs, 90 s function budget, size caps). Caption tracks, by
 * contrast, are a single small JSON fetch, free, instant, and available for
 * ~95% of videos (YouTube auto-generates them). Manual captions are perfect;
 * auto-captions are good enough to edit in the studio. When a video has no
 * captions at all the API says so clearly and the user can upload the audio
 * file for full STT instead.
 */

/** YouTube video IDs are 11 chars from this alphabet. */
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

/** Hosts that serve YouTube watch pages (incl. regional / embed variants). */
const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'youtu.be',
]);

/** True when `hostname` belongs to YouTube. */
export function isYouTubeHost(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/\.$/, '');
  if (YOUTUBE_HOSTS.has(host)) return true;
  return host.endsWith('.youtube.com') || host.endsWith('.youtube-nocookie.com');
}

/**
 * Extract the 11-char video ID from a YouTube URL, or null when the URL is
 * not a recognisable YouTube video link.
 *
 * Handles: watch?v=, youtu.be/, /shorts/, /embed/, /live/, /v/, music, nocookie.
 * Rejects: playlists, channels, search pages, malformed IDs.
 *
 * @param {unknown} value
 * @returns {string|null}
 */
export function extractYouTubeVideoId(value) {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;

  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (!isYouTubeHost(url.hostname)) return null;

  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split('/').filter(Boolean);

  // youtu.be/VIDEO_ID (optionally /VIDEO_ID?... — query already stripped)
  if (host === 'youtu.be') {
    const id = segments[0] || '';
    return VIDEO_ID_PATTERN.test(id) ? id : null;
  }

  // /shorts/ID, /embed/ID, /live/ID, /v/ID
  if (segments.length >= 2 && ['shorts', 'embed', 'live', 'v'].includes(segments[0])) {
    const id = segments[1];
    return VIDEO_ID_PATTERN.test(id) ? id : null;
  }

  // /watch?v=ID (also /watch?...&v=ID)
  if (segments.length === 1 && segments[0] === 'watch') {
    const id = url.searchParams.get('v') || '';
    return VIDEO_ID_PATTERN.test(id) ? id : null;
  }

  return null;
}

/** True when `value` is a YouTube video URL we can fetch captions for. */
export function isYouTubeUrl(value) {
  return extractYouTubeVideoId(value) !== null;
}

/** Canonical watch URL for a video ID. */
export function youtubeWatchUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/* -------------------------------------------------------------------------- */
/* Caption track selection                                                    */
/* -------------------------------------------------------------------------- */

/**
 * A caption track as it appears in `ytInitialPlayerResponse`:
 * `{ baseUrl, name: { simpleText }, languageCode, kind? }`
 * `kind === 'asr'` marks auto-generated captions; absent means manual.
 */

/** Normalise a language code for comparison: `ar-EG` → `ar`, `en_US` → `en`. */
export function normaliseCaptionLanguage(code) {
  return String(code || '').trim().toLowerCase().replace(/_/g, '-').split('-')[0];
}

/**
 * Pick the best caption track for the caller's language preference.
 *
 * Preference order:
 *   1. manual captions in a preferred language
 *   2. auto captions in a preferred language
 *   3. any manual captions (Arabic first, then English, then first available)
 *   4. any auto captions (same order)
 *
 * @param {Array} tracks
 * @param {string[]} [preferredLanguages] e.g. ['ar', 'en'] — user hint first
 * @returns {object|null} the chosen track (with `languageCode`, `kind`, `baseUrl`)
 */
export function pickCaptionTrack(tracks, preferredLanguages = []) {
  const usable = (Array.isArray(tracks) ? tracks : []).filter(
    (track) => track && typeof track.baseUrl === 'string' && track.baseUrl,
  );
  if (!usable.length) return null;

  const preferred = [...new Set(
    (preferredLanguages || [])
      .map((code) => normaliseCaptionLanguage(code))
      .filter(Boolean),
  )];

  const isAuto = (track) => track.kind === 'asr';
  const languageOf = (track) => normaliseCaptionLanguage(track.languageCode);

  const findIn = (pool, languages) => {
    for (const language of languages) {
      const hit = pool.find((track) => languageOf(track) === language);
      if (hit) return hit;
    }
    return null;
  };

  const manual = usable.filter((track) => !isAuto(track));
  const auto = usable.filter(isAuto);

  // 1–2: preferred language, manual before auto.
  if (preferred.length) {
    const manualHit = findIn(manual, preferred);
    if (manualHit) return manualHit;
    const autoHit = findIn(auto, preferred);
    if (autoHit) return autoHit;
  }

  // 3–4: no preference match — Arabic, then English, then first available.
  const fallbackOrder = ['ar', 'en'];
  return (
    findIn(manual, fallbackOrder) ||
    manual[0] ||
    findIn(auto, fallbackOrder) ||
    auto[0] ||
    null
  );
}

/* -------------------------------------------------------------------------- */
/* Watch-page parsing                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Extract caption tracks + video metadata from a YouTube watch page HTML.
 *
 * The page embeds `var ytInitialPlayerResponse = {...};` — a JSON blob with
 * `captions.playerCaptionsTracklistRenderer.captionTracks` and
 * `videoDetails.{title, lengthSeconds}`. We locate the blob with a regex and
 * JSON.parse it. If the blob is missing (bot check, consent page, private
 * video) we return nulls so the caller can report a clear error.
 *
 * @param {string} html
 * @returns {{ tracks: Array, title: string|null, durationSeconds: number|null }}
 */
export function parseWatchPage(html) {
  const empty = { tracks: [], title: null, durationSeconds: null };
  if (typeof html !== 'string' || !html) return empty;

  const match = html.match(/var\s+ytInitialPlayerResponse\s*=\s*(\{.*?\});/s);
  if (!match) return empty;

  let player;
  try {
    player = JSON.parse(match[1]);
  } catch {
    return empty;
  }

  const tracks =
    player?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];

  const details = player?.videoDetails ?? {};
  const title = typeof details.title === 'string' && details.title ? details.title : null;
  const length = Number(details.lengthSeconds);
  const durationSeconds = Number.isFinite(length) && length > 0 ? length : null;

  return {
    tracks: Array.isArray(tracks) ? tracks : [],
    title,
    durationSeconds,
  };
}

/* -------------------------------------------------------------------------- */
/* JSON3 caption parsing                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Turn a YouTube timedtext JSON3 payload into the normalised transcript shape
 * the studio already renders (`text`, `segments`, `words`, `duration`).
 *
 * JSON3 shape: `{ events: [{ tStartMs, dDurationMs, segs: [{ utf8 }] }] }`.
 * Auto-captions use a rolling window (each event repeats the previous words),
 * so we dedupe: a segment's text is only kept when it adds new words beyond
 * the previous segment. Manual captions have no overlap and pass through.
 *
 * @param {unknown} payload parsed JSON3 (or raw string — parsed here)
 * @returns {{ text: string, segments: Array, words: Array, duration: number|null }}
 */
export function parseJson3Captions(payload) {
  let data = payload;
  if (typeof payload === 'string') {
    try {
      data = JSON.parse(payload);
    } catch {
      return { text: '', segments: [], words: [], duration: null };
    }
  }

  const events = Array.isArray(data?.events) ? data.events : [];
  const segments = [];
  const words = [];
  let previousText = '';

  for (const event of events) {
    const segs = Array.isArray(event?.segs) ? event.segs : [];
    const raw = segs.map((seg) => seg?.utf8 ?? '').join('');
    const text = raw.replace(/\s+/g, ' ').trim();
    if (!text) continue;

    const startMs = Number(event?.tStartMs);
    const durationMs = Number(event?.dDurationMs);
    const start = Number.isFinite(startMs) ? startMs / 1000 : null;
    const end =
      Number.isFinite(startMs) && Number.isFinite(durationMs)
        ? (startMs + durationMs) / 1000
        : null;

    // Rolling-window dedupe for auto-captions: skip text already shown.
    let display = text;
    if (previousText && text.startsWith(previousText)) {
      display = text.slice(previousText.length).trim();
    } else if (previousText && previousText.startsWith(text)) {
      display = '';
    }
    if (!display) {
      // Still advance the window so the next event compares correctly.
      if (text.length >= previousText.length) previousText = text;
      continue;
    }
    previousText = text;

    segments.push({ text: display, start, end, speaker: null });

    // Word-level timings are approximated by splitting the segment evenly —
    // JSON3 has no per-word timestamps. Good enough for the timeline UI.
    const tokens = display.split(/\s+/).filter(Boolean);
    if (start !== null && end !== null && end > start && tokens.length) {
      const step = (end - start) / tokens.length;
      tokens.forEach((token, index) => {
        words.push({
          word: token,
          start: start + index * step,
          end: start + (index + 1) * step,
          confidence: null,
          speaker: null,
        });
      });
    } else {
      for (const token of tokens) {
        words.push({ word: token, start, end, confidence: null, speaker: null });
      }
    }
  }

  const text = segments.map((segment) => segment.text).join(' ').replace(/\s+/g, ' ').trim();
  const last = segments[segments.length - 1];
  const duration = last?.end ?? null;

  return { text, segments, words, duration };
}

/** Collapse whitespace the same way the STT engines tidy transcripts. */
export function tidyCaptionText(value) {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
