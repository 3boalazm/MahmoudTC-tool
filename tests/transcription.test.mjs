/**
 * Unit tests for the provider-agnostic logic. Run with: npm test
 * Pure functions only — no network, no API keys, no DOM.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDeepgramQuery,
  buildMultipartBody,
  estimateAudioSeconds,
  extractProviderMessage,
  httpStatusFor,
  TranscriptionError,
  ERROR_CODES,
  parseDeepgramResponse,
  parseGladiaResult,
  transcribeWithDeepgram,
  transcribeWithGladia,
} from '../lib/engines.js';

import { isBlobStorageUrl, sanitiseUrl, filenameFromUrl } from '../lib/url-guard.js';

import {
  analyseText,
  baseName,
  buildPlainText,
  buildSrt,
  formatBytes,
  formatDuration,
  formatElapsed,
  formatConfidence,
} from '../lib/client/format.js';

/* ------------------------------------------------------------------ errors */

test('TranscriptionError marks retryable codes and serialises safely', () => {
  const error = new TranscriptionError(ERROR_CODES.RATE_LIMITED, 'Deepgram responded 429', {
    provider: 'deepgram',
    status: 429,
  });

  assert.equal(error.retryable, true);
  assert.equal(error.provider, 'deepgram');
  assert.deepEqual(error.toJSON(), {
    code: 'RATE_LIMITED',
    provider: 'deepgram',
    status: 429,
    retryable: true,
    message: 'Deepgram responded 429',
  });
});

test('bad audio is not retried on the fallback engine', () => {
  const error = new TranscriptionError(ERROR_CODES.BAD_REQUEST, 'unsupported container', {
    provider: 'deepgram',
    status: 400,
  });
  assert.equal(error.retryable, false);
});

test('httpStatusFor maps failure codes to client status codes', () => {
  assert.equal(httpStatusFor({ code: ERROR_CODES.RATE_LIMITED }), 429);
  assert.equal(httpStatusFor({ code: ERROR_CODES.PAYMENT_REQUIRED }), 402);
  assert.equal(httpStatusFor({ code: ERROR_CODES.TIMEOUT }), 504);
  assert.equal(httpStatusFor({ code: ERROR_CODES.BAD_REQUEST }), 400);
  assert.equal(httpStatusFor({ code: ERROR_CODES.MISSING_KEY }), 503);
});

test('extractProviderMessage copes with both providers’ error shapes', () => {
  assert.equal(extractProviderMessage({ err_msg: 'quota exceeded' }), 'quota exceeded');
  assert.equal(extractProviderMessage({ message: 'invalid key' }), 'invalid key');
  assert.equal(extractProviderMessage([{ message: 'a' }, { message: 'b' }]), 'a; b');
  assert.equal(extractProviderMessage(''), '');
});

/* ----------------------------------------------------------------- deepgram */

test('buildDeepgramQuery defaults to nova-2 with smart formatting', () => {
  const query = new URLSearchParams(buildDeepgramQuery());
  assert.equal(query.get('model'), 'nova-2');
  assert.equal(query.get('smart_format'), 'true');
  assert.equal(query.get('punctuate'), 'true');
  assert.equal(query.get('language'), 'en');
});

test('buildDeepgramQuery passes through supported languages', () => {
  const query = new URLSearchParams(buildDeepgramQuery({ language: 'es' }));
  assert.equal(query.get('language'), 'es');
  assert.equal(query.get('detect_language'), null);
});

test('buildDeepgramQuery switches to auto-detection for unsupported languages', () => {
  const query = new URLSearchParams(buildDeepgramQuery({ language: 'ar' }));
  assert.equal(query.get('detect_language'), 'true');
  assert.equal(query.get('language'), null);
});

test('buildDeepgramQuery uses the multilingual model outside nova-2', () => {
  const query = new URLSearchParams(buildDeepgramQuery({ model: 'nova-3' }));
  assert.equal(query.get('language'), 'multi');
});

test('parseDeepgramResponse normalises a channel response', () => {
  const payload = {
    metadata: { request_id: 'abc-123', duration: 4.2 },
    results: {
      channels: [
        {
          detected_language: 'en',
          alternatives: [
            {
              transcript: 'Hello  world, this is a test.',
              confidence: 0.98,
              words: [
                { word: 'hello', punctuated_word: 'Hello', start: 0, end: 0.4, confidence: 0.99 },
                { word: 'world', punctuated_word: 'world', start: 0.4, end: 0.9, confidence: 0.97 },
              ],
              paragraphs: {
                paragraphs: [{ sentences: [{ text: 'Hello world.' }, { text: 'This is a test.' }] }],
              },
            },
          ],
        },
      ],
    },
  };

  const result = parseDeepgramResponse(payload);
  assert.equal(result.text, 'Hello  world, this is a test.');
  assert.equal(result.language, 'en');
  assert.equal(result.duration, 4.2);
  assert.equal(result.confidence, 0.98);
  assert.equal(result.words.length, 2);
  assert.equal(result.words[0].word, 'Hello');
  assert.equal(result.segments.length, 2);
});

