import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSrt, formatTranscriptSegments } from '../lib/client/format.js';

const segments = [
  { text: 'Good morning.', start: 0, end: 1.4, speaker: 'A' },
  { text: 'How are you?', start: 1.5, end: 2.8, speaker: 'A' },
  { text: 'I am fine.', start: 3, end: 4.2, speaker: 'B' },
];

test('formats chunks with speaker labels and real timeline ranges', () => {
  const output = formatTranscriptSegments(segments, '', {
    showSpeakers: true,
    showTimeline: true,
    speakerLabel: (number) => `Speaker ${number}`,
  });

  assert.match(output, /\[00:00–00:02\]/);
  assert.match(output, /Speaker 1/);
  assert.match(output, /Good morning\. How are you\?/);
  assert.match(output, /Speaker 2/);
  assert.match(output, /\[00:03–00:04\]/);
});

test('custom speaker names appear in the transcript and SRT export', () => {
  const speakerLabel = (number) => ({ 1: 'Ahmed', 2: 'Mona' })[number];
  const output = formatTranscriptSegments(segments, '', {
    showSpeakers: true,
    showTimeline: true,
    speakerLabel,
  });

  assert.match(output, /Ahmed/);
  assert.match(output, /Mona/);
  assert.doesNotMatch(output, /Speaker 1|Speaker 2/);

  const srt = buildSrt(segments, { showSpeakers: true, speakerLabel });
  assert.match(srt, /Ahmed: Good morning\./);
  assert.match(srt, /Mona: I am fine\./);
});

test('speaker labels and timeline can be independently hidden', () => {
  const output = formatTranscriptSegments(segments, '', {
    showSpeakers: false,
    showTimeline: false,
  });

  assert.doesNotMatch(output, /Speaker/);
  assert.doesNotMatch(output, /\[00:/);
  assert.match(output, /Good morning\. How are you\?/);
  assert.match(output, /I am fine\./);
});

test('fallback text is grouped in pairs of sentences without fabricated timestamps', () => {
  const output = formatTranscriptSegments([], 'One. Two! Three?', {
    showSpeakers: true,
    showTimeline: true,
  });

  assert.equal(output, 'One. Two!\n\nThree?');
  assert.doesNotMatch(output, /\[00:/);
});

test('does not create speaker labels or timeline for unavailable metadata', () => {
  const output = formatTranscriptSegments([{ text: 'No timing available.' }], '', {
    showSpeakers: true,
    showTimeline: true,
  });

  assert.equal(output, 'No timing available.');
});

test('speaker labels can be disabled in SRT while timing remains intact', () => {
  const output = buildSrt(segments, { showSpeakers: false });
  assert.ok(output);
  assert.match(output, /00:00:00,000 --> 00:00:01,400/);
  assert.doesNotMatch(output, /Speaker 1/);
});
