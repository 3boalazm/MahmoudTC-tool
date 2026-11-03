# Product discovery — evidence and hypotheses

## The problem visible in the implementation

Provider-specific credentials, quotas and failure modes make recognition fragile. The app centralizes input, request planning, error classification and export. Its differentiated intent is recoverability across four engines rather than a new speech model. This is an interpretation of implemented behavior and public messaging, not a validated market finding.

## Jobs to investigate

| Candidate job | Existing response | What must be learned |
| --- | --- | --- |
| Turn an interview into usable notes | Multi-speaker recognition, editable output | How much correction is acceptable; how speaker labels should be named |
| Reuse Arabic/English recordings | Language hints including ar-EG, bilingual UI | Which dialects matter and how accuracy should be measured |
| Keep working during provider failure | Automatic failover and attempt history | Whether users prefer predictable spend to automatic retries |
| Produce subtitles | SRT from provider segments | Required timing precision and edit synchronization expectations |
| Use personal provider access | Settings cookie and connection actions | Whether long-lived device key storage is acceptable |

## Constraints and product tensions

- **Reliability versus cost:** fallback can preserve a task while charging multiple services. No pooled entitlement or durable cost ceiling is implemented.
- **Privacy versus processing:** recognition forwards audio to external vendors. Large-file processing can temporarily expose an object through a public Blob URL. Absolute “nothing stored” wording is not justified by intent alone.
- **Simple controls versus capability differences:** single speaker disables diarization; auto and multiple both request diarization. Not all providers expose the same usage/confidence/timestamp fields.
- **One workspace versus deployment limits:** local defaults cannot safely describe all serverless deployments. Runtime health/configuration should be the source for UI limits.
- **Personal ownership versus authorship:** the studio names a customer/owner while the Maker page names a maker. Those labels do not establish who did research, design or engineering.

## Unknowns and proposed discovery

No interviews, analytics study, competitive benchmark or usability sessions were conducted. Recruit consented Arabic/English participants for short file-to-export tasks; ask how they currently handle retries, terminology, speaker naming and subtitles. Use public-domain or synthetic clips, never private recordings without permission. Record task completion, errors, correction effort and perceived control; do not invent baseline results now.

Operator questions: who pays for deployment keys; what auth/cost controls are required; what retention rules apply to each vendor; what uptime and deadline expectations are contractual? Owner questions: scope, dates, collaborators, intended market and permission to publish screens. Treat all answers as an approval gate before public case-study claims.

## Success criteria proposed, not achieved

Users should understand where audio goes, recognize whether fallback occurred, recover from an unsupported input, and export what they intended to edit. Operators should have durable authorization, spend limits and verifiable cleanup. Measure these against a recorded baseline after the test plan is approved; no conversion, time-saved or recognition-accuracy improvement is claimed in this package.

## Source evidence

- [components/EngineControls.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/components/EngineControls.js#L1-L25)
- [components/TranscriptPanel.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/components/TranscriptPanel.js#L1-L25)
- [lib/server/config.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/lib/server/config.js#L1-L25)
- [lib/engines-meta.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/lib/engines-meta.js#L1-L25)