test('parseDeepgramResponse survives an empty response', () => {
  const result = parseDeepgramResponse({});
  assert.equal(result.text, '');
  assert.equal(result.confidence, null);
  assert.deepEqual(result.words, []);
});

test('estimateAudioSeconds picks a bitrate from the mime type', () => {
  assert.equal(estimateAudioSeconds(16_000, 'audio/webm'), 1);
  assert.equal(estimateAudioSeconds(320_000, 'audio/webm'), 20);
  assert.equal(estimateAudioSeconds(352_800, 'audio/wav'), 2);
  assert.equal(estimateAudioSeconds(0), null);
});

/* ------------------------------------------------------------------- gladia */

test('parseGladiaResult prefers full_transcript and keeps utterance timings', () => {
  const job = {
    request_id: 'G-123',
    status: 'done',
    file: { audio_duration: 6.5 },
    result: {
      transcription: {
        full_transcript: 'Bonjour tout le monde.',
        languages: ['fr'],
        utterances: [
          { text: 'Bonjour', start: 0, end: 0.8, speaker: 0 },
          { text: 'tout le monde.', start: 0.8, end: 1.8, speaker: 0 },
        ],
      },
    },
  };

  const result = parseGladiaResult(job, 'job-1');
  assert.equal(result.text, 'Bonjour tout le monde.');
  assert.equal(result.engine, 'gladia');
  assert.equal(result.language, 'fr');
  assert.equal(result.duration, 6.5);
  assert.equal(result.segments.length, 2);
  assert.equal(result.requestId, 'G-123');
});

test('parseGladiaResult falls back to joining utterances when there is no full transcript', () => {
  const result = parseGladiaResult({
    result: { transcription: { utterances: [{ text: 'One.' }, { text: 'Two.' }] } },
  });
  assert.equal(result.text, 'One. Two.');
});

/* ---------------------------------------------------------------- multipart */

test('buildMultipartBody wraps the audio in a well-formed multipart body', () => {
  const audio = Buffer.from('fake-audio-bytes');
  const { body, contentType } = buildMultipartBody({
    buffer: audio,
    contentType: 'audio/webm',
    filename: 'clip.webm',
  });

  const boundary = contentType.split('boundary=')[1];
  assert.match(contentType, /^multipart\/form-data; boundary=/);
  assert.ok(body.includes(Buffer.from(`--${boundary}\r\n`)));
  assert.ok(body.includes(Buffer.from('name="audio"; filename="clip.webm"')));
  assert.ok(body.includes(Buffer.from('Content-Type: audio/webm')));
  assert.ok(body.includes(audio), 'raw audio bytes must survive intact');
  assert.ok(body.toString('utf8').endsWith(`--${boundary}--\r\n`));
});

test('buildMultipartBody strips quotes and newlines from the filename', () => {
  const { body } = buildMultipartBody({
    buffer: Buffer.from('x'),
    contentType: 'audio/mpeg',
    filename: 'ev"il\r\nname.mp3',
  });
  assert.ok(!body.toString('utf8').includes('ev"il'));
  assert.ok(body.toString('utf8').includes('filename="evilname.mp3"'));
});

/* ------------------------------------------------------------------ format */

test('formatDuration renders mm:ss and h:mm:ss', () => {
  assert.equal(formatDuration(0), '00:00');
  assert.equal(formatDuration(74), '01:14');
  assert.equal(formatDuration(3725), '1:02:05');
  assert.equal(formatDuration(Number.NaN), '00:00');
});

test('formatBytes uses sane units', () => {
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(2048), '2 KB');
  assert.equal(formatBytes(1_572_864), '1.5 MB');
});

test('formatElapsed switches from ms to seconds', () => {
  assert.equal(formatElapsed(450), '450ms');
  assert.equal(formatElapsed(1234), '1.2s');
  assert.equal(formatElapsed(15_000), '15s');
});

test('analyseText counts words, characters and sentences', () => {
  const stats = analyseText('Hello world. This is a second sentence!');
  assert.equal(stats.words, 7);
  assert.equal(stats.sentences, 2);
  assert.equal(stats.characters, 39);
  assert.equal(stats.charactersNoSpaces, 33);
});

test('analyseText handles empty input', () => {
  const stats = analyseText('');
  assert.equal(stats.words, 0);
  assert.equal(stats.sentences, 0);
});

test('buildSrt emits valid subtitle blocks and returns null without timings', () => {
  const srt = buildSrt([
    { text: 'First line', start: 0, end: 1.25 },
    { text: 'Second line', start: 1.25, end: 3 },
  ]);

  assert.equal(
    srt,
    '1\n00:00:00,000 --> 00:00:01,250\nFirst line\n\n2\n00:00:01,250 --> 00:00:03,000\nSecond line\n',
  );
  assert.equal(buildSrt([]), null);
  assert.equal(buildSrt([{ text: 'no timing' }]), null);
});

test('buildPlainText wraps paragraphs at the requested width', () => {
  const wrapped = buildPlainText('one two three four five six', { wrapAt: 10 });
  assert.equal(wrapped, 'one two\nthree four\nfive six');
  assert.equal(buildPlainText('  spaced  '), 'spaced');
});

