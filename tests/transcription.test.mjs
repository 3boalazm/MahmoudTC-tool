/**
 * Unit tests for the provider-agnostic logic. Run with: npm test
 * Pure functions only — no network, no API keys, no DOM.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDeepgramQuery,
  buildMultipartBody,
  buildMultipartForm,
  estimateAudioSeconds,
  extractProviderMessage,
  httpStatusFor,
  TranscriptionError,
  ERROR_CODES,
  normaliseAudioSource,
  parseAssemblyAITranscript,
  parseDeepgramResponse,
  parseGladiaResult,
  parseSpeechmaticsTranscript,
  summariseSpeechmaticsUsage,
  transcribeWithAssemblyAI,
  transcribeWithDeepgram,
  transcribeWithGladia,
  transcribeWithSpeechmatics,
} from '../lib/engines.js';

import {
  accentFor,
  DEFAULT_ENGINE_ORDER,
  ENGINE_IDS,
  ENGINE_MAP,
  engineLabel,
  engineModelLabel,
  normaliseEngineId,
} from '../lib/engines-meta.js';

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

test('buildDeepgramQuery defaults to Nova-3 and detects language instead of forcing English', () => {
  const query = new URLSearchParams(buildDeepgramQuery());
  assert.equal(query.get('model'), 'nova-3');
  assert.equal(query.get('smart_format'), 'true');
  assert.equal(query.get('punctuate'), 'true');
  assert.equal(query.get('detect_language'), 'true');
  assert.equal(query.get('language'), null);
});

test('buildDeepgramQuery passes through supported languages', () => {
  const query = new URLSearchParams(buildDeepgramQuery({ language: 'es' }));
  assert.equal(query.get('language'), 'es');
  assert.equal(query.get('detect_language'), null);
});

test('buildDeepgramQuery upgrades Nova-2 to Nova-3 for Arabic', () => {
  const query = new URLSearchParams(buildDeepgramQuery({ model: 'nova-2', language: 'ar-EG' }));
  assert.equal(query.get('model'), 'nova-3');
  assert.equal(query.get('language'), 'ar-EG');
  assert.equal(query.get('detect_language'), null);
});

test('buildDeepgramQuery uses language detection for Nova-3 auto mode', () => {
  const query = new URLSearchParams(buildDeepgramQuery({ model: 'nova-3' }));
  assert.equal(query.get('detect_language'), 'true');
  assert.equal(query.get('language'), null);
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

/* --------------------------------------------------------------- engines meta */

test('the engine registry describes four engines in failover order', () => {
  assert.deepEqual(ENGINE_IDS, ['deepgram', 'gladia', 'assemblyai', 'speechmatics']);
  assert.deepEqual(DEFAULT_ENGINE_ORDER, ['assemblyai', 'deepgram', 'gladia', 'speechmatics']);
  assert.deepEqual([...DEFAULT_ENGINE_ORDER].sort(), [...ENGINE_IDS].sort());

  for (const id of ENGINE_IDS) {
    const engine = ENGINE_MAP[id];
    assert.ok(engine.label, `${id} needs a label`);
    assert.ok(engine.keyVar, `${id} needs an env var name`);
    assert.match(engine.accent, /^(iris|mint|amber|rose)$/);
    assert.ok(engine.dashboardUrl.startsWith('https://'), `${id} needs a dashboard link`);
  }

  // Speechmatics can fetch remote audio itself through the Batch API.
  assert.equal(ENGINE_MAP.speechmatics.supportsRemoteUrl, true);
  assert.equal(ENGINE_MAP.deepgram.supportsRemoteUrl, true);
  assert.equal(ENGINE_MAP.deepgram.keyVar, 'DEEPGRAM_API_KEY');
  assert.equal(ENGINE_MAP.speechmatics.keyVar, 'SPEECHMATICS_API_KEY');
});

test('normaliseEngineId accepts the known engines and defaults everything else', () => {
  for (const id of ENGINE_IDS) assert.equal(normaliseEngineId(id), id);
  assert.equal(normaliseEngineId('  SPEECHMATICS '), 'speechmatics');
  assert.equal(normaliseEngineId('auto'), 'auto');
  assert.equal(normaliseEngineId('whisper'), 'auto');
  assert.equal(normaliseEngineId(undefined), 'auto');
});

test('engine labels and accents resolve for every engine', () => {
  assert.equal(engineLabel('assemblyai'), 'AssemblyAI');
  assert.equal(engineLabel('speechmatics'), 'Speechmatics');
  assert.equal(engineLabel('nope'), '—');
  assert.equal(engineModelLabel('speechmatics', 'enhanced'), 'Speechmatics enhanced');
  assert.equal(engineModelLabel('deepgram'), 'Deepgram Nova-3');
  // accentFor returns the ready-made Tailwind class bundle for an engine.
  assert.equal(accentFor('gladia').dot, 'bg-mint-400');
  assert.equal(accentFor('speechmatics').text, 'text-rose-400');
  assert.equal(accentFor('unknown-engine').dot, 'bg-iris-400');
});

