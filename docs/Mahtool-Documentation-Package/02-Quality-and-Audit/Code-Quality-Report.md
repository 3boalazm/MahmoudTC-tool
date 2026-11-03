# Code quality and prioritized findings

## Classification and method

This is a source/text/tool audit, not penetration testing. Priority is analyst triage; registry severity is separately retained. Confirmed facts, automated warnings, environment blockers and unverified interactions are not interchangeable. Findings are recommendations, not changes applied. Production commit and upstream exploitation are unknown. Source values, contact details and account amounts are intentionally omitted.

## Findings register

| ID | Priority | Finding | Evidence class |
| --- | --- | --- | --- |
| F01 | Critical | Reversible provider defaults in tracked source | Confirmed sensitive-material exposure; validity untested |
| F02 | High | Account usage has no user authorization | Confirmed access-control design gap |
| F03 | High | Local rate limits are not a distributed spend boundary | Confirmed architecture limitation |
| F04 | High | Staged audio cleanup is not guaranteed | Confirmed control-flow gap; live retention unverified |
| F05 | High | Per-operation limits do not form one request deadline | Confirmed budget design gap |
| F06 | High | Blob vendor host matching is not ownership | Confirmed validation limitation; exploit untested |
| F07 | Medium | Public guidance drifts from executable configuration | Confirmed source/text inconsistency |
| F08 | Medium | Unresolved action placeholder in empty result | Confirmed public text and dictionary issue |
| F09 | Medium | Absolute privacy/key claims overstate implementation | Confirmed copy-to-architecture mismatch |
| F10 | Medium | Edited text and SRT can diverge | Confirmed output data-path mismatch |
| F11 | Medium | Presentation changes regenerate manual text | Confirmed state update risk |
| F12 | Low | Fallback sentence formatting inserts extra space | Confirmed unit failure |
| F13 | Low | Maker palette breaks repository policy test | Confirmed test/policy conflict |
| F14 | Low | Large orchestration modules and stale comments | Confirmed maintainability observation |
| F15 | Low | Reduced-motion behavior needs end-to-end validation | Unverified interaction hypothesis |
| F16 | Medium | Timing ref read during render | Confirmed automated lint error |
| F17 | Low | SRT memo omits speakers dependency | Confirmed automated lint warning |
| F18 | High | Dependency advisories need exposure-aware triage | Automated warning; applicability not proven |

### F01 — Reversible provider defaults in tracked source

**Priority:** Critical. **Class:** Confirmed sensitive-material exposure; validity untested.