test('baseName strips the extension and unsafe characters', () => {
  assert.equal(baseName('interview part 1.m4a'), 'interview part 1');
  assert.equal(baseName('a/b:c?.wav'), 'a_b_c_');
  assert.equal(baseName(''), 'transcript');
});

test('formatConfidence renders a percentage or null', () => {
  assert.equal(formatConfidence(0.9134), '91%');
  assert.equal(formatConfidence(0), null);
  assert.equal(formatConfidence(undefined), null);
});

/* --------------------------------------------------------------- url guard */

test('isBlobStorageUrl accepts only this project’s Blob store', () => {
  const good = 'https://abc123.public.blob.vercel-storage.com/stt-uploads/clip.webm';
  assert.equal(isBlobStorageUrl(good), true);

  // SSRF and lookalike hosts must all be rejected.
  for (const bad of [
    'http://abc123.public.blob.vercel-storage.com/clip.webm', // not https
    'https://169.254.169.254/latest/meta-data/', // cloud metadata
    'https://localhost:3000/api/health',
    'https://evil.example.com/clip.webm',
    'https://abc123.public.blob.vercel-storage.com.evil.com/clip.webm',
    'https://user:pass@abc123.public.blob.vercel-storage.com/clip.webm',
    'https://abc123.public.blob.vercel-storage.com:8443/clip.webm',
    'https://abc123.public.blob.vercel-storage.com/clip.webm#frag',
    'file:///etc/passwd',
    '',
    null,
    undefined,
    42,
  ]) {
    assert.equal(isBlobStorageUrl(bad), false, `should reject: ${String(bad)}`);
  }
});

test('isBlobStorageUrl rejects over-long and whitespace-smuggled URLs', () => {
  const base = 'https://abc123.public.blob.vercel-storage.com/';
  assert.equal(isBlobStorageUrl(base + 'a'.repeat(3_000)), false);
  assert.equal(isBlobStorageUrl(`${base}clip.webm\nhttps://evil.example.com/`), false);
  assert.equal(isBlobStorageUrl(`${base}cl ip.webm`), false);
});

test('sanitiseUrl drops the path and query from a URL', () => {
  assert.equal(
    sanitiseUrl('https://abc123.public.blob.vercel-storage.com/stt-uploads/clip.webm?x=1'),
    'https://abc123.public.blob.vercel-storage.com/…',
  );
  assert.equal(sanitiseUrl('not a url'), '<invalid-url>');
});

test('filenameFromUrl recovers a usable filename', () => {
  assert.equal(
    filenameFromUrl('https://abc123.public.blob.vercel-storage.com/stt-uploads/my%20clip.webm'),
    'my clip.webm',
  );
  assert.equal(filenameFromUrl('https://abc123.public.blob.vercel-storage.com/'), 'audio');
  assert.equal(filenameFromUrl('nonsense', 'fallback.wav'), 'fallback.wav');
});

/* ------------------------------------------------- remote audio (serverless) */

test('transcribeWithDeepgram sends a JSON url body for remote audio', async () => {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(
      JSON.stringify({
        metadata: { request_id: 'dg-remote', duration: 12 },
        results: { channels: [{ alternatives: [{ transcript: 'Remote audio works.', confidence: 0.9 }] }] },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };

  try {
    const result = await transcribeWithDeepgram(
      { url: 'https://abc123.public.blob.vercel-storage.com/stt-uploads/clip.webm' },
      { apiKey: 'test-key', baseUrl: 'https://deepgram.test/v1/listen' },
    );

    assert.equal(result.text, 'Remote audio works.');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].init.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(calls[0].init.body), {
      url: 'https://abc123.public.blob.vercel-storage.com/stt-uploads/clip.webm',
    });
  } finally {
    globalThis.fetch = original;
  }
});

test('transcribeWithGladia skips its upload step when given a URL', async () => {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const href = String(url);
    calls.push(href);

    if (href.endsWith('/transcription')) {
      return new Response(JSON.stringify({ id: 'job-9', status: 'queued' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(
      JSON.stringify({
        id: 'job-9',
        status: 'done',
        result: { transcription: { full_transcript: 'Remote fallback works.', utterances: [] } },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };

  try {
    const result = await transcribeWithGladia(
      { url: 'https://abc123.public.blob.vercel-storage.com/stt-uploads/clip.webm' },
      { apiKey: 'test-key', baseUrl: 'https://gladia.test/v2', pollIntervalMs: 1 },
    );

    assert.equal(result.text, 'Remote fallback works.');
    assert.ok(!calls.some((href) => href.endsWith('/upload')), 'must not re-upload remote audio');
    assert.equal(calls.length, 2, 'create job + poll');
  } finally {
    globalThis.fetch = original;
  }
});

test('providers reject a source with neither bytes nor a URL', async () => {
  await assert.rejects(() => transcribeWithDeepgram({}, { apiKey: 'k' }), {
    code: 'BAD_REQUEST',
  });
  await assert.rejects(() => transcribeWithGladia({}, { apiKey: 'k' }), {
    code: 'BAD_REQUEST',
  });
});
