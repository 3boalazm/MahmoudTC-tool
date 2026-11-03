# User flows and state transitions

## File to editable transcript

Entry from home or direct studio navigation → choose file → type/size checks → browser decode/waveform where possible → choose runtime-available engine and language/speakers → submit. Inline input travels with the request; an oversized local file may first upload directly to Blob if enabled. A link instead sends a URL for server download. On success the studio stores the normalized result and creates displayed text from segments; it scrolls to the output, refreshes usage, and enables exports.

Recovery: invalid file should explain supported formats; above-limit input should explain the actual enabled path. Decode failure and provider rejection are different events. Source supports those states but their complete browser journey was not executed in this audit.

## Microphone

Choose record → request permission → capture with MediaRecorder and live levels → pause/resume if needed → stop → create a local recording → preview → use the same submit flow. Test denied permission, no device, unsupported format, stop during pause and route unmount. A waveform is not evidence of successful speech recognition. Recording does not imply live provider streaming.

## Link

Paste direct audio/video URL → validate syntax → create a source description → submit → server resolves/validates addresses and redirects, downloads bounded bytes, then passes audio to an adapter. A normal web page such as YouTube is not a supported media file. Timeout/size/SSRF errors should remain distinguishable from speech-provider errors. Private-host test overrides must never be enabled for production.

## Planning and fallback

Auto uses the configured order filtered by effective credentials. The default is AssemblyAI → Deepgram → Gladia → Speechmatics. A pinned engine runs first and, when fallback is allowed, the remaining chain follows. Nonretryable failures stop; retryable errors and configured empty-transcript fallback may continue. No real provider outage was induced. A sequence of four adapters does not guarantee four successful attempts within the deployment deadline.

## Output and edits

Success → review engine/model/attempt history → edit text → copy or TXT. SRT uses timed provider segments, not the free-text textarea. Renaming/merging speakers changes structured output; text reformatting options can regenerate text and need explicit dirty-edit protection. Before clear/new run, users need a reliable understanding of whether edits will be lost. The implementation does not establish a durable transcript history.

## Settings and interrupted work

Open settings → read masked sources/status → save and test a visitor key, test existing connection, disable deployment default locally, enable it again, or disconnect. Tests call provider verification and were not performed on production. “Connected” means key presence in the status model, not a proven working account. Disabled entries shadow environment/default credentials for that browser only.

Canceling the browser request changes UI state but is not proof that a queued vendor job or Blob object was canceled/deleted. Test cancel during upload, during vendor polling, and just before response. Diagrams 02 and 07 separate the happy path from resource lifecycles to avoid treating UI completion as a retention guarantee.

## Source evidence

- [hooks/useAudioSource.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/hooks/useAudioSource.js#L1-L25)
- [hooks/useRecorder.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/hooks/useRecorder.js#L1-L25)
- [components/TranscriptionStudio.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/components/TranscriptionStudio.js#L1-L25)
- [app/api/transcribe/route.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/app/api/transcribe/route.js#L1-L25)
- [lib/server/credentials.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/lib/server/credentials.js#L1-L25)