**Evidence:** [lib/server/default-keys.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/lib/server/default-keys.js#L1-L25). Fresh tool/text evidence is indexed in [Evidence](../05-Evidence/Evidence-Index.md).

**Explanation / impact / limits:** Source contains encoded defaults that can be decoded; encoding is not secret management. A repository reader can recover them. Actual account validity was deliberately not tested.

**Recommendation:** Rotate/revoke affected credentials with the operator, remove defaults from source/history according to an approved procedure, and require explicit server configuration. No values are copied here.

### F02 — Account usage has no user authorization

**Priority:** High. **Class:** Confirmed access-control design gap.

**Evidence:** [app/api/usage/route.js:L30–L54](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/app/api/usage/route.js#L30-L54). Fresh tool/text evidence is indexed in [Evidence](../05-Evidence/Evidence-Index.md).

**Explanation / impact / limits:** Enabled usage permits same-origin or headerless clients, with rate limiting but no authenticated operator role. This can expose account business information; current production extraction shows generic cards, not proof that current API figures are populated.

**Recommendation:** Disable public usage or gate it behind verified operator authorization. Do not treat Sec-Fetch-Site as identity.

### F03 — Local rate limits are not a distributed spend boundary

**Priority:** High. **Class:** Confirmed architecture limitation.

**Evidence:** [lib/server/rate-limit.js:L13–L37](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/lib/server/rate-limit.js#L13-L37). Fresh tool/text evidence is indexed in [Evidence](../05-Evidence/Evidence-Index.md).

**Explanation / impact / limits:** Counters are in-process Maps keyed from proxy headers. Multiple instances/restarts can multiply/reset limits; public callers may consume shared provider access. No abuse or cost impact was induced.

**Recommendation:** Add authenticated entitlements, distributed quotas and spend monitoring; trust proxy identity only with a defined deployment boundary.

### F04 — Staged audio cleanup is not guaranteed

**Priority:** High. **Class:** Confirmed control-flow gap; live retention unverified.

**Evidence:** [app/api/transcribe/route.js:L483–L507](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/app/api/transcribe/route.js#L483-L507). Fresh tool/text evidence is indexed in [Evidence](../05-Evidence/Evidence-Index.md).

**Explanation / impact / limits:** Normal success/exhausted-chain paths release staged URLs, but an uploaded object can be abandoned before request submission or before a later early return. Cleanup itself is best-effort, and platform termination can interrupt it.

**Recommendation:** Track objects and ownership durably, use a finally path plus independent expiry/sweeper and deletion monitoring. Qualify privacy copy; never promise guaranteed deletion from this flow alone.

### F05 — Per-operation limits do not form one request deadline

**Priority:** High. **Class:** Confirmed budget design gap.

**Evidence:** [lib/server/config.js:L57–L81](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/lib/server/config.js#L57-L81). Fresh tool/text evidence is indexed in [Evidence](../05-Evidence/Evidence-Index.md).

**Explanation / impact / limits:** A provider request/poll can consume a clamped budget, then another operation/adapter starts. Download/upload/fallback can accumulate beyond the 90s route lifetime. No production timeout was triggered. The media-link fetch has its own shared timer; that is not a whole-transcription deadline.

**Recommendation:** Propagate one remaining-time deadline/abort signal through acquisition and every adapter, reserving headroom for cleanup and JSON response.

### F06 — Blob vendor host matching is not ownership

**Priority:** High. **Class:** Confirmed validation limitation; exploit untested.

**Evidence:** [lib/server/blob.js:L37–L60](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/lib/server/blob.js#L37-L60). Fresh tool/text evidence is indexed in [Evidence](../05-Evidence/Evidence-Index.md).

**Explanation / impact / limits:** The helper delegates to a vendor URL pattern. That rejects arbitrary destinations but does not prove the object belongs to this project, request or visitor. No cross-store access was attempted.

**Recommendation:** Bind issued uploads to request/user identity; validate the exact store and signed/recorded object capability before consuming or deleting.

### F07 — Public guidance drifts from executable configuration

**Priority:** Medium. **Class:** Confirmed source/text inconsistency.

**Evidence:** [app/api/transcribe/route.js:L72–L96](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/app/api/transcribe/route.js#L72-L96). Fresh tool/text evidence is indexed in [Evidence](../05-Evidence/Evidence-Index.md).

**Explanation / impact / limits:** Home/engines teach Deepgram first; actual default/runtime chain is AssemblyAI first. FAQ names Nova-2 and stale language behavior. Current studio says 25/25 MB; source Vercel defaults are 4/300 optional. Deployment revision remains unknown.

**Recommendation:** Generate provider/order/limits guidance from current metadata and health; reconcile privacy/language help with adapter behavior. Do not guess why deployment text differs.

### F08 — Unresolved action placeholder in empty result

**Priority:** Medium. **Class:** Confirmed public text and dictionary issue.

**Evidence:** [lib/i18n/dictionaries/en.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/lib/i18n/dictionaries/en.js#L1-L25). Fresh tool/text evidence is indexed in [Evidence](../05-Evidence/Evidence-Index.md).

**Explanation / impact / limits:** Fresh /studio text includes “press {action}.” The user cannot identify the intended action reliably from unresolved interpolation. Browser hydration was not tested.

**Recommendation:** Supply the translated action parameter at the rendering call; add locale interpolation coverage and inspect both English and Arabic states.

### F09 — Absolute privacy/key claims overstate implementation

**Priority:** Medium. **Class:** Confirmed copy-to-architecture mismatch.

**Evidence:** [lib/server/credentials.js:L43–L67](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/lib/server/credentials.js#L43-L67). Fresh tool/text evidence is indexed in [Evidence](../05-Evidence/Evidence-Index.md).

**Explanation / impact / limits:** Visitor keys reside in an httpOnly browser cookie, optional public Blob buffers exist, and provider jobs/logs are outside an absolute no-storage claim. HttpOnly is not universal XSS immunity. Provider retention is unverified.

**Recommendation:** Describe device/server/provider boundaries and best-effort staging cleanup accurately; obtain retention policy/legal approval before asserting guarantees.

### F10 — Edited text and SRT can diverge

**Priority:** Medium. **Class:** Confirmed output data-path mismatch.

**Evidence:** [components/TranscriptPanel.js:L92–L116](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/components/TranscriptPanel.js#L92-L116). Fresh tool/text evidence is indexed in [Evidence](../05-Evidence/Evidence-Index.md).

**Explanation / impact / limits:** Copy and TXT use textarea text; SRT is derived from result.segments. Editing a name in free text can leave subtitle content unchanged. No browser export fixture was executed.

**Recommendation:** Disclose the boundary beside export or implement synchronized timed-segment editing; add edit→TXT/SRT integration tests.

### F11 — Presentation changes regenerate manual text

**Priority:** Medium. **Class:** Confirmed state update risk.

**Evidence:** [components/TranscriptionStudio.js:L373–L397](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/components/TranscriptionStudio.js#L373-L397). Fresh tool/text evidence is indexed in [Evidence](../05-Evidence/Evidence-Index.md).

**Explanation / impact / limits:** Speaker/timeline options and speaker renaming can call setText from provider segments. Existing arbitrary edits can be replaced without dirty-edit confirmation. The exact user impact requires an interactive test.

**Recommendation:** Track dirty state, separate formatted view from editable content, and request confirmation before regeneration.

### F12 — Fallback sentence formatting inserts extra space

**Priority:** Low. **Class:** Confirmed unit failure.

**Evidence:** [lib/client/format.js:L100–L124](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/lib/client/format.js#L100-L124). Fresh tool/text evidence is indexed in [Evidence](../05-Evidence/Evidence-Index.md).

**Explanation / impact / limits:** The no-segment sentence grouping path joins slices that may already include whitespace; the fresh unit test expects One. Two! but receives a double space. This is not evidence of recognition inaccuracy.

**Recommendation:** Trim sentence slices before joining and add English/Arabic punctuation/empty-text regression cases.

### F13 — Maker palette breaks repository policy test

**Priority:** Low. **Class:** Confirmed test/policy conflict.

**Evidence:** [tests/theme.test.mjs:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/tests/theme.test.mjs#L1-L25). Fresh tool/text evidence is indexed in [Evidence](../05-Evidence/Evidence-Index.md).

**Explanation / impact / limits:** The hard-coded palette scan flags Maker component colors. This establishes a policy conflict, not measured contrast failure or proof the profile looks incorrect.

**Recommendation:** Decide scoped Maker tokens versus global-only policy, then update implementation/test intentionally. Measure contrast separately.

### F14 — Large orchestration modules and stale comments

**Priority:** Low. **Class:** Confirmed maintainability observation.

**Evidence:** [components/TranscriptionStudio.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/components/TranscriptionStudio.js#L1-L25). Fresh tool/text evidence is indexed in [Evidence](../05-Evidence/Evidence-Index.md).

**Explanation / impact / limits:** Studio state/timing/upload/speaker concerns and multiple adapters concentrate change surface; several comments still describe two-engine Nova-2 behavior. Module size alone is not a runtime defect.

**Recommendation:** Extract request-state and provider boundaries behind tests; update comments and package/help descriptions after behavior is agreed.

### F15 — Reduced-motion behavior needs end-to-end validation

**Priority:** Low. **Class:** Unverified interaction hypothesis.

**Evidence:** [components/TranscriptionStudio.js:L303–L327](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/components/TranscriptionStudio.js#L303-L327). Fresh tool/text evidence is indexed in [Evidence](../05-Evidence/Evidence-Index.md).

**Explanation / impact / limits:** CSS includes broad reduced-motion overrides, but success explicitly requests smooth JavaScript scrolling. Source is insufficient to certify accessibility or discomfort across devices.

**Recommendation:** Respect matchMedia for programmatic scrolling and run reduced-motion/device tasks. Do not report a confirmed WCAG failure without criterion-specific testing.

### F16 — Timing ref read during render

**Priority:** Medium. **Class:** Confirmed automated lint error.

**Evidence:** [components/TranscriptionStudio.js:L681–L705](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/components/TranscriptionStudio.js#L681-L705). Fresh tool/text evidence is indexed in [Evidence](../05-Evidence/Evidence-Index.md).

**Explanation / impact / limits:** react-hooks/refs reports a render-time ref read at line 681. A ref is not reactive state; displayed timing may not match intended render semantics. This is not a reproduced production incident.

**Recommendation:** Derive visible stage/timing from state or event-driven values and add regression coverage; rerun lint.

### F17 — SRT memo omits speakers dependency

**Priority:** Low. **Class:** Confirmed automated lint warning.

**Evidence:** [components/TranscriptPanel.js:L92–L116](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/components/TranscriptPanel.js#L92-L116). Fresh tool/text evidence is indexed in [Evidence](../05-Evidence/Evidence-Index.md).

**Explanation / impact / limits:** The memo callback closes over speakers but the dependency list omits it, risking stale speaker lookup when that collection changes independently. No stale-export browser scenario was executed.

**Recommendation:** Add the correct dependency or restructure stable derived labels, then test rename/merge/export behavior and rerun lint.

### F18 — Dependency advisories need exposure-aware triage

**Priority:** High. **Class:** Automated warning; applicability not proven.

**Evidence:** [package-lock.json:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/package-lock.json#L1-L25). Fresh tool/text evidence is indexed in [Evidence](../05-Evidence/Evidence-Index.md).

**Explanation / impact / limits:** Fresh npm audit reports 22 vulnerable nodes including a registry critical classification. Production/dev/transitive and metavulnerable nodes must be separated. Tool severity does not prove a reachable application exploit.

**Recommendation:** Review each advisory against enabled features and deployment; select supported fixes, rebuild and regression-test. Do not apply forced suggested downgrades blindly.

## Acceptance and ownership

Assign an operator/security owner to F01–F06/F18; product/content owner to F07–F11; engineering owner to F12–F17. These are proposed responsibilities, not verified team assignments. Close a finding only with code/config evidence and a rerun or recorded task, not merely an updated sentence. No issue tracker changes were made.
