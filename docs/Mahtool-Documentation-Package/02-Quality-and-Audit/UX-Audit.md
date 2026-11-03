# UX audit — task clarity and trust

## Scope and method

Expert inspection of source plus fresh read-only text from eight production routes, 2026-11-03. No real users, browser screenshots, focus tests, screen-reader sessions or recognition tasks were run. “Observed” here is text/source evidence, not a complete visual audit. IDs below refer to the detailed findings register.

| Topic | Evidence / finding | Risk | Recommended action / acceptance |
| --- | --- | --- | --- |
| Engine mental model | Default/runtime AssemblyAI-first versus Deepgram-first help (F07) | Users misinterpret who receives audio | Make effective order explicit; compare auto/pinned attempts against labels |
| Limits | Current studio 25/25 MB, source Vercel 4/optional 300; FAQ 25 inline (F07) | Upload failure and wrong recovery advice | Runtime-driven labels; test below/above each actual enabled cap |
| Empty state | Literal press {action} on fresh studio (F08) | Missing next-step instruction | Interpolation test in en/ar plus captured UI |
| Privacy | Keys server-only/zero-storage absolutes (F09) | Informed-consent/trust mismatch | Describe device cookie, provider processing and staged cleanup limits |
| Editing and export | Free text versus structured SRT (F10) | Export does not match correction | Disclose or synchronize; fixture edits reflected according to promised contract |
| Regeneration | Speaker/timeline operations re-create text (F11) | Lost edits | Dirty-state confirmation; cancel preserves content |
| Usage | Incomplete cached-for unit; generic cards in current text | Unclear capability/refresh expectations | Render explicit capability, duration unit and unavailable state |
| Access and motion | Structural labels/focus CSS exist; smooth scroll path (F15) | Unknown keyboard/AT/motion quality | Actual keyboard, SR and reduced-motion matrix |

## Positive implementation signals

Three acquisition methods, explicit source/configuration/output groups, normalized error attempts, editable output, provider-specific metadata, locale direction, theme tokens and an honest offline connection message all support a comprehensible workflow. These features have not been evaluated with participants, so “intuitive,” “accessible,” “faster” and “delightful” remain unproven judgments.

## Test plan

Use synthetic/public-domain short clips with known text. At 1440px desktop and 390px mobile, in English LTR and Arabic RTL, run: file→automatic→edit→copy/TXT; direct link→failure→corrected URL; microphone deny→allow→pause→stop; primary failure against mocks→attempt explanation; edit→toggle speakers/timeline→verify preservation; SRT export with/without timed segments; cancel→retry; settings disable→enable against fake/mock keys. Repeat both themes and system preference changes.

For accessibility, record tab order, focus movement after errors/clear, accessible names, status announcements, contrast on actual surfaces, 200% zoom/400% reflow, reduced motion and touch targets. Do not submit private recordings or deployment keys. Screenshots require sanitized amounts/profile details; record viewport/locale/theme/state/source revision and outcome, not a polished mock presented as evidence.

## Decision gate

Repair content/trust and edit-loss risks before presentation polish. Restrict usage as an operating-model issue, not merely a UI label. Capture real states before final Behance art direction. No numeric usability score, participant count, task success rate or improvement metric is available.

## Source evidence

- [components/TranscriptPanel.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/components/TranscriptPanel.js#L1-L25)
- [components/TranscriptionStudio.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/components/TranscriptionStudio.js#L1-L25)
- [components/AudioSourceCard.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/components/AudioSourceCard.js#L1-L25)
- [app/globals.css:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/app/globals.css#L1-L25)
