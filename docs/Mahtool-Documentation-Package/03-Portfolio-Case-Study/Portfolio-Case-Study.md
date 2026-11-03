# Mahtool — portfolio case study draft

> Editorial draft based on an existing implementation. Owner approval, real visuals and contribution verification are required before publication. This is not a first-person claim of authorship.

## Overview

Mahtool is a bilingual transcription workspace that brings audio input, speech-engine selection and editable output into one browser flow. Its central idea is continuity: when a provider cannot complete a request, a server-side orchestration layer can try another eligible engine and explain what happened.

## The challenge

Speech transcription is more than sending a file to a model. People need to understand what to upload, which language to select, whether the system is still working and what they can do with the result. Provider quotas and failures introduce a second layer of complexity. The product translates those concerns into a source → configuration → output structure, with automatic and manual controls.

This challenge statement is inferred from the implementation and product messaging. No interviews or original discovery research were available for verification.

## Existing product response

The workspace accepts a local recording, browser microphone capture or direct media link. Engine selection can remain automatic or be pinned; language hints and speaker mode help describe the input. The response is normalized across providers, allowing a consistent result view with engine identity, attempt information and editable transcript content. Copy and TXT support reuse; SRT uses provider timing segments where available.

The interface supports English and Arabic with direction-aware layout and light, dark or system themes. The implemented visual vocabulary combines display typography, layered surfaces and a violet primary accent. Signal colors distinguish activity and feedback. These are descriptions of code, not claims that a documented design process produced them.

## Product decisions worth showing

**Keep acquisition familiar.** File, microphone and link address different starting points while converging on the same task.

**Expose control without requiring provider expertise.** Automatic selection reduces setup decisions; manual selection and attempt information preserve visibility when needed. Runtime order must be described accurately rather than inferred from static marketing cards.

**Make the output useful.** Editing and export connect recognition to the user's next task. Free-text editing and timed subtitles are currently different data paths; public presentation should not imply a synchronized subtitle editor.

**Treat bilingual support as structure.** Direction, typography and mixed-language numbers/engine IDs require more than translated labels. Actual Arabic usability and accessibility still need recorded tasks.

## Evidence and honest limitations

The implemented workflow, source structure and eight fresh public text observations support this narrative. They do not establish recognition accuracy, user satisfaction, adoption, time saved or commercial impact. No quantitative improvement is claimed. Real screens remain to be captured; no mock is presented as a product screenshot.

Review identified opportunities to improve consistency of provider/limit guidance, clarity of device/provider data handling and preservation of manual edits. Detailed operational findings belong to the internal audit, not the public story.

## Roles and credits — owner to confirm

The studio labels Mahmoud Aboalazm as its owner/customer; the Maker page identifies Mustafa Aboalazm. Neither establishes the author's personal contribution to research, design or code. Before publication, confirm owner/client naming, exact responsibilities, collaborators, timeline, original versus inherited work, and permission to use assets/typography/screens.

## Outcome and reflection

The demonstrable outcome is an existing end-to-end product structure with several acquisition methods, multiple providers and bilingual presentation. Its wider value has not been measured in this audit. A publishable case study should add approved contribution details and real evidence, then describe any later improvements only after they are implemented and evaluated.

**Visual plan:** hero workspace; three-stage task flow; source variants; engine/attempt explanation; editable transcript; Arabic and light-theme pair; export boundary; closing architecture illustration. Each must be clearly labeled as a real capture or explanatory diagram, not blended into invented research evidence.
