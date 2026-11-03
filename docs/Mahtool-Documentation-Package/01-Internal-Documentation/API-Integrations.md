# API contracts and external integrations

## Same-origin API surface

| Method / route | Input | Output / side effects |
| --- | --- | --- |
| GET /api/health | Visitor cookie context | Masked availability, configured order, limits, features, Blob capability, runtime facts; not proof provider keys work |
| POST /api/transcribe | Multipart audio or supported JSON URL source; engine, fallback, language, speakerMode, durationSeconds | Normalized text/words/segments plus attempts; provider work, local usage increments, best-effort Blob release |
| GET /api/credentials | Cookie and deployment context | Full masked engine status and source interpretation |
| POST /api/credentials | engine, optional key, action save/test/disable/enable | Shape validation, provider verification where applicable, optional cookie rewrite |
| DELETE /api/credentials | engine or all query selector | Clear visitor state; cannot delete operator environment values |
| GET /api/usage | Visitor/deployment effective keys | Local and supported provider account report; gated by ENABLE_USAGE_PANEL, not user authentication |
| POST /api/blob/upload | Blob SDK upload event JSON | Short-lived public-upload authorization under enabled/size/type/rate gates; callback logging |

## Recognition request behavior

Sources are bytes, a validated staged audioUrl, or a mediaUrl to download. The route validates MIME/extension/size, normalizes the requested engine, derives a plan from available effective keys, and uses one common adapter contract. Language auto becomes an empty hint; ar-EG remains Deepgram-specific and maps to ar for other providers. Speaker single disables diarization and strips returned labels; auto/multiple request it, rather than invoking two distinct inference algorithms.

A success response includes ok, text, engine/model/language/confidence/duration where available, audioSeconds, requestId, elapsedMs, fallbackUsed, words, segments, speakerMode, attempts and warnings. Missing provider fields stay nullable/empty rather than being invented. Attempt detail is removed from the success payload. Errors use stable codes and a user-oriented message; source logging/redaction must be assessed separately from that response policy.

## Provider adapter differences

| Engine | Mode | Configuration / caveat |
| --- | --- | --- |
| Deepgram | Prerecorded recognition; bytes or remote URL | Default model nova-3; language hints including Egyptian Arabic; management usage needs scope |
| Gladia | Upload/create asynchronous job/poll | Poll and request limits are separate operations; local usage only in this app's metadata |
| AssemblyAI | Upload/transcript job/poll | Model override optional; metadata says Universal, account default is used if unpinned |
| Speechmatics | Batch job/poll | Default enhanced; regional host/key must match; metadata offers usage hours, not remaining plan quota |

Adapters normalize authentication, payment/rate/server/network/timeout/empty and client-input failures. Only retryable conditions continue the plan; an error table describing codes does not mean every row is retried. Empty fallback is separately configurable. A pinned engine with fallback disabled should not silently select another. “Auto” follows runtime order, not static marketing card order.

## Credentials and retention

Per-engine disabled state shadows other keys; personal cookie key otherwise outranks environment then source default. Cookie uses httpOnly, sameSite=lax, production secure, path=/ and 180-day age. JSON transport escaping is not encryption; device storage contradicts a literal “keys never reach the browser” claim. HttpOnly limits script access but does not provide general XSS immunity. Verification calls were not triggered on production.

Blob upload uses public access and a 30-minute authorization validity in source. Type/extension/size gating and randomized names do not establish ownership or guaranteed deletion. Provider retention and job cancellation cannot be inferred from local buffer deletion. Staged source release happens on ordinary terminal paths, but early returns and abandoned uploads need independent lifecycle cleanup.

## Operational contract

Use environment names from the evidence inventory, never copy values. Keep test-only private-host overrides off in production. Base URL overrides support mocks/self-hosted gateways but need operator trust. No real provider calls, Blob transfers, production credential writes or mutations were submitted during this engagement. Mocked HTTP e2e was not run because the production build was blocked by font download access.

## Source evidence

- [app/api/health/route.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/app/api/health/route.js#L1-L25)
- [app/api/transcribe/route.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/app/api/transcribe/route.js#L1-L25)
- [app/api/credentials/route.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/app/api/credentials/route.js#L1-L25)
- [app/api/usage/route.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/app/api/usage/route.js#L1-L25)
- [app/api/blob/upload/route.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/app/api/blob/upload/route.js#L1-L25)
- [lib/server/credentials.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/lib/server/credentials.js#L1-L25)
- [lib/engines.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/lib/engines.js#L1-L25)