/* ----------------------------------------------------------- multipart form */

test('buildMultipartForm mixes text and file fields into one body', () => {
  const { body, contentType } = buildMultipartForm([
    { name: 'config', value: '{"type":"transcription"}' },
    { name: 'data_file', value: Buffer.from('RIFF'), filename: 'clip.wav', contentType: 'audio/wav' },
  ]);

  assert.match(contentType, /^multipart\/form-data; boundary=----sttstudio/);
  const text = body.toString('utf8');
  assert.match(text, /name="config"\r\n\r\n\{"type":"transcription"\}/);
  assert.match(text, /name="data_file"; filename="clip\.wav"/);
  assert.match(text, /Content-Type: audio\/wav/);
  assert.ok(text.trimEnd().endsWith('--'), 'body must be terminated');
});

/* ---------------------------------------------------------------- assemblyai */

test('parseAssemblyAITranscript converts milliseconds to seconds', () => {
  const result = parseAssemblyAITranscript({
    text: 'Third engine transcript.',
    language_code: 'en_us',
    audio_duration: 3.5,
    confidence: 0.94,
    words: [
      { text: 'Third', start: 0, end: 700, confidence: 0.95 },
      { text: 'engine', start: 700, end: 1200, confidence: 0.93 },
    ],
    utterances: [{ text: 'Third engine transcript.', start: 0, end: 1600, speaker: 'A' }],
  });

  assert.equal(result.text, 'Third engine transcript.');
  assert.equal(result.words[1].start, 0.7);
  assert.equal(result.words[1].end, 1.2);
  assert.equal(result.segments[0].end, 1.6);
  assert.equal(result.language, 'en');
  assert.equal(result.duration, 3.5);
  assert.equal(result.confidence, 0.94);
});

test('parseAssemblyAITranscript falls back to utterances and averages confidence', () => {
  const result = parseAssemblyAITranscript({
    utterances: [
      { text: 'First part.', start: 0, end: 1000 },
      { text: 'Second part.', start: 1000, end: 2000 },
    ],
    words: [
      { text: 'First', start: 0, end: 500, confidence: 0.8 },
      { text: 'part', start: 500, end: 1000, confidence: 0.6 },
    ],
  });

  assert.equal(result.text, 'First part. Second part.');
  assert.equal(result.words.length, 2);
  assert.ok(Math.abs(result.confidence - 0.7) < 0.001);
});

test('transcribeWithGladia uploads the audio as multipart with a boundary content-type', async () => {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const href = String(url);
    calls.push({ href, init });
    const json = (payload) =>
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    if (href.endsWith('/upload')) return json({ audio_url: 'https://api.gladia.local/file/1' });
    if (href.endsWith('/transcription')) return json({ id: 'job-1', status: 'queued' });
    return json({
      id: 'job-1',
      status: 'done',
      result: { transcription: { full_transcript: 'Hello', utterances: [] } },
    });
  };

  try {
    const audio = Buffer.from('audio-bytes');
    const result = await transcribeWithGladia(
      { buffer: audio, filename: 'clip.webm', contentType: 'audio/webm' },
      { apiKey: 'test-key', baseUrl: 'https://gladia.test/v2', pollIntervalMs: 1 },
    );
    assert.equal(result.text, 'Hello');

    const upload = calls.find((call) => call.href.endsWith('/upload'));
    assert.match(upload.init.headers['Content-Type'], /^multipart\/form-data; boundary=/);
    assert.equal(upload.init.headers['x-gladia-key'], 'test-key');
    assert.ok(Buffer.isBuffer(upload.init.body), 'body must be the raw multipart bytes');
    assert.ok(upload.init.body.includes(audio), 'audio bytes must survive intact');
  } finally {
    globalThis.fetch = original;
  }
});

