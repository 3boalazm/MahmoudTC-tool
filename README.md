# Speech to Text Studio

A production-ready speech-to-text web app: upload a file or record live in the
browser, and get clean, editable, exportable text.

Two best-in-class engines sit behind **one** API route. Deepgram (Nova-2) does
the work; if it hits a rate limit, runs out of credit, or falls over, **Gladia
takes over automatically** and the user sees nothing but a finished transcript.

API keys never reach the browser — every request is proxied through a Next.js
route handler.

```
Browser ──► /api/transcribe ──► Deepgram Nova-2   (primary)
                   │                    │ fails with 429 / 402 / 401 / 5xx / timeout / empty
                   └────────────► Gladia Solaria  (automatic fallback)
```

---

## Contents

- [Features](#features)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [How the fallback works](#how-the-fallback-works)
- [Deploying to Vercel](#deploying-to-vercel) ← **read this one**
- [API reference](#api-reference)
- [Architecture](#architecture)
- [Testing](#testing)
- [Security notes](#security-notes)
- [Troubleshooting](#troubleshooting)

---

## Features

**Front end**

- Modern dark studio UI: hero, guided three-step flow, engine comparison, FAQ.
- **File upload** — drag & drop or browse. MP3, WAV, M4A, MP4, WebM, OGG, Opus,
  FLAC, AAC, AMR, AIFF, 3GP, MOV, MKV.
- **Live recording** — `MediaRecorder` with start / pause / resume / stop, a
  wall-clock timer, and a real-time input level meter.
- Real waveform peaks decoded in-browser, plus duration and size readouts.
- Engine picker (Automatic / Deepgram / Gladia), automatic-fallback switch, and
  a 21-language hint dropdown. Unconfigured engines are greyed out honestly.
- Live status: staged progress messages, per-second elapsed counter, cancel.
- Editable transcript with word / character / sentence counts, estimated reading
  time, confidence, and detected language.
- One-click **Copy**, plus `.txt` and `.srt` (Word/Gladia timings) downloads.
- Keyboard support: `⌘/Ctrl + Enter` to transcribe, `Esc` to cancel, arrow keys
  to move between engines, full focus-visible states, ARIA live regions.
- Zero layout shift, `prefers-reduced-motion` respected, mobile-first responsive.

**Back end**

- `POST /api/transcribe` — validates, rate-limits, tries the primary engine,
  falls back on failure, normalises both providers into one JSON shape.
- `GET /api/health` — reports which credentials exist (never their values) so
  the UI can adapt.
- `POST /api/blob/upload` — mints short-lived Vercel Blob tokens so files larger
  than the serverless body limit can bypass the function entirely.
- Automatic timeouts, SSRF-safe URL validation, credential redaction.

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.local.example .env.local
#    …then paste your keys into .env.local

# 3. Run
npm run dev          # http://localhost:3000
```

Get keys here:

| Engine | Sign up | Notes |
| --- | --- | --- |
| **Deepgram** | <https://console.deepgram.com/signup> | Free credit on signup. Primary engine. |
| **Gladia** | <https://app.gladia.io/> | Free tier available. Fallback engine. |

You need **at least one** key to transcribe; both is recommended.

Other scripts:

```bash
npm run build     # production build
npm start         # serve the production build
npm run lint      # ESLint (Next.js core-web-vitals)
npm test          # unit tests (node:test, no network)
npm run test:e2e  # end-to-end tests against mock providers
```

---

## Environment variables

Copy `.env.local.example` → `.env.local`. Only the first two are required.

### Required (at least one)

| Variable | Description |
| --- | --- |
| `DEEPGRAM_API_KEY` | Deepgram key. Aliases: `DEEPGRAM_KEY`, `DG_API_KEY`. |
| `GLADIA_API_KEY` | Gladia key. Alias: `GLADIA_KEY`. |

### Large uploads (strongly recommended on Vercel)

| Variable | Default | Description |
| --- | --- | --- |
| `BLOB_READ_WRITE_TOKEN` | — | Injected by a connected Vercel Blob store. Enables files larger than the serverless body limit. |
| `BLOB_MAX_UPLOAD_MB` | `200` | Ceiling for a single browser → Blob upload. |
| `BLOB_DELETE_AFTER_USE` | `true` | Delete the object as soon as transcription finishes. |
| `ALLOW_BLOB_UPLOAD` | `true` | Set to `false` to disable the large-file path entirely. |

### Tuning (all optional, all with safe defaults)

| Variable | Default | Description |
| --- | --- | --- |
| `DEEPGRAM_MODEL` | `nova-2` | e.g. `nova-3` for broader language coverage. |
| `MAX_UPLOAD_MB` | `4` on Vercel, `25` elsewhere | Ceiling for audio streamed *through* the API route. |
| `FUNCTION_BUDGET_MS` | `55000` on Vercel, `120000` elsewhere | Wall-clock budget for provider work inside one invocation. Provider timeouts are clamped to fit. |
| `DEEPGRAM_TIMEOUT_MS` | `120000` | Per-request abort timeout. |
| `GLADIA_TIMEOUT_MS` | `120000` | Per-request abort timeout. |
| `GLADIA_POLL_TIMEOUT_MS` | `120000` | How long to poll a Gladia job before giving up. |
| `GLADIA_POLL_INTERVAL_MS` | `1500` on Vercel, `2000` elsewhere | Poll interval. |
| `DEEPGRAM_BASE_URL` / `GLADIA_BASE_URL` | public APIs | Point at a gateway or a mock. |
| `RATE_LIMIT_MAX` | `20` | Requests per window, per client IP. |
| `RATE_LIMIT_WINDOW_SEC` | `60` | Window length. |
| `FALLBACK_ON_EMPTY_TRANSCRIPT` | `true` | Treat a silent transcript as retryable. |
| `ALLOW_CLIENT_FALLBACK_OPTION` | `true` | Set `false` to force fallback on and hide the UI switch. |

---

## How the fallback works

Failures are **classified**, not swallowed. Each provider error maps to a code,
and only codes that mean "this provider is out of action" trigger a hand-off.

### Fallback triggers (the primary engine's failure is retried on the other)

| Trigger | Code | Why it is retryable |
| --- | --- | --- |
| `429` rate limit / too many concurrent requests | `RATE_LIMITED` | Transient capacity issue, not a problem with the audio. |
| `402` payment required / out of credit | `PAYMENT_REQUIRED` | This account cannot pay; the other engine can still work. |
| `401` / `403` auth failure | `AUTH` | A broken key should not take the whole app down. |
| `5xx` provider failure | `SERVER_ERROR` | Provider-side incident. |
| `408` / `504` timeout | `TIMEOUT` | Falling back usually beats making the user wait. |
| Network / DNS / connection reset | `NETWORK` | Transport-level failure. |
| Empty transcript from a successful request | `EMPTY_TRANSCRIPT` | Silence to one model is often speech to another. |

### Deliberately **not** retried

| Trigger | Code | Why |
| --- | --- | --- |
| `400` malformed audio / unsupported container | `BAD_REQUEST` | The second engine would reject it identically. Fail fast with a clear message. |
| Request too large / wrong MIME type | `BAD_REQUEST` | A client-side problem. |
| A credential missing for the *first* engine | `MISSING_KEY` | Non-retryable for that engine, but the plan still runs the other one. |

### What the client sees

Every response — success or failure — has one shape, so the UI never guesses:

```jsonc
// 200 OK
{
  "ok": true,
  "text": "…transcript…",
  "engine": "gladia",          // which engine actually produced this
  "model": "solaria-1",
  "language": "en",
  "confidence": 0.97,
  "durationSeconds": 12.4,
  "audioSeconds": 12,
  "fallbackUsed": true,
  "warnings": ["The primary engine was unavailable (RATE_LIMITED), …"],
  "words": [{ "word": "Hello", "start": 0, "end": 0.4, "confidence": 0.99 }],
  "segments": [{ "text": "Hello.", "start": 0, "end": 1.2 }],
  "attempts": [
    { "engine": "deepgram", "ok": false, "code": "RATE_LIMITED", "reason": "…" },
    { "engine": "gladia",   "ok": true,  "model": "solaria-1" }
  ]
}
```

```jsonc
// 502 Bad Gateway (both engines failed)
{
  "error": {
    "code": "SERVER_ERROR",
    "message": "Both transcription engines failed (deepgram and gladia). …",
    "attempts": [
      { "engine": "deepgram", "ok": false, "code": "PAYMENT_REQUIRED", "retryable": true },
      { "engine": "gladia",   "ok": false, "code": "SERVER_ERROR",     "retryable": true }
    ]
  }
}
```

Raw provider messages are logged server-side and are only echoed to the client
when `NODE_ENV !== 'production'`, so production users never see provider noise
(and never see anything that smells like a credential).

---

## Deploying to Vercel

The app runs on Vercel out of the box, but Vercel adds two hard platform limits
that a naive STT app walks straight into. Both are handled for you.

### Limit 1 — request bodies are capped at 4.5 MB

A serverless function rejects any request body above **4.5 MB** at the edge,
*before your code runs*. A 3-minute MP3 is already bigger than that, so the
browser→function→provider path can never work for real audio.

**The fix, already implemented:** when a Blob store is connected, the browser
uploads anything above `MAX_UPLOAD_MB` **directly to Vercel Blob** (bytes never
touch a function), and the route hands Deepgram/Gladia the resulting URL — both
providers accept remote audio. The object is deleted the moment transcription
finishes, so audio is stored transiently, never as data.

### Limit 2 — functions have a maximum duration

Every plan caps function runtime (60 s on Hobby, up to 300 s on Pro), and a very
long recording can outlive it.

**The fix, already implemented:** `lib/server/config.js` derives a single
wall-clock budget (`FUNCTION_BUDGET_MS`, default 55 s on Vercel) and clamps
*every* provider timeout — including Gladia's polling loop — to fit inside it.
The route therefore always has time left to return real JSON instead of being
killed mid-request. For long audio, Gladia's async job flow is used rather than
holding a socket open.

### Step-by-step

1. **Push the repo** and import it at <https://vercel.com/new>. Framework preset:
   **Next.js** — no build tweaks needed.

2. **Add your secrets** in *Project → Settings → Environment Variables*:

   ```
   DEEPGRAM_API_KEY = dg_…
   GLADIA_API_KEY   = …
   ```

   Set them for **Production**, **Preview** and **Development** so preview
   deployments behave like production.

3. **Connect a Blob store** for large files — *Project → Storage → Create →
   Blob*. Tick **Production**, **Preview** *and* **Development**, then create
   the store. This injects `BLOB_READ_WRITE_TOKEN` automatically.

   For local development, pull it into `.env.local`:

   ```bash
   npm i -g vercel
   vercel link
   vercel env pull .env.local
   ```

   > If `BLOB_READ_WRITE_TOKEN` is absent, the app still works — it just caps
   > uploads at 4 MB and says so, in the UI and in the API error message. Nothing
   > breaks silently.

4. **Deploy.** Then sanity-check the deployment:

   ```bash
   curl https://your-app.vercel.app/api/health | jq
   ```

   You should see both engines `available: true` and, when the Blob store is
   connected, `largeUploads.enabled: true`.

### Upload ceilings you should expect

| Deployment | Inline through the function | Via Vercel Blob |
| --- | --- | --- |
| Local / self-hosted | 25 MB (raise with `MAX_UPLOAD_MB`) | not needed |
| Vercel, no Blob store | **4 MB** | unavailable |
| Vercel + Blob store | 4 MB | **200 MB** (`BLOB_MAX_UPLOAD_MB`) |

The UI reads all of this from `/api/health` and states the real limits in place,
rather than advertising a number the platform would refuse.

### Running on a Pro plan

To finish very long recordings, raise **both** for a 300 s ceiling:

```js
// app/api/transcribe/route.js
export const maxDuration = 300;
```

```bash
FUNCTION_BUDGET_MS=285000
```

`lib/server/config.js` holds a matching constant with a comment pointing back
here — keep the two in sync.

### Other hosts

Vercel-specific features are all optional and auto-detected:

- **Netlify / Railway / Fly / a VPS** — everything works; Blob mode simply stays
  off and the inline limit applies. Set `MAX_UPLOAD_MB` to whatever the host
  allows.
- **Docker / Node** — `npm run build && npm start`. No platform limits at all.

---

## API reference

### `POST /api/transcribe`

`multipart/form-data` (standard) or `application/json` (remote audio).

| Field | Type | Description |
| --- | --- | --- |
| `audio` | file | The clip. Required in multipart mode. |
| `audioUrl` | string | Vercel Blob URL. Required in JSON mode; mutually exclusive with `audio`. |
| `filename` | string | Optional, improves provider hints. |
| `engine` | `auto` \| `deepgram` \| `gladia` | Default `auto` (Deepgram first). |
| `fallback` | `true` \| `false` | Default `true`. When `false` and an engine is pinned, only that engine runs. |
| `language` | ISO-639-1 | `en`, `ar`, `es`, … Omit or `auto` for auto-detection. |
| `durationSeconds` | number | Optional, used for accurate audio-length reporting. |

Status codes: `200` success · `400` bad request · `402` out of credit ·
`413` too large · `415` unsupported format · `429` rate limited ·
`502` both engines failed · `503` no engine configured · `504` timeout.

**Examples**

```bash
# Upload a file
curl -X POST http://localhost:3000/api/transcribe \
  -F "audio=@interview.m4a" -F "engine=auto" -F "fallback=true" | jq

# Remote audio (what the studio sends for large files)
curl -X POST http://localhost:3000/api/transcribe \
  -H 'content-type: application/json' \
  -d '{"audioUrl":"https://xxxx.public.blob.vercel-storage.com/clip.webm","engine":"gladia"}' | jq
```

> Only URLs inside **this project's own** Vercel Blob store are accepted.
> Arbitrary URLs are rejected with a `400`, because the provider would otherwise
> fetch whatever we forwarded — turning the route into an SSRF proxy into
> internal networks and cloud metadata endpoints.

### `GET /api/health`

Reports capability, never secrets. Used by the UI to grey out engines without
keys, show the real upload ceiling, and explain the deployment's limits.

### `POST /api/blob/upload`

Mints short-lived Vercel Blob client tokens (the token exchange used by direct
browser uploads). Returns `503` when no Blob store is connected. Guarded by the
same rate limit as transcription, restricted to audio/video MIME types and the
audio extensions, with a hard size ceiling baked into the token.

---

## Architecture

```
app/
  layout.js                     Fonts, metadata, skip link
  page.js                       Landing page: hero, studio, comparison, FAQ
  globals.css                   Tailwind v4 @theme design tokens + keyframes
  icon.svg                      Favicon
  api/
    transcribe/route.js         ⭐ Proxy + smart fallback orchestration
    blob/upload/route.js        Vercel Blob token exchange (large uploads)
    health/route.js             Capability probe for the UI

components/
  TranscriptionStudio.js        Client orchestrator; owns the request lifecycle
  AudioSourceCard.js            Upload / record tabs, drop zone, timer, meters
  EngineControls.js             Engine radio group, fallback switch, language
  TranscriptPanel.js            Status, stats, editable output, copy/export
  Waveform.js                   Static waveform + live level meter
  Icons.js                      Inline SVG icon set (no icon dependency)

hooks/
  useRecorder.js                MediaRecorder: permissions, codecs, pause, meter
  useAudioSource.js             Object URLs, peak decoding, duration recovery

lib/
  engines.js                    ⭐ Deepgram + Gladia adapters, error taxonomy
  url-guard.js                  SSRF-safe URL validation
  client/api.js                 fetch client + Blob direct upload
  client/format.js              Formatting, SRT/TXT builders, clipboard
  server/config.js              Env parsing + serverless-aware defaults
  server/blob.js                Blob capability + cleanup
  server/rate-limit.js          In-process fixed-window limiter
  server/http.js                Response shapes + credential redaction

tests/
  transcription.test.mjs        Unit tests (no network)
  e2e.mjs                       End-to-end, incl. emulated Vercel limits
  mock-providers.mjs            Scenario-driven provider mocks
  mock-servers.mjs              Runs the mocks on fixed ports
```

**Design decisions worth knowing**

- `lib/engines.js` imports no Next.js code and reads no `process.env` — config is
  injected. That is why the providers are directly unit-testable.
- Errors carry a machine-readable `code`; the route decides retryability from
  that code, never from string matching on provider prose.
- The transcript is *editable*. Users routinely need to fix a name or a number,
  and a read-only output would force a round trip through the provider.
- Returned JSON includes the full `attempts` trail, so debugging a fallback in
  production needs no extra logging.

---

## Testing

```bash
npm test                       # 31 unit tests: parsing, errors, formats, URL guard
npm run build && npm run test:e2e   # 27 end-to-end scenarios
```

The E2E suite boots the **real production build** against mock providers and
asserts the contract end to end:

- every fallback trigger (`429`, `402`, `401`, `5xx`, empty transcript);
- double-failure returns a structured error with the attempt trail;
- engine pinning and the `fallback=false` escape hatch;
- validation: missing audio, wrong type, oversize, third-party `audioUrl` (SSRF);
- rate limiting and `Retry-After`;
- **an emulated Vercel deployment** — `VERCEL=1`, a proxy that enforces the
  real 4.5 MB body cap, and assertions that a 4.2 MB upload is rejected by our
  own guard with helpful advice while a 5 MB upload dies at the platform edge
  (which is precisely why the Blob path exists).

No API keys and no network access are required to run the suite.

To demo the whole pipeline without spending credits:

```bash
node tests/mock-servers.mjs        # terminal 1 — mocks on :8787 and :8788
# terminal 2
DEEPGRAM_API_KEY=demo GLADIA_API_KEY=demo \
DEEPGRAM_BASE_URL=http://127.0.0.1:8787/v1/listen \
GLADIA_BASE_URL=http://127.0.0.1:8788/v2 \
npm run dev
```

Then force a fallback and watch the UI adapt:

```bash
curl -X POST localhost:8787/__scenario \
  -H 'content-type: application/json' -d '{"mode":"rate-limit"}'
```

---

## Security notes

- **Keys stay server-side.** Only `/api/transcribe`, `/api/blob/upload` and
  `/api/health` touch `process.env`; every one is a server route. Nothing is
  exposed with a `NEXT_PUBLIC_` prefix. The browser only ever calls same-origin
  paths.
- **SSRF containment.** `audioUrl` is validated against the exact Vercel Blob
  hostname pattern, https-only, no credentials, no ports, no fragments, length
  capped. Arbitrary and internal URLs are rejected before any provider sees them.
- **Credential redaction.** Anything key-shaped is scrubbed before logging via
  `redact()`.
- **Rate limiting** protects provider credits per client IP. It is an
  in-process fixed window — a courtesy guard on one instance, not a distributed
  security boundary. For a hard limit, put Redis/Upstash behind
  `lib/server/rate-limit.js`.
- **Response headers** include `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`
  and a `Permissions-Policy` that allows only same-origin microphone access.
- **This app ships without authentication.** If you deploy it publicly, the
  rate limit is all that stands between your provider credits and the internet.
  Add auth (and check the session in `onBeforeGenerateToken` in
  `app/api/blob/upload/route.js`, as Vercel's docs require) before exposing it.

---

## Troubleshooting

| Symptom | Cause & fix |
| --- | --- |
| `503 No speech-to-text engine is configured` | Neither key is set. Add them to `.env.local` and **restart** the dev server (env files are read at boot). |
| `413 FUNCTION_PAYLOAD_TOO_LARGE` | The upload exceeded Vercel's 4.5 MB body cap. Connect a Blob store so large files bypass the function. |
| `413 … inline upload limit` | Working as designed. Re-import the file (with a Blob store connected it routes through storage) or raise `MAX_UPLOAD_MB`. |
| `415 Unsupported format` | Convert to MP3/WAV/M4A/WebM/OGG/FLAC/AAC. |
| `429 Too many transcription requests` | Your own rate limit. Wait for the window or raise `RATE_LIMIT_MAX`. |
| `402` / `AUTH` in the attempt trail, transcript still returned | The fallback worked. Top up or rotate the primary engine's key to restore it. |
| `504` / transcript cut off on Vercel | Long audio outran the function budget. Raise `maxDuration` + `FUNCTION_BUDGET_MS` (Pro), or split the file. |
| Fallback never triggers | Check the switch in the UI (or `ALLOW_CLIENT_FALLBACK_OPTION`), and confirm the failure is a *retryable* code — malformed audio intentionally is not retried. |
| Microphone does nothing | Browsers require a secure context. `http://localhost` counts; a LAN IP over http does not. |
| Empty transcript from one engine | Expected behaviour: it hands off to the other engine before reporting failure. |

---

## License

MIT
