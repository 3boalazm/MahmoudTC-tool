import assert from 'node:assert/strict';
import test from 'node:test';

import { formatTranscriptSegments } from '../lib/client/format.js';

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
