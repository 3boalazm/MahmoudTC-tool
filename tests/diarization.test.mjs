import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDeepgramQuery,
  parseAssemblyAITranscript,
  parseDeepgramResponse,
  parseGladiaResult,
  parseSpeechmaticsTranscript,
} from '../lib/engines.js';

test('Deepgram requests the current speaker diarization model by default', () => {
  const query = new URLSearchParams(buildDeepgramQuery({ language: 'en' }));
  assert.equal(query.get('diarize_model'), 'latest');
  assert.equal(query.has('diarize'), false);
});

test('Deepgram can disable diarization for a single-speaker recording', () => {
  const query = new URLSearchParams(buildDeepgramQuery({ language: 'en', diarization: false }));
  assert.equal(query.get('diarize'), 'false');
  assert.equal(query.has('diarize_model'), false);
});

test('Deepgram preserves locale casing for Egyptian Arabic', () => {
  const query = new URLSearchParams(buildDeepgramQuery({ language: 'ar-EG' }));
  assert.equal(query.get('language'), 'ar-EG');
  assert.equal(query.get('detect_language'), null);
});

test('Deepgram parser groups consecutive words by speaker', () => {
  const parsed = parseDeepgramResponse({
    results: {
      channels: [{
        alternatives: [{
          transcript: 'Hi, there. Yes.',
          words: [
            { word: 'Hi', punctuated_word: 'Hi,', start: 0, end: 0.3, speaker: 0 },
            { word: 'there', punctuated_word: 'there.', start: 0.4, end: 0.8, speaker: 0 },
            { word: 'Yes', punctuated_word: 'Yes.', start: 1, end: 1.4, speaker: 1 },
          ],
        }],
      }],
    },
    metadata: { duration: 1.5 },
  });

  assert.deepEqual(parsed.segments.map(({ text, speaker }) => ({ text, speaker })), [
    { text: 'Hi, there.', speaker: 0 },
    { text: 'Yes.', speaker: 1 },
  ]);
});

test('AssemblyAI utterances retain speaker IDs', () => {
  const parsed = parseAssemblyAITranscript({
    text: 'Hello. Good morning.',
    utterances: [
      { text: 'Hello.', start: 0, end: 700, speaker: 'A' },
      { text: 'Good morning.', start: 800, end: 1500, speaker: 'B' },
    ],
  });

  assert.deepEqual(parsed.segments.map(({ speaker }) => speaker), ['A', 'B']);
  assert.equal(parsed.segments[1].start, 0.8);
});

test('Gladia utterances retain speaker IDs', () => {
  const parsed = parseGladiaResult({
    result: {
      transcription: {
        full_transcript: 'Hi. Hello.',
        utterances: [
          { text: 'Hi.', start: 0, end: 0.5, speaker: 0 },
          { text: 'Hello.', start: 0.6, end: 1.1, speaker: 1 },
        ],
      },
    },
  });

  assert.deepEqual(parsed.segments.map(({ speaker }) => speaker), [0, 1]);
});

test('Speechmatics parser splits segments when the speaker changes', () => {
  const parsed = parseSpeechmaticsTranscript({
    metadata: { language_pack_info: { word_delimiter: ' ' }, transcription_config: { language: 'en' } },
    results: [
      { type: 'word', start_time: 0, end_time: 0.3, speaker: 'S1', alternatives: [{ content: 'Hi' }] },
      { type: 'punctuation', is_eos: true, alternatives: [{ content: '.' }] },
      { type: 'word', start_time: 0.5, end_time: 0.9, speaker: 'S2', alternatives: [{ content: 'Hello' }] },
      { type: 'punctuation', is_eos: true, alternatives: [{ content: '.' }] },
    ],
    job: { duration: 1 },
  });

  assert.deepEqual(parsed.segments.map(({ text, speaker }) => ({ text, speaker })), [
    { text: 'Hi.', speaker: 'S1' },
    { text: 'Hello.', speaker: 'S2' },
  ]);
});