test('transcribeWithAssemblyAI uploads bytes then polls the transcript', async () => {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const href = String(url);
    calls.push({ href, init });

    if (href.endsWith('/upload')) {
      return new Response(JSON.stringify({ upload_url: 'https://cdn.assemblyai.local/1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (href.endsWith('/transcript')) {
      return new Response(JSON.stringify({ id: 'aai-1', status: 'queued' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(
      JSON.stringify({
        id: 'aai-1',
        status: 'completed',
        text: 'Done.',
        language_code: 'en',
        words: [],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };

  try {
    const result = await transcribeWithAssemblyAI(
      { buffer: Buffer.from('audio'), filename: 'clip.wav', contentType: 'audio/wav' },
      { apiKey: 'test-key', baseUrl: 'https://aai.test/v2', pollIntervalMs: 1 },
    );

    assert.equal(result.text, 'Done.');
    assert.equal(result.engine, 'assemblyai');
    assert.deepEqual(
      calls.map((call) => call.href.replace('https://aai.test/v2', '')),
      ['/upload', '/transcript', '/transcript/aai-1'],
    );
    // The Authorization header is the raw key, and no speech_models is sent
    // unless ASSEMBLYAI_MODEL was configured.
    assert.equal(calls[0].init.headers.authorization, 'test-key');
    const jobBody = JSON.parse(calls[1].init.body);
    assert.equal(jobBody.audio_url, 'https://cdn.assemblyai.local/1');
    assert.equal(jobBody.speech_models, undefined);
    assert.equal(jobBody.language_detection, true);
  } finally {
    globalThis.fetch = original;
  }
});

test('transcribeWithAssemblyAI skips the upload when handed a URL', async () => {
  const calls = [];
  let jobBody = null;
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const href = String(url);
    calls.push(href);
    if (href.endsWith('/transcript')) {
      jobBody = JSON.parse(init.body);
      return new Response(JSON.stringify({ id: 'aai-2', status: 'queued' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ id: 'aai-2', status: 'completed', text: 'Hi.' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const result = await transcribeWithAssemblyAI(
      { url: 'https://abc.public.blob.vercel-storage.com/clip.webm' },
      { apiKey: 'k', baseUrl: 'https://aai.test/v2', model: 'universal-3-pro', pollIntervalMs: 1 },
    );

    assert.ok(!calls.some((href) => href.endsWith('/upload')), 'must not re-upload remote audio');
    assert.equal(calls.length, 2, 'create job + poll');
    assert.equal(jobBody.audio_url, 'https://abc.public.blob.vercel-storage.com/clip.webm');
    // An explicitly configured model is forwarded; the lib still exposes it.
    assert.deepEqual(jobBody.speech_models, ['universal-3-pro']);
    assert.equal(result.model, 'universal-3-pro');
  } finally {
    globalThis.fetch = original;
  }
});

/* -------------------------------------------------------------- speechmatics */

test('parseSpeechmaticsTranscript rebuilds text from words and punctuation', () => {
  const result = parseSpeechmaticsTranscript({
    job: { id: 'sm-1', duration: 3.5 },
    metadata: {
      transcription_config: { language: 'en', model: 'enhanced' },
      language_pack_info: { word_delimiter: ' ' },
    },
    results: [
      { type: 'word', start_time: 0, end_time: 0.4, alternatives: [{ content: 'Fourth', confidence: 0.9 }] },
      { type: 'word', start_time: 0.4, end_time: 0.9, alternatives: [{ content: 'engine', confidence: 0.8 }] },
      {
        type: 'punctuation',
        start_time: 0.9,
        end_time: 0.9,
        attaches_to: 'previous',
        alternatives: [{ content: '.', confidence: 1 }],
      },
    ],
  });

  assert.equal(result.text, 'Fourth engine.');
  assert.equal(result.words.length, 2);
  assert.equal(result.words[1].end, 0.9);
  assert.equal(result.language, 'en');
  assert.ok(Math.abs(result.confidence - 0.85) < 0.001);
  assert.equal(result.segments[0].end, 0.9, 'segment timing covers the last word');
});

test('parseSpeechmaticsTranscript honours a punctuation mark attached to the next word', () => {
  const result = parseSpeechmaticsTranscript({
    metadata: { language_pack_info: { word_delimiter: ' ' } },
    results: [
      { type: 'punctuation', attaches_to: 'next', alternatives: [{ content: '"' }] },
      { type: 'word', start_time: 0, end_time: 1, alternatives: [{ content: 'Quoted', confidence: 0.9 }] },
      { type: 'word', start_time: 1, end_time: 2, alternatives: [{ content: 'word', confidence: 0.9 }] },
      { type: 'punctuation', attaches_to: 'previous', alternatives: [{ content: '"' }] },
    ],
  });

  assert.equal(result.text, '"Quoted word"');
});

test('parseSpeechmaticsTranscript respects a language with no word delimiter', () => {
  const result = parseSpeechmaticsTranscript({
    metadata: { language_pack_info: { word_delimiter: '' } },
    results: [
      { type: 'word', start_time: 0, end_time: 1, alternatives: [{ content: 'こんにちは', confidence: 0.9 }] },
      { type: 'word', start_time: 1, end_time: 2, alternatives: [{ content: '世界', confidence: 0.9 }] },
    ],
  });

  assert.equal(result.text, 'こんにちは世界');
});

test('transcribeWithSpeechmatics sends a multipart job and polls it', async () => {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const href = String(url);
    calls.push({ href, init });

    if (href.endsWith('/jobs/')) {
      assert.match(init.headers['Content-Type'], /^multipart\/form-data; boundary=/);
      const body = init.body.toString('utf8');
      assert.match(body, /name="config"/);
      assert.match(body, /"transcription_config"/);
      assert.match(body, /name="data_file"; filename="clip\.wav"/);
      return new Response(JSON.stringify({ id: 'sm-1', status: 'running' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (/\/jobs\/sm-1$/.test(href)) {
      // Speechmatics nests the status under `job`.
      return new Response(JSON.stringify({ job: { id: 'sm-1', status: 'done' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(
      JSON.stringify({
        metadata: { language_pack_info: { word_delimiter: ' ' } },
        results: [
          { type: 'word', start_time: 0, end_time: 0.5, alternatives: [{ content: 'Hello', confidence: 0.9 }] },
        ],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };

  try {
    const result = await transcribeWithSpeechmatics(
      { buffer: Buffer.from('RIFF'), filename: 'clip.wav', contentType: 'audio/wav' },
      { apiKey: 'k', baseUrl: 'https://sm.test/v2', language: 'en', pollIntervalMs: 1 },
    );

    assert.equal(result.text, 'Hello');
    assert.equal(result.engine, 'speechmatics');
    assert.equal(result.model, 'enhanced');
    assert.equal(calls[0].init.headers.Authorization, 'Bearer k');
    assert.match(calls[2].href, /\/jobs\/sm-1\/transcript\?format=json-v2$/);
  } finally {
    globalThis.fetch = original;
  }
});

test('transcribeWithSpeechmatics sends remote URLs through fetch_data and auto-detects Arabic/English', async () => {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const href = String(url);
    calls.push({ href, init });
    if (href.endsWith('/jobs/')) {
      const body = init.body.toString('utf8');
      assert.match(body, /"fetch_data":\{"url":"https:\/\/abc\.public\.blob\.vercel-storage\.com\/clip\.webm"\}/);
      assert.match(body, /"model":"melia-1"/);
      assert.match(body, /"language":"multi"/);
      assert.match(body, /"language_hints":\["ar","en"\]/);
      assert.doesNotMatch(body, /name="data_file"/);
      return new Response(JSON.stringify({ id: 'sm-remote', status: 'running' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (/\/jobs\/sm-remote$/.test(href)) {
      return new Response(JSON.stringify({ job: { id: 'sm-remote', status: 'done' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ results: [{ type: 'word', start_time: 0, end_time: 0.4, alternatives: [{ content: 'أهلاً', confidence: 0.9 }] }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const result = await transcribeWithSpeechmatics(
      { url: 'https://abc.public.blob.vercel-storage.com/clip.webm' },
      { apiKey: 'k', baseUrl: 'https://sm.test/v2', pollIntervalMs: 1 },
    );
    assert.equal(result.text, 'أهلاً');
    assert.equal(result.model, 'melia-1');
    assert.equal(calls.length, 3);
  } finally {
    globalThis.fetch = original;
  }
});

test('summariseSpeechmaticsUsage totals only transcription rows', () => {
  const summary = summariseSpeechmaticsUsage({
    since: '2026-01-01',
    until: '2026-01-31',
    summary: [
      { mode: 'batch', type: 'transcription', language: 'en', operating_point: 'enhanced', count: 4, duration_hrs: 0.25 },
      { mode: 'batch', type: 'transcription', language: 'ar', operating_point: 'enhanced', count: 1, duration_hrs: 0.5 },
      { mode: 'batch', type: 'alignment', language: 'en', count: 9, duration_hrs: 9 },
    ],
  });

  assert.equal(summary.jobs, 5);
  assert.equal(summary.hours, 0.75);
  assert.equal(summary.breakdown.length, 2);
  assert.equal(summary.breakdown[1].language, 'ar');
  assert.equal(summary.since, '2026-01-01');
});

test('normaliseAudioSource tells bytes and urls apart', () => {
  const fromBytes = normaliseAudioSource(
    { buffer: Buffer.from('x'), contentType: 'audio/wav', filename: 'a.wav' },
    'deepgram',
  );
  assert.equal(fromBytes.mode, 'buffer');

  const fromUrl = normaliseAudioSource({ url: 'https://abc.public.blob.vercel-storage.com/x' }, 'deepgram');
  assert.equal(fromUrl.mode, 'url');
});

test('every engine refuses a source with neither bytes nor a URL', async () => {
  for (const [label, call] of [
    ['assemblyai', () => transcribeWithAssemblyAI({}, { apiKey: 'k' })],
    ['speechmatics', () => transcribeWithSpeechmatics({}, { apiKey: 'k' })],
  ]) {
    await assert.rejects(call, { code: 'BAD_REQUEST' }, `${label} should reject an empty source`);
  }
});
