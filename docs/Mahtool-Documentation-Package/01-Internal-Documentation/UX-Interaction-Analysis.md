# UX and interaction analysis

## What can be concluded

Source reveals controls, state branches and intended feedback. Fresh text extraction verifies user-facing labels but not spacing, responsiveness, focus behavior or animation. This report is an expert inspection, not a usability-test result.

## Input and configuration

A source/configuration/output split gives the workflow a comprehensible order. Upload, microphone and link avoid forcing a single acquisition method. Runtime health enables deployment-aware controls. Risks remain: long provider descriptions compete with the primary action, format/size guidance differs between help and execution, and flattened panels cannot establish actual tab semantics. Verify keyboard switching, drag/drop alternative, microphone permissions, error focus and preserved source state.

Engine selection exposes automatic and manual control. Automatic fallback should disclose that providers may change and more than one charge may occur. When a pinned engine is unavailable, explain both the missing credential and the route to settings. Language hint and interface locale are different concepts; Arabic UI must not silently imply Arabic recognition mode. Auto/multiple speaker choices request the same diarization flag and should not promise stronger inference than a provider supplies.

## Status, recovery and output

The studio separates upload progress from recognition timing where observable and has idle/running/done/error branches. Timing is not an SLA or provider progress percentage. Show which stage can be canceled and whether server/vendor work may continue. Preserve actionable attempt codes without raw credentials/provider payloads. Retry should not accidentally discard edits or re-use an inaccessible staged URL.

Editing text with word counts supports review. Copy confirmation is transient; announce it accessibly and verify failure feedback. TXT reflects edits but SRT derives from segments: describe this explicitly near export, disable unavailable timing output, and consider a later synchronized editor. Speaker/timeline toggles and new runs can regenerate content, so add a dirty-edit warning rather than assuming presentation changes are harmless.

## Bilingual, theme and accessibility checks

Existing root lang/dir, Arabic font preference, focus-visible rules and reduced-motion CSS are positive implementation signals, not WCAG certification. Check mixed RTL/LTR engine IDs, URLs and counters; textarea reading order; focus after clear/cancel; live-region announcements; native recording controls; heading/landmark structure; contrast for muted text and disabled buttons in both themes. CSS reduced-motion rules do not automatically cover JavaScript smooth scroll behavior.

## Prioritized recommendations

1. Reconcile limit/order/model/privacy language with actual configuration.
2. Replace literal `{action}` and incomplete cache duration labels.
3. Make edit/export boundaries and cancellation consequences explicit.
4. Reduce emphasis of usage/install prompts during the main task.
5. Run a repeatable desktop/mobile/Arabic/keyboard matrix before visual sign-off.

Acceptance evidence should be real screen recordings/screenshots plus task notes using synthetic audio; no completion rate or satisfaction score is available today.

## Source evidence

- [components/AudioSourceCard.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/components/AudioSourceCard.js#L1-L25)
- [components/EngineControls.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/components/EngineControls.js#L1-L25)
- [components/TranscriptPanel.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/components/TranscriptPanel.js#L1-L25)
- [components/TranscriptionStudio.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/components/TranscriptionStudio.js#L1-L25)
- [app/globals.css:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/app/globals.css#L1-L25)
