# Mahtool — project overview

Mahtool / Speech to Text Studio is an existing bilingual browser workspace for turning recordings into editable text. The repository combines file upload, microphone recording and direct media links with four speech-to-text adapters behind a same-origin Next.js API. The documentation describes and evaluates the implementation; it does not claim that the documentation author created it.

## Product and user value

The intended benefit is continuity when a provider rejects a request because of account limits, authentication, outages or empty recognition. A normalized response exposes the successful engine and attempt trail rather than forcing the user to understand four different APIs. Editing, speaker presentation, copy, TXT and timestamp-backed SRT complete the workflow.

**Inferred audiences, not recruited research participants:** interviewers working with multi-speaker recordings, bilingual Arabic/English users, content teams exporting text/subtitles, and operators configuring providers. Their actual task frequency, vocabulary, quality thresholds and purchasing behavior have not been researched in this engagement.

## Existing scope

| Layer | Implemented responsibility | Important limit |
| --- | --- | --- |
| Input | Local file, MediaRecorder microphone, direct audio/video URL | Not a web-page/YouTube importer or live streaming transcription |
| Orchestration | Configured engine order, pinned engine, retry classification | A fallback is another potentially billable provider request |
| Output | Editable text, speaker/timeline presentation, copy/TXT/SRT | Text edits are not a synchronized subtitle editor |
| Personalization | English/Arabic and LTR/RTL, light/dark/system | Browser and assistive-technology behavior still needs testing |
| Settings | Visitor key save/test, per-browser disable, masked status | The app has no account-based user authorization layer |
| Usage/PWA | Account/local counters, install UI and offline shell | Counters are not billing records; recognition requires a network |

## Evidence boundary

Baseline is `456bccaec494c93491f0115b213dcc005098f912`. Public text from eight production routes was fetched on 2026-11-03; the deployed commit is unknown. Text extraction proves wording, not hydrated layout, successful credentials, recognition or mobile usability. Current studio extraction reports 25 MB inline and 25 MB via storage. Source defaults differ under Vercel (4 MB inline; optional 300 MB Blob), so neither evidence source is silently substituted for the other.

Fresh local checks: installation passed; unit tests passed 121/127 with built-in keys disabled; lint reported one error and one warning; build stopped at external Google Fonts access; registry audit reported 22 vulnerable nodes. These are diagnostic results, not a release certificate. Detailed interpretation and complete raw outputs are in Quality & Audit and Evidence.

## Delivery scope

This is a new reconstruction, not recovery of a vanished ZIP or original bytes. It contains nine internal references, five quality reports, separate portfolio/Behance drafts, seven Mermaid sources, a screenshot capture plan and fresh logs. Screenshots, rendered diagrams, real recognition tests, owner-approved authorship and outcome metrics remain pending. Application source/configuration and production settings/data were not changed. Only this documentation folder is intended for the authorized commit/push.

## Source evidence

- [package.json:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/package.json#L1-L25)
- [lib/engines-meta.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/lib/engines-meta.js#L1-L25)
- [app/api/transcribe/route.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/app/api/transcribe/route.js#L1-L25)
- [app/api/health/route.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/app/api/health/route.js#L1-L25)
- [public/sw.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/public/sw.js#L1-L25)
