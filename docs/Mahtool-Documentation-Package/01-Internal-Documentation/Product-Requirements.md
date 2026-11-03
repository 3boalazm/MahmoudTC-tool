# Product requirements and acceptance matrix

## Status language

“Implemented” means visible in source, not accepted in production. “Pending” means the acceptance scenario has not been run here. Priorities below are analyst recommendations; they are not an approved historical roadmap.

| ID / priority | Requirement | Existing implementation | Acceptance scenario and status |
| --- | --- | --- | --- |
| PR01 / must | Load supported local audio/video | AudioSourceCard and useAudioSource | Synthetic small WAV accepted; corrupt/oversize rejected with next step — browser pending |
| PR02 / must | Record from a microphone | useRecorder + source card | Allow/deny permission, pause/resume/stop, release hardware — pending |
| PR03 / should | Import direct media URL | fetchRemoteMedia with address/redirect checks | Public fixture accepted; private hosts rejected at connected address — unit coverage exists, full UI pending |
| PR04 / must | Respect runtime upload ceilings | Health payload, inline and Blob gates | Verify actual deployment inline/storage limits and preflight messaging — pending |
| PR05 / must | Choose automatic or pinned engine | Plan filters available credentials | Mock primary 429 then fallback success; pinned/no-fallback behavior — HTTP e2e pending |
| PR06 / must | Return meaningful failure | Structured codes and attempts | Bad audio stops, exhausted chain names attempts, retry retains source — e2e/UI pending |
| PR07 / should | Language and speaker control | Language normalization, diarization boolean | ar-EG maps to generic ar outside Deepgram; single strips labels — source/unit evidence |
| PR08 / must | Edit, copy and export | Editable text, TXT and segment-backed SRT | Text edits reflected in TXT; SRT divergence disclosed — integration pending |
| PR09 / must | Manage keys without echoing values | Masked status; httpOnly device cookie | Save fake key to mock only; disable, enable and delete semantics — full UI pending |
| PR10 / should | Accessible bilingual themes | Locale/theme cookies, direction, tokens | Keyboard, screen reader, Arabic overflow and contrast matrix — pending |
| PR11 / could | Install and reopen offline shell | Manifest/service worker/install controls | Installed cold navigation offline, APIs never cached — device testing pending |
| PR12 / must | Secure public operating model | Only local rate guard and optional usage disable today | Auth, distributed quotas, rotation and cleanup proof — not fulfilled |

## Non-functional requirements

Use a single end-to-end deadline with cleanup headroom; do not multiply per-engine timeout budgets. Treat provider/account usage as restricted business data. Keep API keys out of committed defaults and logs, and make device storage consent explicit. Retention needs provider-specific statements rather than universal deletion claims. Enforce ownership for staged objects independently of vendor host matching.

## Out of scope for current implementation

No evidence of account authentication, collaborative transcript history, persistent project database, subtitle alignment editor, YouTube extraction, live streaming recognition, accuracy guarantee or offline speech model. These must not be implied by “production-ready” labels in package metadata.

## Release acceptance gate

Rotate/remove source defaults, decide public-access cost policy, restrict account usage, close request/Blob lifecycle risks, repair lint and deterministic test expectations, obtain a successful build, then run mocked HTTP scenarios plus desktop/mobile/RTL accessibility tasks. This documentation changes none of those controls; findings are recommendations, not fixes applied.

## Source evidence

- [app/api/transcribe/route.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/app/api/transcribe/route.js#L1-L25)
- [app/api/blob/upload/route.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/app/api/blob/upload/route.js#L1-L25)
- [components/TranscriptionStudio.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/components/TranscriptionStudio.js#L1-L25)
- [hooks/useRecorder.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/hooks/useRecorder.js#L1-L25)
- [tests/e2e.mjs:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/tests/e2e.mjs#L1-L25)
