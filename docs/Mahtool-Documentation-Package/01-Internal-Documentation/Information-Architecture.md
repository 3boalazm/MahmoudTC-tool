# Information architecture

## Route inventory and hierarchy

| Route | Purpose | Primary exit/action | Evidence |
| --- | --- | --- | --- |
| `/` | Explain value and failover | Open transcriber; engines | Source and fresh production text |
| `/studio` | Main task workspace | Input → configuration → transcript/export | Source and fresh production text |
| `/settings` | Personal engine connections | Save/test, disable/enable, disconnect | Controls observed as text; not clicked |
| `/engines` | Provider comparison and setup | Provider docs/dashboard; studio | Static order is not runtime order |
| `/usage` | Local/account consumption context | Provider dashboards; studio | Current extraction has generic no-API cards |
| `/faq` | Recovery, privacy, installation and limits | Studio | Several statements lag executable behavior |
| `/maker` | Maker profile and selected work | External profile/contact; studio | Credits require owner verification |
| `/offline` | Honest network requirement | Retry | Fetched online; no offline execution proof |

SiteHeader/SiteFooter provide shared navigation; theme and language controls belong to shell-level preferences rather than transcription configuration. The root layout applies locale direction and providers before rendering route content. The skip link offers a structural path into main content; actual keyboard focus behavior is unverified.

## Studio hierarchy

1. **Source:** mutually selected file, microphone or link; preview/waveform and metadata.
2. **Configuration:** engine, fallback policy, spoken language and speaker mode.
3. **Action/feedback:** transcribe, upload/transcription timing, cancel, failure recovery.
4. **Output:** text editing, speaker/timeline presentation, copy/TXT/SRT and clear.
5. **Secondary support:** usage and install prompts should not compete with completion.

Text extraction surfaced all source panels but does not show that all are visible simultaneously after hydration. Do not redesign from flattened text alone.

## Label and model mismatches

Landing/engines teach a Deepgram-first sequence while source default and current runtime chain are AssemblyAI-first. The FAQ still names Nova-2; metadata/config use Nova-3. Empty studio output includes literal `{action}`. The usage explanation says “cached for 5.” without a unit. These inconsistencies impair the information model before any aesthetic issue is considered.

## Recommended structure

Drive limits/order labels from one runtime-aware contract, distinguish “presentation order” from “attempt order,” and separate help about credentials from privacy/retention policy. Give usage an operator-restricted audience instead of treating provider account data as ordinary public navigation. Preserve a concise path back to the unfinished task after consulting settings/help. Diagram 01 maps navigation; it is a source model, not an observed clickstream.

## Source evidence

- [components/layout/SiteHeader.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/components/layout/SiteHeader.js#L1-L25)
- [components/layout/SiteFooter.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/components/layout/SiteFooter.js#L1-L25)
- [app/layout.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/app/layout.js#L1-L25)
- [app/studio/page.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/app/studio/page.js#L1-L25)
- [lib/i18n/dictionaries/en.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/lib/i18n/dictionaries/en.js#L1-L25)
