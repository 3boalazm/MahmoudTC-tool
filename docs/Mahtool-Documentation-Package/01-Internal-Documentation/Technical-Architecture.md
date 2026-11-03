# Technical architecture

## Stack and rendering boundaries

The package declares Next.js 16, React 19, Tailwind 4, Vercel Blob and Vercel Analytics; exact installed/locked versions are recorded in the evidence inventory. JavaScript App Router pages share a server root layout. Locale/theme cookies determine initial lang/dir and preference; client providers handle updates. Client components orchestrate the interactive workspace while Node runtime API routes own provider work and credential resolution.

## Responsibility map

| Boundary | Main modules | Responsibility |
| --- | --- | --- |
| Shared shell | app/layout.js; layout/providers components | Metadata, navigation, locale/theme, analytics, SW registration |
| Acquisition | useAudioSource/useRecorder, AudioSourceCard/Waveform | File/link state, decode/preview, recording, object lifetimes |
| Task orchestration | TranscriptionStudio | Runtime health, input/config state, submit, timing, cancellation, result |
| Browser network | lib/client/api.js | Same-origin JSON/multipart calls and Blob SDK integration |
| Request orchestration | api/transcribe | Validation, credentials, rate guard, plan, attempts, normalized response |
| Provider adapters | lib/engines.js | Request/upload/job/poll protocols and normalized errors/results |
| Configuration/security | server/config, credentials, blob, fetch-media, URL guards | Limits, effective keys, URL/address safety and cleanup |
| Usage | server/usage; api/usage | Process counters, provider reports/cache and account context |
| PWA | manifest, public/sw.js, install/registrar | Shell/static caching; API exclusions; offline fallback |

## Data and deployment

There is no application database in the inspected flow. That does not mean no persistence: settings keys reside in an httpOnly device cookie, preferences use cookies, the service worker caches interface resources, vendor jobs exist outside the app, and optional public Blob objects buffer large input. Local usage Maps reset with the process and are per-instance. Browser transcript state is not an account history.

Vercel is detected from environment names; source defaults are 4 MB inline, 4.5 MB platform ceiling and an optional 300 MB Blob ceiling. Non-Vercel inline defaults to 25 MB. Link download defaults to 50 MB on Vercel and 100 MB locally. Each provider operation is clamped to an 85s Vercel / 120s local budget, while route maxDuration is 90s. This is not a shared remaining-time deadline across download, upload, polling and fallback; cumulative work may exceed the route budget.

## Error and trust boundaries

Malformed/unsupported/oversize input should fail before spending provider credit. Cookie credentials and user URLs are untrusted input. Media-link fetching validates the actual connected address and handles redirects; it is more than a hostname string check. Blob URL validation matches a vendor URL pattern but does not establish project/uploader ownership. Cross-site browser request filtering is not authentication against direct clients. Process rate limiting is a courtesy guard, not a distributed cost boundary.

## Architecture evolution, not applied

Introduce authenticated entitlements, distributed quotas and a single deadline/abort context. Track staged objects with user/request identity and TTL cleanup. Separate operator diagnostics from public UI, explicitly model credential source and update public limits/order from runtime metadata. Avoid a refactor of adapters while critical operational controls remain undefined. Diagrams 04–07 document current relationships and failure boundaries, not an already-hardened target system.

## Source evidence

- [app/layout.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/app/layout.js#L1-L25)
- [lib/client/api.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/lib/client/api.js#L1-L25)
- [lib/engines.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/lib/engines.js#L1-L25)
- [lib/server/config.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/lib/server/config.js#L1-L25)
- [lib/server/fetch-media.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/lib/server/fetch-media.js#L1-L25)
- [lib/url-guard.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/lib/url-guard.js#L1-L25)
- [public/sw.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/public/sw.js#L1-L25)
