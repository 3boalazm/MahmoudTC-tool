/**
 * Tests for YouTube link handling: ID extraction, track picking, watch-page
 * parsing and JSON3 caption parsing (all pure, no network).
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractYouTubeVideoId,
  isYouTubeUrl,
  normaliseCaptionLanguage,
  parseJson3Captions,
  parseWatchPage,
  pickCaptionTrack,
} from '../lib/youtube.js';
import {
  isCaptionTrackUrl,
  json3TrackUrl,
  fetchYouTubeTranscript,
} from '../lib/server/youtube.js';

/* ------------------------------------------------------------- video IDs */

test('extractYouTubeVideoId handles every common URL shape', () => {
  const id = 'dQw4w9WgXcQ';
  for (const url of [
    `https://www.youtube.com/watch?v=${id}`,
    `https://www.youtube.com/watch?v=${id}&t=42s`,
    `https://youtube.com/watch?v=${id}`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://music.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}`,
    `https://youtu.be/${id}?t=10`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube.com/live/${id}`,
    `https://www.youtube-nocookie.com/embed/${id}`,
  ]) {
    assert.equal(extractYouTubeVideoId(url), id, url);
    assert.equal(isYouTubeUrl(url), true, url);
  }
});

test('extractYouTubeVideoId rejects non-video and malformed links', () => {
  for (const url of [
    'https://www.youtube.com/@somechannel',
    'https://www.youtube.com/playlist?list=PL123',
    'https://www.youtube.com/results?search_query=lofi',
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/watch?v=waytoolong12345',
    'https://example.com/watch?v=dQw4w9WgXcQ',
    'not a url',
    '',
    null,
    undefined,
  ]) {
    assert.equal(extractYouTubeVideoId(url), null, String(url));
    assert.equal(isYouTubeUrl(url), false, String(url));
  }
});

/* --------------------------------------------------------- track picking */

const manualAr = { baseUrl: 'https://www.youtube.com/api/timedtext?v=x&lang=ar', languageCode: 'ar', name: { simpleText: 'Arabic' } };
const autoAr = { baseUrl: 'https://www.youtube.com/api/timedtext?v=x&lang=ar&kind=asr', languageCode: 'ar', kind: 'asr' };
const manualEn = { baseUrl: 'https://www.youtube.com/api/timedtext?v=x&lang=en', languageCode: 'en' };
const autoEn = { baseUrl: 'https://www.youtube.com/api/timedtext?v=x&lang=en&kind=asr', languageCode: 'en', kind: 'asr' };

test('pickCaptionTrack prefers manual over auto in the preferred language', () => {
  assert.equal(pickCaptionTrack([autoAr, manualAr], ['ar']), manualAr);
  assert.equal(pickCaptionTrack([autoEn, manualEn], ['en']), manualEn);
});

test('pickCaptionTrack falls back to auto when no manual track matches', () => {
  assert.equal(pickCaptionTrack([autoAr, manualEn], ['ar']), autoAr);
});

test('pickCaptionTrack falls back to Arabic then English when preferred misses', () => {
  assert.equal(pickCaptionTrack([autoEn, manualEn], ['fr']), manualEn);
  assert.equal(pickCaptionTrack([autoEn], []), autoEn);
  assert.equal(pickCaptionTrack([], ['ar']), null);
  assert.equal(pickCaptionTrack(null, ['ar']), null);
});

test('normaliseCaptionLanguage strips region and underscores', () => {
  assert.equal(normaliseCaptionLanguage('ar-EG'), 'ar');
  assert.equal(normaliseCaptionLanguage('en_US'), 'en');
  assert.equal(normaliseCaptionLanguage('EN'), 'en');
  assert.equal(normaliseCaptionLanguage(''), '');
});

/* --------------------------------------------------------- watch page */

test('parseWatchPage extracts tracks, title and duration', () => {
  const player = {
    captions: {
      playerCaptionsTracklistRenderer: {
        captionTracks: [manualAr, autoEn],
      },
    },
    videoDetails: { title: 'Test Video', lengthSeconds: '372' },
  };
  const html = `<html><script>var ytInitialPlayerResponse = ${JSON.stringify(player)};</script></html>`;
  const parsed = parseWatchPage(html);
  assert.equal(parsed.tracks.length, 2);
  assert.equal(parsed.title, 'Test Video');
  assert.equal(parsed.durationSeconds, 372);
});

test('parseWatchPage returns empty on bot/consent pages', () => {
  assert.deepEqual(parseWatchPage('<html>consent</html>'), {
    tracks: [],
    title: null,
    durationSeconds: null,
  });
  assert.deepEqual(parseWatchPage(''), { tracks: [], title: null, durationSeconds: null });
  assert.deepEqual(parseWatchPage(null), { tracks: [], title: null, durationSeconds: null });
});

/* --------------------------------------------------------- JSON3 parsing */

