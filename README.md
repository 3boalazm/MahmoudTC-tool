# Speech to Text Studio

A production-ready speech-to-text web app: upload a file or record live in the
browser, and get clean, editable, exportable text.

Four best-in-class engines sit behind **one** API route. Deepgram (Nova-3) does
the work; if it hits a rate limit, runs out of credit, or falls over, **Gladia,
AssemblyAI and Speechmatics take over in turn** and the user sees nothing but a
finished transcript.

API keys never reach the browser — every request is proxied through a Next.js
route handler. The chain is ordered by `ENGINE_ORDER` and every engine is tried
in turn until one succeeds.

```
Browser ──► /api/transcribe ──► Deepgram Nova-3        (primary)
                   │                    │ 429 / 402 / 401 / 5xx / timeout / empty transcript
                   │                    ▼
                   │             Gladia Solaria         (fallback 1)
                   │                    │ still failing
                   │                    ▼
                   │             AssemblyAI Universal   (fallback 2, upload → job → poll)
                   │                    │ still failing
                   └────────────► Speechmatics enhanced (fallback 3, batch job → poll)
```

The studio also ships a **usage & remaining-limit panel**: what this app has
consumed per engine, plus every figure each provider is willing to publish
through its API — Deepgram's remaining balance and hours, Speechmatics' batch
hours, and an explicit "this provider has no usage API" on the two that do not.

It is a **multi-page** app (not a one-pager), **installable** on phones and
desktops, fully **bilingual (English / Arabic with RTL)** and ships both a
**light and a dark theme**.

---

## Contents

