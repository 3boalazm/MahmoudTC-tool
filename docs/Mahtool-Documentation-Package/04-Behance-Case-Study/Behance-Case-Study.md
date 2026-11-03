# Mahtool — Behance editorial storyboard

> Fourteen-section draft, not a published project. Real captures and owner-approved role/timeline/outcomes remain pending. The copy describes an existing implementation and avoids unsupported first-person ownership.

## 01 — Cover

**Mahtool: audio to editable text, with a fallback plan.** Introduce the bilingual transcription workspace. Visual: one approved real desktop studio capture with a restrained title treatment. Do not present an invented screen as product evidence. Product naming and credit line await owner confirmation.

## 02 — The context

Transcription involves input quality, provider access, task feedback and reuse of the result. The product combines these concerns in one browser workspace. This framing is inferred from implementation, not an interview insight. Visual: a concise input → engines → output concept illustration, clearly labeled explanatory.

## 03 — The product challenge

A provider limit or failure should not force a user to learn another API. The workspace can classify recoverable failures and continue through eligible engines. Describe continuity as a design intent, not a measured uptime guarantee. Visual: one synthetic, annotated recovery scenario against mocks after verification.

## 04 — Audience and evidence

Candidate users include interviewers, bilingual content workers and teams preparing notes/subtitles. These are hypotheses, not recruited personas. Existing source and public text support the product account; user research, conversion and satisfaction metrics are unavailable. Visual: task needs rather than fabricated participant portraits or quotes.

## 05 — Experience structure

Show the source → configuration → output model. Source answers what to process; controls explain how; output supports correction and reuse. Supporting help/settings remain accessible without replacing the task. Visual: simplified navigation/journey diagram from the delivered Mermaid source, rendered and reviewed before publication.

## 06 — Three ways to begin

Local file, browser microphone and direct media URL converge on one request path. Clarify that recording is not live streaming recognition and media links are direct files, not arbitrary video-site pages. Visual: real empty/ready/recording/link states, without private audio or arbitrary decorative data.

## 07 — Engines and fallback

Automatic mode uses configured runtime order; manual mode can pin an engine. The successful result can expose which engine completed the task and why others failed. Avoid printing a static order as a universal truth or claiming guaranteed recovery. Visual: sanitized mock attempt trail after the HTTP scenario succeeds.

## 08 — Clear processing feedback

Upload and recognition have different observability. The implementation exposes stage/timing/cancel states, but elapsed time is not a completion percentage or SLA. Visual: actual running state and stage labels using synthetic input. Describe cancellation limits honestly; do not imply vendor jobs are always canceled with the browser request.

## 09 — Editable output

The result is intended as a workspace rather than a final immutable answer. Text can be corrected before copy/TXT; speaker and timeline controls support reading. Visual: approved synthetic transcript with a clearly labeled manual correction. Explain that preserving edits through presentation changes still needs validation.

## 10 — Export with boundaries

TXT uses the edited text; SRT uses timed provider segments. This matters when someone corrects a name or sentence. Visual: concise annotated export comparison, based on a real fixture, not a claim that free-text edits automatically realign subtitles. Missing timings should result in an honest unavailable state.

## 11 — Bilingual foundations

English/Arabic support includes direction-aware layout, Arabic typography and mixed-direction metrics. Show two equivalent states with matched content, theme and viewport so comparison is meaningful. Visual: actual approved Arabic and English captures. Do not label the product fully accessible before assistive-technology/device testing.

## 12 — Visual language

Layered canvas/surfaces, display headings, body sans and monospace metrics create the implemented hierarchy. Violet carries primary actions while signal colors communicate activity/errors. Light mode overrides shared tokens. Visual: verified token/type specimen and real UI detail; confirm font licensing before distributing type assets or claiming ownership.

## 13 — System behind the interface

The browser talks to same-origin Next routes; server adapters normalize four provider protocols. Larger input can use transient Blob staging when configured; the offline shell does not run speech recognition. Visual: one reviewed system diagram. Keep this high-level and truthful rather than publishing raw internal findings or security/test dumps.

## 14 — Outcome, learning and credits

The observable outcome is an implemented multi-input, multi-provider bilingual workspace. Adoption, accuracy, time savings and business impact are not established here. The review points to clearer runtime guidance, honest processing boundaries and safer editing behavior as next opportunities. Close with owner-approved names/roles/dates and real assets; withhold fabricated outcomes or personal authorship claims.

## Production handoff

Use the screenshot capture plan and Author Verification checklist as gates. Do not embed raw audit/build logs in the public project. Replace pending visuals only with actual captures or explicitly labeled conceptual diagrams. No Behance upload, artwork rendering or publication is included in this repository documentation push.