test('parseJson3Captions turns events into segments, words and text', () => {
  const payload = {
    events: [
      { tStartMs: 0, dDurationMs: 2000, segs: [{ utf8: 'Hello ' }, { utf8: 'world' }] },
      { tStartMs: 2000, dDurationMs: 1500, segs: [{ utf8: 'Second line' }] },
      { segs: [{ utf8: ' ' }] },
    ],
  };
  const parsed = parseJson3Captions(payload);
  assert.equal(parsed.text, 'Hello world Second line');
  assert.equal(parsed.segments.length, 2);
  assert.equal(parsed.segments[0].start, 0);
  assert.equal(parsed.segments[0].end, 2);
  assert.ok(parsed.words.length >= 3);
  assert.equal(parsed.duration, 3.5);
});

test('parseJson3Captions dedupes the auto-caption rolling window', () => {
  const payload = {
    events: [
      { tStartMs: 0, dDurationMs: 1000, segs: [{ utf8: 'Hello' }] },
      { tStartMs: 1000, dDurationMs: 1000, segs: [{ utf8: 'Hello world' }] },
      { tStartMs: 2000, dDurationMs: 1000, segs: [{ utf8: 'Hello world again' }] },
    ],
  };
  const parsed = parseJson3Captions(payload);
  assert.equal(parsed.text, 'Hello world again');
});

test('parseJson3Captions handles raw strings and garbage', () => {
  const fromString = parseJson3Captions(JSON.stringify({ events: [{ tStartMs: 0, dDurationMs: 1000, segs: [{ utf8: 'Hi' }] }] }));
  assert.equal(fromString.text, 'Hi');
  assert.deepEqual(parseJson3Captions('not json'), { text: '', segments: [], words: [], duration: null });
  assert.deepEqual(parseJson3Captions(null), { text: '', segments: [], words: [], duration: null });
  assert.deepEqual(parseJson3Captions({}), { text: '', segments: [], words: [], duration: null });
});

/* ------------------------------------------------------- track URL guard */

test('isCaptionTrackUrl only allows YouTube/Google timedtext hosts', () => {
  assert.equal(isCaptionTrackUrl('https://www.youtube.com/api/timedtext?v=x&lang=ar'), true);
  assert.equal(isCaptionTrackUrl('https://video.google.com/timedtext?v=x'), true);
  assert.equal(isCaptionTrackUrl('https://evil.example.com/timedtext?v=x'), false);
  assert.equal(isCaptionTrackUrl('http://www.youtube.com/api/timedtext?v=x'), false);
  assert.equal(isCaptionTrackUrl('https://user:pass@www.youtube.com/api/timedtext'), false);
  assert.equal(isCaptionTrackUrl('not a url'), false);
});

test('json3TrackUrl forces fmt=json3', () => {
  const url = json3TrackUrl('https://www.youtube.com/api/timedtext?v=x&lang=ar&fmt=srv3');
  assert.match(url, /fmt=json3/);
});

/* --------------------------------------------------- end-to-end fetcher */

const PLAYER = {
  captions: {
    playerCaptionsTracklistRenderer: {
      captionTracks: [
        { baseUrl: 'https://www.youtube.com/api/timedtext?v=dQw4w9WgXcQ&lang=en', languageCode: 'en' },
        { baseUrl: 'https://www.youtube.com/api/timedtext?v=dQw4w9WgXcQ&lang=ar', languageCode: 'ar' },
      ],
    },
  },
  videoDetails: { title: 'A video', lengthSeconds: '42' },
};

const WATCH_HTML = `<script>var ytInitialPlayerResponse = ${JSON.stringify(PLAYER)};</script>`;
const JSON3 = JSON.stringify({
  events: [
    { tStartMs: 0, dDurationMs: 2000, segs: [{ utf8: 'مرحبا' }] },
    { tStartMs: 2000, dDurationMs: 2000, segs: [{ utf8: 'بالعالم' }] },
  ],
});

function fakeFetch({ watchHtml = WATCH_HTML, captionBody = JSON3, onRequest } = {}) {
  return async (url) => {
    if (onRequest) onRequest(String(url));
    if (String(url).includes('/watch')) return new Response(watchHtml, { status: 200 });
    if (String(url).includes('timedtext')) return new Response(captionBody, { status: 200 });
    throw new Error(`unexpected URL ${url}`);
  };
}

test('fetchYouTubeTranscript returns a normalised transcript and honours the language', async () => {
  const seen = [];
  const result = await fetchYouTubeTranscript('https://youtu.be/dQw4w9WgXcQ', {
    language: 'ar',
    fetchImpl: fakeFetch({ onRequest: (url) => seen.push(url) }),
  });

  assert.equal(result.text, 'مرحبا بالعالم');
  assert.equal(result.engine, 'youtube');
  assert.equal(result.model, 'captions');
  assert.equal(result.sourceType, 'youtube');
  assert.equal(result.videoId, 'dQw4w9WgXcQ');
  assert.equal(result.videoTitle, 'A video');
  assert.equal(result.captionLanguage, 'ar');
  assert.equal(result.captionKind, 'manual');
  assert.equal(result.duration, 4);
  // The Arabic track is fetched, and it is asked for json3.
  assert.match(seen.at(-1), /lang=ar/);
  assert.match(seen.at(-1), /fmt=json3/);
});