- [Features](#features)
- [Pages](#pages)
- [Where a key comes from](#where-a-key-comes-from)
- [Bring your own API keys](#bring-your-own-api-keys)
- [English & Arabic (RTL)](#english--arabic-rtl)
- [Installing it as an app (PWA)](#installing-it-as-an-app-pwa)
- [Light & dark themes](#light--dark-themes)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [How the fallback works](#how-the-fallback-works)
- [Usage & remaining limits](#usage--remaining-limits)
- [Deploying to Vercel](#deploying-to-vercel) ← **read this one**
- [API reference](#api-reference)
- [Architecture](#architecture)
- [Testing](#testing)
- [Security notes](#security-notes)
- [Troubleshooting](#troubleshooting)

---

## Features

**App shell**

- **Separate pages**, each with its own title, description and route:
  `/` · `/studio` · `/engines` · `/usage` · `/faq` · `/settings` (+ `/offline`).
- **Your own keys** — paste a provider key in `/settings`, test it, disconnect it;
  stored in an `httpOnly` cookie on your device, never on the server.
- **Bilingual UI** — English and Arabic, with automatic RTL flipping, a cookie
  that survives restarts, and `Accept-Language` detection on the first visit.
- **Installable PWA** — web manifest, service worker, maskable icons, an
  in-app install button, and an offline shell.
- **Light / dark / system** theme, resolved before the first paint so there is
  never a flash of the wrong theme, with safe-area insets for notched phones.

**Front end**

- Modern studio UI: hero, guided three-step flow, engine comparison, FAQ.
- **File upload** — drag & drop or browse. MP3, WAV, M4A, MP4, WebM, OGG, Opus,
  FLAC, AAC, AMR, AIFF, 3GP, MOV, MKV.
- **Live recording** — `MediaRecorder` with start / pause / resume / stop, a
  wall-clock timer, and a real-time input level meter.
- Real waveform peaks decoded in-browser, plus duration and size readouts.
- Engine picker (Automatic / Deepgram / Gladia / AssemblyAI / Speechmatics),
  automatic-fallback switch, and a 21-language hint dropdown. Unconfigured
  engines are greyed out honestly, and the picker is rendered from
  `/api/health` — add an engine to the registry and it appears.
- Live status: staged progress messages, per-second elapsed counter, cancel.
- Editable transcript with word / character / sentence counts, estimated reading
  time, confidence, and detected language.
- One-click **Copy**, plus `.txt` and `.srt` (word/segment timings) downloads.
- **Usage & remaining-limit panel**: per-engine consumption, Deepgram's real
  balance, Speechmatics' batch hours, and an honest "no usage API" card
  elsewhere — with the provenance of every number one click away.
- Keyboard support: `⌘/Ctrl + Enter` to transcribe, `Esc` to cancel, arrow keys
  to move between engines, full focus-visible states, ARIA live regions.
- Zero layout shift, `prefers-reduced-motion` respected, mobile-first responsive.

**Back end**

- `POST /api/transcribe` — validates, rate-limits, walks the engine chain,
  falls back on retryable failures, normalises four providers into one JSON shape.
- `GET /api/health` — reports which credentials exist (never their values) so
  the UI can adapt.
- `GET /api/usage` — consumption per engine plus every provider figure that
  actually exists.
- `POST /api/blob/upload` — mints short-lived Vercel Blob tokens so files larger
  than the serverless body limit can bypass the function entirely.
- Uploaded Blob audio is deleted automatically after transcription succeeds or
  all provider attempts fail (`BLOB_DELETE_AFTER_USE=true` by default). Cleanup is
  best-effort; a platform timeout or interrupted request can leave an orphaned blob.
- Automatic timeouts, SSRF-safe URL validation, credential redaction.

---

## Pages

| Route | What it is |
| --- | --- |
| `/` | Landing page: the pitch, the numbers, and one diagram of the failover chain. It links out instead of doing everything itself. |
| `/studio` | The transcriber: audio source, engine picker, run bar, transcript, usage panel. |
| `/engines` | What each of the four providers is, which key enables it, what its API exposes, and the exact code-by-code hand-off table. |
| `/usage` | The consumption report, plus an explanation of where every number comes from. |
| `/settings` | Connect your own provider keys, test them, and disconnect. |
| `/faq` | Questions and troubleshooting. |
| `/offline` | Served by the service worker when a navigation fails with no connection. |

Every page is a server component that reads the locale cookie, so titles,
descriptions and `<html lang dir>` always agree with the copy.

---

## Where a key comes from

The app ships with keys for all four engines, so a fresh clone transcribes on
the first run — `cp .env.local.example .env.local` is optional, not required.

Each engine resolves its key on every request, highest priority first:

| # | Source | Scope | Removable from the UI |
| --- | --- | --- | --- |
| 1 | `/settings` — a key you paste yourself | this browser only | yes, one click |
| 2 | an environment variable (`DEEPGRAM_API_KEY`, …) | the whole deployment | no, disable it for this browser instead |
| 3 | the built-in default in `lib/server/default-keys.js` | every install of this repo | no, disable it for this browser instead |
| 4 | nothing | — | engine reports as unavailable |

Setting an environment variable replaces tier 3 for that engine **only**; the
other three keep their defaults. That is the whole override mechanism — change
one, leave the rest alone.

To run on your own keys exclusively, set `DISABLE_BUILTIN_KEYS=1` and the
built-in defaults drop out of the chain entirely.

Only the key is ever substituted. Model, timeouts, base URL and poll intervals
stay deployment-controlled, so a visitor can bring a key without also bringing
a provider contract.

---

## Bring your own API keys

The app runs out of the box on the deployment's own keys, and equally well on
*yours*. `/settings` connects a personal key per engine, tests it against the
provider, and disconnects it again.

| | Deployment key (`DEEPGRAM_API_KEY`, …) | Your key (settings page) |
| --- | --- | --- |
| Who can use it | every visitor | this browser only |
| Where it lives | server environment variables | an `httpOnly` cookie on the device (`stt_keys`) |
| Used when | no personal key is saved | always wins over the deployment key |
| Removable from the UI | no — disable it for this browser instead | yes, one click ("Disconnect") |
| Testable before saving | — | yes, a real authenticated probe per provider |

Design notes:

- **A key is never sent back to the browser.** Responses carry a mask
  (`dg-t••••2a91`) and nothing else; a key saved here is readable only by the
  server that stores it.
- **`httpOnly` + `SameSite=Lax` + `Secure` in production**, so an injected script
  cannot read it and another site cannot make the browser attach it. Cross-site
  requests to `/api/credentials` are refused outright.
- **Nothing is persisted server-side.** That is what makes this deployable to
  Vercel with no database and no account system — the key travels with the
  browser that typed it, and the server only ever holds it for the duration of a
  request.
- **A rejected key is not stored.** The probe returns `REJECTED` on a 401 and the
  previous key stays in force, so fixing a typo can never cost you a working
  channel. Inconclusive results (timeout, unreachable) *are* stored, with the
  outcome shown verbatim.
- **Usage stays per-credential.** Provider-reported figures are cached under a
  fingerprint of the key that fetched them, so one visitor's balance can never
  appear on another's screen.
- **The probe is scope-safe.** Deepgram's probe uses `/v1/auth/token` (any scope)
  rather than the management API, which would call a perfect listen-only key
  broken.

Adding an engine to the settings page is one entry in `PROBES`
(`lib/server/verify.js`) plus the existing engine registry.

---

## English & Arabic (RTL)

- `lib/i18n/dictionaries/en.js` is the source of truth; `ar.js` mirrors it
  **key for key**, and `npm test` fails if the two ever drift — a missing
  translation can never ship as a blank label or a raw `some.key` on screen.
- The active locale lives in the `stt_locale` cookie, so the server renders the
  correct `lang` and `dir` on the first byte. Switching languages calls
  `router.refresh()`, which re-renders the whole tree — server components
  included — so a half-translated screen is not possible.
- With no cookie, the first visit follows the browser's `Accept-Language`.
- Layout uses logical properties (`ms-`/`me-`/`start-`/`end-`, `rtl:` variants),
  so the interface mirrors properly rather than merely swapping text.
- API error codes are translated on the client from the code the server returns,
  which keeps the route's payload language-neutral.

Adding a locale: drop `lib/i18n/dictionaries/xx.js` next to the others, add it to
`LOCALES` in `lib/i18n/config.js`, and add it to `RTL_LOCALES` if it reads
right-to-left. Nothing else needs touching.

---

## Installing it as an app (PWA)

```bash
npm run icons     # regenerates public/icons/* from the SVG mark
```

- `app/manifest.js` builds the manifest **per request**: name, short name,
  description, `lang`, `dir` and `theme_color` all follow the visitor's locale
  and theme cookies, and it advertises the pages as app shortcuts.
- `public/sw.js` is a deliberately conservative service worker: navigations are
  network-first with a cached fallback and `/offline` as the last resort, build
  output is cache-first (it is content-hashed), and **`/api/*` is never cached** —
  a replayed transcript would be worse than an honest error.
- The install button appears when the browser offers a prompt, and on iOS —
  where no programmatic prompt exists — it shows the Share → Add to Home Screen
  instructions instead.
- Installed windows get safe-area insets, `viewport-fit=cover`, and a
  `display: standalone` layout with no browser chrome.

---

## Light & dark themes

- The `stt_theme` cookie stores `system`, `light` or `dark`.
- A tiny inline script in `<head>` resolves `system` against
  `prefers-color-scheme` **before the body paints**, so the first frame is
  already correct — no flash, no hydration mismatch.
- The whole palette is one set of CSS variables. The light theme re-declares the
  same variables under `[data-theme='light']`, so every component — present and
  future — is themed without a single `dark:` variant.
- The manifest follows the same cookie, so the installed app window background
  matches the interface.

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
| **Gladia** | <https://app.gladia.io/> | Free tier available. Fallback 1. |
| **AssemblyAI** | <https://www.assemblyai.com/dashboard/activation> | Activate the account, then copy a key. Fallback 2. |
| **Speechmatics** | <https://portal.speechmatics.com/> | Free hours each month; keys are **region-scoped**. Fallback 3. |

You need **at least one** key to transcribe; every additional one makes the app
that much harder to take down. Any engine without a key is greyed out in the UI
and skipped by the chain.

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

All four engines work out of the box on the built-in default keys. Setting a
variable overrides the default for that engine; see
[Where a key comes from](#where-a-key-comes-from). Any of them can also be
replaced per browser from `/settings` without touching the deployment.

Copy `.env.local.example` → `.env.local` — optional, the app ships with keys. There are **no environment variables
for the interface layer**: language and theme are per-visitor cookies.

### Provider keys (all optional)

Every engine already has a built-in default key, so **none of these are
required**. Set one to override the default for that engine.

| Variable | Description |
| --- | --- |
| `DEEPGRAM_API_KEY` | Deepgram key — primary engine. Aliases: `DEEPGRAM_KEY`, `DG_API_KEY`. |
| `GLADIA_API_KEY` | Gladia key — first fallback. Alias: `GLADIA_KEY`. |
| `ASSEMBLYAI_API_KEY` | AssemblyAI key — second fallback. Aliases: `ASSEMBLYAI_KEY`, `AAI_API_KEY`. |
| `SPEECHMATICS_API_KEY` | Speechmatics key — third fallback. Aliases: `SPEECHMATICS_KEY`, `SM_API_KEY`. |
| `DISABLE_BUILTIN_KEYS` | `false` — set `1` to ignore the shipped defaults and run on environment + `/settings` keys only. |
| `ENGINE_ORDER` | Failover order, e.g. `assemblyai,deepgram,gladia,speechmatics` (the default). Omit what you do not use. Unknown ids are appended, so a typo can never leave you with zero engines. |

### Large uploads (strongly recommended on Vercel)

| Variable | Default | Description |
| --- | --- | --- |
| `BLOB_READ_WRITE_TOKEN` | — | Injected by a connected Vercel Blob store. Enables files larger than the serverless body limit. |
| `BLOB_MAX_UPLOAD_MB` | `300` | Ceiling for a single browser → Blob upload. |
| `BLOB_DELETE_AFTER_USE` | `true` | Delete the object as soon as transcription finishes. |
| `ALLOW_BLOB_UPLOAD` | `true` | Set to `false` to disable the large-file path entirely. |

### Tuning (all optional, all with safe defaults)

| Variable | Default | Description |
| --- | --- | --- |
| `DEEPGRAM_MODEL` | `nova-3` | Nova-3 supports Arabic, including Egyptian Arabic (`ar-EG`); Arabic/auto requests are upgraded from Nova-2 if it is explicitly configured. |
| `MAX_UPLOAD_MB` | `4` on Vercel, `25` elsewhere | Ceiling for audio streamed *through* the API route. |
| `ALLOW_MEDIA_LINKS` | `true` | Turns the "From a link" input on or off. |
| `MAX_LINK_MB` | `50` on Vercel, `100` elsewhere | Largest file the server will download from a pasted link. |
| `LINK_FETCH_TIMEOUT_MS` | `30000` | Download deadline for a link (taken out of the same function budget). |
| `FUNCTION_BUDGET_MS` | `55000` on Vercel, `120000` elsewhere | Wall-clock budget for provider work inside one invocation. Provider timeouts are clamped to fit. |
| `DEEPGRAM_TIMEOUT_MS` | `120000` | Per-request abort timeout. |
| `GLADIA_TIMEOUT_MS` | `120000` | Per-request abort timeout. |
| `GLADIA_POLL_TIMEOUT_MS` | `120000` | How long to poll a Gladia job before giving up. |
| `GLADIA_POLL_INTERVAL_MS` | `1500` on Vercel, `2000` elsewhere | Poll interval. |
| `ASSEMBLYAI_MODEL` | account default | Leave unset: a stale model id is rejected with a 400. Current ids: `universal-3-pro`, `universal-2`. |
| `SPEECHMATICS_MODEL` | `enhanced` | `standard` \| `enhanced` \| `melia-1`. |
| `ASSEMBLYAI_TIMEOUT_MS` / `SPEECHMATICS_TIMEOUT_MS` | `120000` | Per-request abort timeout, clamped to `FUNCTION_BUDGET_MS`. |
| `ASSEMBLYAI_POLL_TIMEOUT_MS` / `SPEECHMATICS_POLL_TIMEOUT_MS` | `120000` | How long to poll an async job before giving up. |
| `ASSEMBLYAI_POLL_INTERVAL_MS` / `SPEECHMATICS_POLL_INTERVAL_MS` | `1500` on Vercel, `2000` elsewhere | Poll interval. |
| `DEEPGRAM_BASE_URL` / `GLADIA_BASE_URL` / `ASSEMBLYAI_BASE_URL` / `SPEECHMATICS_BASE_URL` | public APIs | Point at a gateway, a proxy, or the local mocks (`npm run demo`). |
| `ENABLE_USAGE_PANEL` | `true` | Set `false` to hide the usage/limits panel (recommended on a public deploy). |
| `USAGE_CACHE_SEC` | `300` | How long provider-reported usage is cached. |
| `USAGE_PERIOD_DAYS` | `30` | Look-back window for consumption queries. |
| `DEEPGRAM_BALANCE_ID` | — | Only needed when the management API refuses to list balances. |
| `RATE_LIMIT_MAX` | `20` | Requests per window, per client IP. |
| `RATE_LIMIT_WINDOW_SEC` | `60` | Window length. |
| `FALLBACK_ON_EMPTY_TRANSCRIPT` | `true` | Treat a silent transcript as retryable. |
| `ALLOW_CLIENT_FALLBACK_OPTION` | `true` | Set `false` to force fallback on and hide the UI switch. |

---

## How the fallback works

Failures are **classified**, not swallowed. Each provider error maps to a code,
and only codes that mean "this provider is out of action" trigger a hand-off.

### Fallback triggers (the failing engine's work is retried on the next)

| Trigger | Code | Why it is retryable |
| --- | --- | --- |
| `429` rate limit / too many concurrent requests (incl. Speechmatics' "Max concurrent running jobs exceeded") | `RATE_LIMITED` | Transient capacity issue, not a problem with the audio. |
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
| A credential missing for one engine | `MISSING_KEY` | Non-retryable for that engine, but the plan still runs the others. |
| Speechmatics remote URL | Batch API `fetch_data` | Speechmatics fetches audio URLs itself, including Vercel Blob URLs for large uploads. |

### What the client sees

Every response — success or failure — has one shape, so the UI never guesses:

```jsonc
// 200 OK
{
  "ok": true,
  "text": "…transcript…",
  "engine": "gladia",          // which engine actually produced this
  "model": "solaria-1",        // Deepgram nova-3 · Gladia Solaria · AssemblyAI universal · Speechmatics enhanced
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
// 502 Bad Gateway (the whole chain failed)
{
  "error": {
    "code": "SERVER_ERROR",
    "message": "All 4 engines failed (deepgram, gladia, assemblyai, speechmatics). …",
    "attempts": [
      { "engine": "deepgram",     "ok": false, "code": "PAYMENT_REQUIRED", "retryable": true },
      { "engine": "gladia",       "ok": false, "code": "SERVER_ERROR",     "retryable": true },
      { "engine": "assemblyai",   "ok": false, "code": "RATE_LIMITED",     "retryable": true },
      { "engine": "speechmatics", "ok": false, "code": "SERVER_ERROR",     "retryable": true }
    ]
  }
}
```

Raw provider messages are logged server-side and are only echoed to the client
when `NODE_ENV !== 'production'`, so production users never see provider noise
(and never see anything that smells like a credential).

---

## Usage & remaining limits

`GET /api/usage` (and the panel at the bottom of the studio) answers a question
the providers answer very differently. Rather than invent a number, each engine
reports exactly what its API is willing to say:

| Engine | Remaining | Consumption | Source |
| --- | --- | --- | --- |
| Deepgram | ✅ balance total (USD) | ✅ audio hours + requests, grouped by model | `GET /v1/projects` → `…/balances` + `…/usage/breakdown` |
| Speechmatics | — (not exposed) | ✅ batch hours + job count for the period | `GET /v2/usage?since=&until=` |
| Gladia | — (not exposed) | local counters only | no public usage/balance endpoint |
| AssemblyAI | — (not exposed) | local counters only | no public usage/balance endpoint |

Alongside the provider figures, the server keeps per-engine counters for the
current process — requests, successes, failures, audio seconds, how often an
engine had to be reached through fallback — and labels them as exactly that:
counters that reset on every deploy and are per-instance.

```jsonc
// GET /api/usage
{
  "period": { "start": "2026-09-13", "end": "2026-10-13", "days": 30 },
  "cacheSeconds": 300,
  "engines": [
    {
      "engine": "deepgram",
      "label": "Deepgram",
      "reportsUsage": "balance+usage",
      "configured": true,
      "dashboardUrl": "https://console.deepgram.com/",
      "provider": {
        "available": true,
        "remaining": { "amount": 120.45, "units": "USD", "entries": 2 },
        "consumption": { "hours": 1.5, "requests": 12, "byModel": [ … ] }
      },
      "local": { "requests": 4, "successes": 3, "failures": 1, "audioSeconds": 12, "fallbackWins": 1 }
    },
    { "engine": "gladia", "reportsUsage": "none", "provider": { "available": false, "error": "Gladia exposes usage only in its dashboard, not over the API." } }
  ],
  "totals": { "requests": 12, "audioMinutes": 4, "fallbackWins": 2 },
  "disclosure": { "localCounters": "…", "providerFigures": "…", "missing": "…" }
}
```

Design rules the panel follows:

- A provider without a usage API gets an explicit *"no API for usage"* card and
  a dashboard link — never a guess.
- Deepgram's balance needs a key with management/member scope; without it the
  card explains what scope is missing instead of showing `$0`.
- Speechmatics is keyed to a **region**; a key from another region is rejected by
  the usage endpoint, and the card says so.
- The panel is hidden when `ENABLE_USAGE_PANEL=false`, and `GET /api/usage`
  returns 404 then. It exposes account-level consumption, so turn it off on a
  public deployment.

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
touch a function), and the route hands the provider the resulting URL. Deepgram,
Gladia and AssemblyAI all accept remote audio; if the chain reaches Speechmatics,
we download the object server-side and post the bytes to it. Either way the
object is deleted the moment transcription finishes. The object is deleted the moment transcription
finishes, so audio is stored transiently, never as data.

### Limit 2 — functions have a maximum duration

Every plan caps function runtime (60 s on Hobby, up to 300 s on Pro), and a very
long recording can outlive it.

**The fix, already implemented:** `lib/server/config.js` derives a single
wall-clock budget (`FUNCTION_BUDGET_MS`, default 55 s on Vercel) and clamps
*every* provider timeout — including the polling loops for Gladia, AssemblyAI
and Speechmatics — to fit inside it. The route therefore always has time left to
return real JSON instead of being killed mid-request, and an engine that runs
out of budget hands off cleanly to the next one. Nothing here relies on a paid
plan: the default budget is derived from the platform, not from the plan.

### Step-by-step

1. **Push the repo** and import it at <https://vercel.com/new>. Framework preset:
   **Next.js** — no build tweaks needed.

2. **Add your secrets** in *Project → Settings → Environment Variables*:

   ```
   DEEPGRAM_API_KEY      = dg_…
   GLADIA_API_KEY        = …
   ASSEMBLYAI_API_KEY    = …
   SPEECHMATICS_API_KEY  = …
   ```

   Optional: `ENGINE_ORDER` to reorder the chain, and `ENABLE_USAGE_PANEL=false`
   if you do not want the consumption panel visible to visitors.

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

   You should see every keyed engine `available: true`, the failover order in
   `engineOrder`, and `largeUploads.enabled: true` when the Blob store is
   connected. `/api/usage` then reports per-engine consumption.

### Upload ceilings you should expect

| Deployment | Inline through the function | Via Vercel Blob |
| --- | --- | --- |
| Local / self-hosted | 25 MB (raise with `MAX_UPLOAD_MB`) | not needed |
| Vercel, no Blob store | **4 MB** | unavailable |
| Vercel + Blob store | 4 MB | **300 MB** (`BLOB_MAX_UPLOAD_MB`) |

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

### `GET|POST|DELETE /api/credentials`

The endpoint behind `/settings`. Never returns a key — only a mask and its
source (`settings` | `environment` | `disabled` | `none`).

| Call | Body / query | Does |
| --- | --- | --- |
| `GET` | — | masked status of every engine, plus the failover chain this browser can run |
| `POST` | `{ engine, key }` | validates the shape, probes the provider, stores it (unless the provider answered `401`) |
| `POST` | `{ engine, action: "test" }` | probes the stored or env key without changing anything |
| `POST` | `{ engine, action: "disable" }` | shadows the deployment key for this browser |
| `POST` | `{ engine, action: "enable" }` | removes that shadow |
| `DELETE` | `?engine=gladia` | forgets one engine |
| `DELETE` | `?all=1` | forgets everything (disconnect) |

`403` cross-site · `400` unknown engine, unusable key shape (`X-Key-Rejected`
carries the reason) · `429` too many probe attempts.

### `POST /api/transcribe`

`multipart/form-data` (standard) or `application/json` (remote audio).

| Field | Type | Description |
| --- | --- | --- |
| `audio` | file | The clip. Required in multipart mode. |
| `audioUrl` | string | Vercel Blob URL. Required in JSON mode; mutually exclusive with `audio`. |
| `mediaUrl` | string | A public link to an audio/video file. The server downloads it (max `MAX_LINK_MB`) and transcribes the bytes, so every engine works. Mutually exclusive with `audio`/`audioUrl`. Direct file links only — YouTube-style pages and `.m3u8` playlists are rejected. |
| `filename` | string | Optional, improves provider hints. |
| `engine` | `auto` \| `deepgram` \| `gladia` \| `assemblyai` \| `speechmatics` | Default `auto` (the `ENGINE_ORDER` chain). A pinned engine is tried first, then the rest of the chain. |
| `fallback` | `true` \| `false` | Default `true`. When `false` and an engine is pinned, only that engine runs. |
| `language` | ISO-639-1 | `en`, `ar`, `es`, … Omit or `auto` for auto-detection. |
| `durationSeconds` | number | Optional, used for accurate audio-length reporting. |

Status codes: `200` success · `400` bad request · `402` out of credit ·
`413` too large · `415` unsupported format · `429` rate limited ·
`502` the whole chain failed · `503` no engine configured · `504` timeout.

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

Reports capability, never secrets: every engine with its key state, position in
the failover chain, model, accent and whether it accepts a remote URL — plus the
upload ceilings and which optional features (Blob, usage panel) are live. The UI
renders the engine picker straight from this, so adding an engine needs no
client-side change.

### `GET /api/usage`

Per-engine consumption plus whatever each provider will report, and an explicit
`disclosure` block describing what the numbers are and are not. `404` when
`ENABLE_USAGE_PANEL=false`. Same-origin only (cross-site `Sec-Fetch-Site` is
rejected) and rate limited like transcription. See
[Usage & remaining limits](#usage--remaining-limits).

### `POST /api/blob/upload`

Mints short-lived Vercel Blob client tokens (the token exchange used by direct
browser uploads). Returns `503` when no Blob store is connected. Guarded by the
same rate limit as transcription, restricted to audio/video MIME types and the
audio extensions, with a hard size ceiling baked into the token.

---

## Architecture

```
app/
  layout.js                     Locale + theme resolution, chrome, PWA metadata
  page.js                       Landing page (links out to the other pages)
  studio/page.js                The transcriber
  engines/page.js               Provider detail + hand-off table
  usage/page.js                 Consumption page
  faq/page.js                   Questions & troubleshooting
  offline/page.js               Offline shell (served by the service worker)
  manifest.js                   Localised web app manifest
  globals.css                   Design tokens (dark + light), keyframes, PWA CSS
  icon.svg                      Favicon
  api/
    transcribe/route.js         ⭐ Proxy + smart fallback orchestration
    blob/upload/route.js        Vercel Blob token exchange (large uploads)
    health/route.js             Capability probe for the UI
    usage/route.js              Consumption + remaining-limit report

components/
  CredentialsPanel.js           The connect/disconnect UI (server-rendered first)
  layout/SiteHeader.js          Sticky nav, mobile sheet, switchers, install CTA
  layout/SiteFooter.js          Shared footer
  layout/LanguageSwitcher.js    EN ⇄ AR toggle
  layout/ThemeToggle.js         system → light → dark
  providers/I18nProvider.js     Translator + locale switching (client)
  providers/ThemeProvider.js    Theme cookie + pre-paint script
  InstallApp.js                 Install button/banner + iOS instructions
  ServiceWorkerRegistrar.js     Registers the worker in production
  TranscriptionStudio.js        Client orchestrator; owns the request lifecycle
  AudioSourceCard.js            Upload / record tabs, drop zone, timer, meters
  EngineControls.js             Engine radio group (auto + N engines), switch, language
  TranscriptPanel.js            Status, stats, editable output, copy/export
  UsagePanel.js                 Consumption, remaining balance, data provenance
  Waveform.js                   Static waveform + live level meter
  Icons.js                      Inline SVG icon set (no icon dependency)

hooks/
  useRecorder.js                MediaRecorder: permissions, codecs, pause, meter
  useAudioSource.js             Object URLs, peak decoding, duration recovery

lib/
  i18n/config.js                Locales, themes, cookies, direction, Accept-Language
  i18n/index.js                 Dictionaries, flattening, interpolation, translator
  i18n/server.js                Server helper: locale → translator
  i18n/dictionaries/{en,ar}.js  The strings (parity enforced by tests)
  engines-meta.js               Engine registry (labels, models, accents, usage mode)
  server/credentials.js         Key cookie: parse, validate, mask, fingerprint, precedence
  server/verify.js              Per-provider "is this key alive?" probes
  engines.js                    ⭐ Four provider adapters, error taxonomy
  url-guard.js                  SSRF-safe URL validation
  client/api.js                 fetch client + Blob direct upload
  client/format.js              Formatting, SRT/TXT builders, clipboard
  server/config.js              Env parsing + serverless-aware defaults
  server/blob.js                Blob capability + cleanup
  server/usage.js               Local counters + provider usage APIs
  server/rate-limit.js          In-process fixed-window limiter
  server/http.js                Response shapes + credential redaction

public/
  sw.js                         Service worker (offline shell, never caches /api)
  icons/                        Generated PNG icons (npm run icons)

scripts/
  generate-icons.mjs            SVG mark → PWA icon set (sharp)

tests/
  credentials.test.mjs          Key cookie, validation, masks, precedence, cache isolation
  i18n.test.mjs                 Dictionary parity + every key used in the code
  theme.test.mjs                Palette parity + the theme cookie contract
  pwa.test.mjs                  Manifest, icons, and the service worker policy
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
npm test                       # 90 unit tests: parsing, errors, i18n parity, theme, PWA, credentials
npm run build && npm run test:e2e   # 48 end-to-end scenarios
```

The E2E suite boots the **real production build** against mock providers and
asserts the contract end to end:

- every fallback trigger (`429`, `402`, `401`, `5xx`, empty transcript);
- the **deep chain**: Deepgram → Gladia → AssemblyAI → Speechmatics, including a
  third-engine and fourth-engine hand-off, and a non-retryable error that stops
  the chain instead of burning credit;
- whole-chain failure returns a structured error naming every engine tried;
- engine pinning, the `fallback=false` escape hatch, and Speechmatics refusing a
  remote URL via its Batch API `fetch_data` field;
- `/api/usage` reports Deepgram's balance, Speechmatics' batch hours, and says
  "no API" for the two providers that publish nothing;
- every page renders, `/studio` owns the transcriber, and the landing page
  links to it instead of containing it;
- an Arabic cookie flips `lang="ar" dir="rtl"` and translates the copy, while
  `Accept-Language` does the same with no cookie at all;
- the theme cookie reaches the document, the manifest is localised and
  installable, and the service worker never caches `/api/*`;
- a key saved on `/settings` is the one the provider receives (asserted on the
  wire), a rejected key never replaces a working one, disconnecting restores the
  deployment key, and no response ever contains a key;
- validation: missing audio, wrong type, oversize, third-party `audioUrl` (SSRF);
- rate limiting and `Retry-After`;
- **an emulated Vercel deployment** — `VERCEL=1`, a proxy that enforces the
  real 4.5 MB body cap, and assertions that a 4.2 MB upload is rejected by our
  own guard with helpful advice while a 5 MB upload dies at the platform edge
  (which is precisely why the Blob path exists).

No API keys and no network access are required to run the suite.

To demo the whole pipeline without spending credits:

```bash
npm run demo                       # terminal 1 — mocks on :8787-:8790
# terminal 2
DEEPGRAM_API_KEY=demo-key GLADIA_API_KEY=demo-key \
ASSEMBLYAI_API_KEY=demo-key SPEECHMATICS_API_KEY=demo-key \
DEEPGRAM_BASE_URL=http://127.0.0.1:8787/v1/listen \
GLADIA_BASE_URL=http://127.0.0.1:8788/v2 \
ASSEMBLYAI_BASE_URL=http://127.0.0.1:8789 \
SPEECHMATICS_BASE_URL=http://127.0.0.1:8790 \
npm run dev
```

The mocks implement the management/usage endpoints too, so the usage panel has
real shapes to render. Then walk the chain yourself:

```bash
# Deepgram rate-limited + Gladia down → AssemblyAI answers
curl -X POST localhost:8787/__scenario -H 'content-type: application/json' -d '{"mode":"rate-limit"}'
curl -X POST localhost:8788/__scenario -H 'content-type: application/json' -d '{"mode":"server-error"}'
curl -X POST localhost:3000/api/usage | jq '.engines[] | {engine, local: .local.requests}'
```

---

## Security notes

The keys shipped in `lib/server/default-keys.js` are **base64-encoded, not
encrypted** — that keeps automated scanners, which match on provider key
shapes, from harvesting them out of this public repository. It is not a
security boundary: anyone who reads the file can decode it in one line. Rotate
them (`node -e "console.log(Buffer.from('KEY').toString('base64'))"`), move
them into environment variables, or make the repository private if they matter.

- **Deployment keys stay server-side.** Only the API routes touch
  `process.env`; nothing is exposed with a `NEXT_PUBLIC_` prefix and the browser
  only ever calls same-origin paths.
- **Personal keys never leave their device in readable form.** A key saved on
  `/settings` is stored in an `httpOnly`, `SameSite=Lax`, `Secure`-in-production
  cookie, is written to no database and no log, and is only ever sent back to
  this server so it can call the provider. Responses carry a mask; a fingerprint
  (SHA-256, 12 hex chars) is used solely to keep usage caches apart. `/api/credentials`
  refuses cross-site callers, and saving/testing is rate limited because each
  attempt costs a provider round trip.
- **SSRF containment.** `audioUrl` is validated against the exact Vercel Blob
  hostname pattern, https-only, no credentials, no ports, no fragments, length
  capped. Arbitrary and internal URLs are rejected before any provider sees them.
- **Link downloads (`mediaUrl`).** The one place the server fetches a caller's URL, so it is locked down in layers: http(s) on the default port only, no credentials, no internal hostnames; every address the name resolves to must be public (checked inside the socket `lookup`, so DNS rebinding cannot swap it afterwards); each redirect hop is re-validated (max 3); the body is capped by `Content-Length` and while streaming; one wall-clock deadline covers the whole download; and the response must be audio/video, not a page. Covered by `tests/remote-media.test.mjs` and the e2e suite. Turn it off with `ALLOW_MEDIA_LINKS=false`.
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
| `503 No speech-to-text engine is configured` | No key is set at all. Add at least one to `.env.local` and **restart** the dev server (env files are read at boot). |
| `413 FUNCTION_PAYLOAD_TOO_LARGE` | The upload exceeded Vercel's 4.5 MB body cap. Connect a Blob store so large files bypass the function. |
| `413 … inline upload limit` | Working as designed. Re-import the file (with a Blob store connected it routes through storage) or raise `MAX_UPLOAD_MB`. |
| `415 Unsupported format` | Convert to MP3/WAV/M4A/WebM/OGG/FLAC/AAC. |
| `429 Too many transcription requests` | Your own rate limit. Wait for the window or raise `RATE_LIMIT_MAX`. |
| `402` / `AUTH` in the attempt trail, transcript still returned | The fallback worked. Top up or rotate the primary engine's key to restore it. |
| `504` / transcript cut off on Vercel | Long audio outran the function budget. Raise `maxDuration` + `FUNCTION_BUDGET_MS` (Pro), or split the file. |
| Fallback never triggers | Check the switch in the UI (or `ALLOW_CLIENT_FALLBACK_OPTION`), and confirm the failure is a *retryable* code — malformed audio intentionally is not retried. Only engines with a key are in the chain. |
| Usage panel says "no API for usage" | Correct: Gladia and AssemblyAI publish usage only in their dashboards. Deepgram's card needs a key with management scope; Speechmatics' needs the key for the **same region** as `SPEECHMATICS_BASE_URL`. |
| Speechmatics returns `Permission Denied` / `Invalid or missing license` | The key belongs to a different region than the base URL. EU: `eu1.asr.api.speechmatics.com`; US: `us1.asr.api.speechmatics.com`. |
| Microphone does nothing | Browsers require a secure context. `http://localhost` counts; a LAN IP over http does not. |
| Empty transcript from one engine | Expected behaviour: it hands off to the next engine before reporting failure. |

---

## License

MIT
