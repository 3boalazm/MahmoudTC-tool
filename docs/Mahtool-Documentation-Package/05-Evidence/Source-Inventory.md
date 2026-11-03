# Source inventory and locked configuration

## Locked stack

| Package | Version |
| --- | --- |
| next | 16.4.0 |
| react | 19.3.0 |
| react-dom | 19.3.0 |
| tailwindcss | 4.3.3 |
| @vercel/blob | 2.8.1 |
| @vercel/analytics | 2.0.1 |
| eslint | 9.39.5 |
| eslint-config-next | 16.4.0 |
| geist | 1.7.2 |

## Environment-name inventory

Names only, extracted from direct process.env access plus the example file. Includes test/Node/platform names, not a requirement to configure every name. Runtime defaults and aliases are described in config; no environment values were inspected or reproduced.

`AAI_API_KEY`, `ALLOW_BLOB_UPLOAD`, `ALLOW_CLIENT_FALLBACK_OPTION`, `ALLOW_MEDIA_LINKS`, `ASSEMBLYAI_API_KEY`, `ASSEMBLYAI_BASE_URL`, `ASSEMBLYAI_KEY`, `ASSEMBLYAI_MODEL`, `ASSEMBLYAI_POLL_INTERVAL_MS`, `ASSEMBLYAI_POLL_TIMEOUT_MS`, `ASSEMBLYAI_TIMEOUT_MS`, `BLOB_DELETE_AFTER_USE`, `BLOB_MAX_UPLOAD_MB`, `BLOB_READ_WRITE_TOKEN`, `DEEPGRAM_API_KEY`, `DEEPGRAM_BASE_URL`, `DEEPGRAM_KEY`, `DEEPGRAM_MODEL`, `DEEPGRAM_TIMEOUT_MS`, `DG_API_KEY`, `DISABLE_BUILTIN_KEYS`, `ENABLE_USAGE_PANEL`, `ENGINE_ORDER`, `FALLBACK_ON_EMPTY_TRANSCRIPT`, `FUNCTION_BUDGET_MS`, `GLADIA_API_KEY`, `GLADIA_BASE_URL`, `GLADIA_KEY`, `GLADIA_POLL_INTERVAL_MS`, `GLADIA_POLL_TIMEOUT_MS`, `GLADIA_TIMEOUT_MS`, `LINK_FETCH_TIMEOUT_MS`, `MAX_LINK_MB`, `MAX_UPLOAD_MB`, `MEDIA_LINK_ALLOW_PRIVATE_FOR_TESTS`, `NODE_ENV`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_SEC`, `SM_API_KEY`, `SPEECHMATICS_API_KEY`, `SPEECHMATICS_BASE_URL`, `SPEECHMATICS_KEY`, `SPEECHMATICS_MODEL`, `SPEECHMATICS_POLL_INTERVAL_MS`, `SPEECHMATICS_POLL_TIMEOUT_MS`, `SPEECHMATICS_TIMEOUT_MS`, `USAGE_CACHE_SEC`, `USAGE_PERIOD_DAYS`, `USAGE_TIMEOUT_MS`, `VERCEL`, `VERCEL_ENV`

## Source scope


### app

- `app/api/blob/upload/route.js`
- `app/api/credentials/route.js`
- `app/api/health/route.js`
- `app/api/transcribe/route.js`
- `app/api/usage/route.js`
- `app/engines/page.js`
- `app/faq/page.js`
- `app/globals.css`
- `app/icon.svg`
- `app/layout.js`
- `app/maker/MakerContent.js`
- `app/maker/page.js`
- `app/manifest.js`
- `app/offline/page.js`
- `app/page.js`
- `app/settings/page.js`
- `app/studio/page.js`
- `app/usage/page.js`

### components

- `components/AudioSourceCard.js`
- `components/CredentialsPanel.js`
- `components/EngineControls.js`
- `components/Icons.js`
- `components/InstallApp.js`
- `components/ServiceWorkerRegistrar.js`
- `components/TranscriptPanel.js`
- `components/TranscriptionStudio.js`
- `components/UsagePanel.js`
- `components/Waveform.js`
- `components/layout/LanguageSwitcher.js`
- `components/layout/SiteFooter.js`
- `components/layout/SiteHeader.js`
- `components/layout/ThemeToggle.js`
- `components/providers/I18nProvider.js`
- `components/providers/ThemeProvider.js`

### hooks

- `hooks/useAudioSource.js`
- `hooks/useRecorder.js`

### lib

- `lib/client/api.js`
- `lib/client/format.js`
- `lib/engines-meta.js`
- `lib/engines.js`
- `lib/fonts.js`
- `lib/i18n/config.js`
- `lib/i18n/dictionaries/ar.js`
- `lib/i18n/dictionaries/en.js`
- `lib/i18n/index.js`
- `lib/i18n/server.js`
- `lib/remote-media.js`
- `lib/server/blob.js`
- `lib/server/config.js`
- `lib/server/credentials.js`
- `lib/server/default-keys.js`
- `lib/server/fetch-media.js`
- `lib/server/http.js`
- `lib/server/rate-limit.js`
- `lib/server/usage.js`
- `lib/server/verify.js`
- `lib/url-guard.js`

### tests

- `tests/credentials.test.mjs`
- `tests/diarization.test.mjs`
- `tests/e2e.mjs`
- `tests/i18n.test.mjs`
- `tests/mock-providers.mjs`
- `tests/mock-servers.mjs`
- `tests/pwa.test.mjs`
- `tests/remote-media.test.mjs`
- `tests/theme.test.mjs`
- `tests/transcript-format.test.mjs`
- `tests/transcription.test.mjs`

Other tracked material such as erp-proposal is outside this STT audit. The inventory is baseline evidence, not a dump of source files or credentials.

## Source evidence

- [package-lock.json:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/package-lock.json#L1-L25)
- [lib/server/config.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/lib/server/config.js#L1-L25)