test('fetchYouTubeTranscript reports auto captions as such', async () => {
  const player = structuredClone(PLAYER);
  player.captions.playerCaptionsTracklistRenderer.captionTracks = [
    { baseUrl: 'https://www.youtube.com/api/timedtext?v=dQw4w9WgXcQ&lang=en', languageCode: 'en', kind: 'asr' },
  ];
  const result = await fetchYouTubeTranscript('dQw4w9WgXcQ', {
    fetchImpl: fakeFetch({ watchHtml: `<script>var ytInitialPlayerResponse = ${JSON.stringify(player)};</script>` }),
  });
  assert.equal(result.model, 'auto-captions');
  assert.equal(result.captionKind, 'auto');
});

test('fetchYouTubeTranscript fails clearly for every bad case', async () => {
  const cases = [
    {
      name: 'invalid id',
      call: () => fetchYouTubeTranscript('nope', { fetchImpl: fakeFetch() }),
      code: 'INVALID_VIDEO',
    },
    {
      name: 'deleted video',
      call: () => fetchYouTubeTranscript('dQw4w9WgXcQ', {
        fetchImpl: async () => new Response('', { status: 404 }),
      }),
      code: 'NOT_FOUND',
    },
    {
      name: 'bot check',
      call: () => fetchYouTubeTranscript('dQw4w9WgXcQ', {
        fetchImpl: async () => new Response('<html>consent</html>', { status: 200 }),
      }),
      code: 'BOT_CHECK',
    },
    {
      name: 'no captions',
      call: () => fetchYouTubeTranscript('dQw4w9WgXcQ', {
        fetchImpl: fakeFetch({
          watchHtml: `<script>var ytInitialPlayerResponse = ${JSON.stringify({
            captions: { playerCaptionsTracklistRenderer: { captionTracks: [] } },
            videoDetails: { title: 'x' },
          })};</script>`,
        }),
      }),
      code: 'NO_CAPTIONS',
    },
    {
      name: 'empty captions',
      call: () => fetchYouTubeTranscript('dQw4w9WgXcQ', { fetchImpl: fakeFetch({ captionBody: '{"events":[]}' }) }),
      code: 'NO_CAPTIONS',
    },
    {
      name: 'network down',
      call: () => fetchYouTubeTranscript('dQw4w9WgXcQ', {
        fetchImpl: async () => {
          throw new Error('boom');
        },
      }),
      code: 'NETWORK',
    },
  ];

  for (const item of cases) {
    await assert.rejects(item.call, (error) => {
      assert.equal(error.name, 'YouTubeError', item.name);
      assert.equal(error.code, item.code, item.name);
      assert.ok(error.status >= 400 && error.status < 600, item.name);
      return true;
    }, item.name);
  }
});

test('a caption-track redirect off YouTube is refused, not followed', async () => {
  const seen = [];
  const fetchImpl = async (url) => {
    seen.push(String(url));
    if (String(url).includes('/watch')) return new Response(WATCH_HTML, { status: 200 });
    if (String(url).includes('evil.example.com')) throw new Error('should never be fetched');
    return new Response('', { status: 302, headers: { location: 'https://evil.example.com/steal' } });
  };

  await assert.rejects(
    () => fetchYouTubeTranscript('dQw4w9WgXcQ', { fetchImpl }),
    (error) => {
      assert.equal(error.code, 'NETWORK');
      assert.match(error.message, /off youtube/i);
      return true;
    },
  );
  assert.ok(!seen.some((url) => url.includes('evil.example.com')));
});

test('a caption-track redirect that stays on YouTube is followed once', async () => {
  let captionHits = 0;
  const fetchImpl = async (url) => {
    if (String(url).includes('/watch')) return new Response(WATCH_HTML, { status: 200 });
    captionHits += 1;
    if (String(url).includes('/api/timedtext') && !String(url).includes('moved=1')) {
      return new Response('', {
        status: 302,
        headers: { location: String(url).replace('/api/timedtext', '/api/timedtext2') + '&moved=1' },
      });
    }
    return new Response(JSON3, { status: 200 });
  };

  const result = await fetchYouTubeTranscript('dQw4w9WgXcQ', { fetchImpl });
  assert.equal(result.text, 'مرحبا بالعالم');
  assert.equal(captionHits, 2);
});

test('an oversized YouTube response is refused instead of buffered', async () => {
  const declared = async () =>
    new Response(WATCH_HTML, { status: 200, headers: { 'content-length': String(64 * 1024 * 1024) } });

  await assert.rejects(
    () => fetchYouTubeTranscript('dQw4w9WgXcQ', { fetchImpl: declared }),
    (error) => {
      assert.equal(error.code, 'NETWORK');
      assert.match(error.message, /large/i);
      return true;
    },
  );
});
