# Design system — implemented reference

## Visual foundations

This is a code-extracted system inventory, not a supplied Figma library. Tailwind v4 theme variables define canvas/surface depth, ink hierarchy, iris primary actions and mint/amber/rose signals. Light mode overrides the same tokens rather than switching every component manually. The following values are extracted from app/globals.css in the audited baseline; they are not proposed redesign colors.

| Token | Dark | Light |
| --- | --- | --- |
| `--color-canvas` | `#090b0f` | `#f6f7fb` |
| `--color-surface-1` | `#0e1117` | `#ffffff` |
| `--color-surface-2` | `#12161d` | `#f1f3fa` |
| `--color-surface-3` | `#1a2029` | `#e5e8f4` |
| `--color-ink-100` | `#f5f7fa` | `#0f1424` |
| `--color-ink-200` | `#d3d9e2` | `#2a3350` |
| `--color-ink-300` | `#a6afbc` | `#495471` |
| `--color-ink-400` | `#7f8896` | `#697491` |
| `--color-ink-500` | `#5c6572` | `#8b94ac` |
| `--color-iris-300` | `#9b7bff` | `#564fe0` |
| `--color-iris-400` | `#7f65ff` | `#5b52ea` |
| `--color-iris-500` | `#6a4cff` | `#5b48e8` |
| `--color-iris-600` | `#5638e6` | `#4a3ad4` |
| `--color-iris-700` | `#4529c2` | `#3728a4` |
| `--color-mint-400` | `#54d6c7` | `#079a7a` |
| `--color-mint-500` | `#3bbfb0` | `#067f65` |
| `--color-amber-400` | `#f5b971` | `#b3761a` |
| `--color-amber-500` | `#e19e4e` | `#96590d` |
| `--color-rose-400` | `#ff7d8a` | `#d33a5c` |
| `--color-rose-500` | `#ef5a6b` | `#b81f44` |

## Typography

- Display headings: local Thmanyah Serif Display, weights 300/400/500/700/900 via next/font/local.
- Body: IBM Plex Sans Latin, weights 300–700; Arabic preference uses IBM Plex Sans Arabic at the same range. Both are fetched through next/font/google at build time.
- Numbers/code: Geist Mono from the installed font package, with system monospace fallbacks.
- Root direction changes the sans/display fallback order. Mixed-direction metrics have an explicit LTR utility.

Actual font licensing, commercial/public case-study rights and production font loading were not verified. The fresh local build failed while fetching the two Google families; that is an environmental constraint, not proof the deployed fonts fail.

## Geometry and interaction grammar

The custom 4xl radius is 1.75rem. Panels combine rounded surfaces, borders, shadows and glass effects; control families use smaller rounded rectangles. Responsive utility prefixes adjust padding, layout and type across the shell/studio. Treat these as component-local conventions rather than claiming a complete documented spacing scale exists. Focus-visible styles and disabled opacity/cursor treatments exist; contrast must be measured against actual composited surfaces.

| Family / source | Variants and states | Intended use / audit concern |
| --- | --- | --- |
| AudioSourceCard | File/record/link; empty, decoding, ready, invalid; drag/drop | Acquisition with browse alternative; test keyboard and permissions |
| EngineControls | Auto/pinned, availability, fallback, language, speaker mode | Separate UI locale from recognition locale; no capability overpromises |
| TranscriptPanel | Idle/running/error/done; copied, editable, export disabled | Editing vs SRT mismatch; live announcements and focus pending |
| CredentialsPanel | Deployment/personal/disabled; save/test/error | Masking is not proof of key validity or env-only origin |
| UsagePanel | Loading, no API, local/provider report, unavailable | Restrict business data; do not invent remaining minutes |
| Theme/Language controls | System/light/dark; en/ar | Persistent preferences; actual screen-reader labeling pending |
| InstallApp | Available/prompted/dismissed/platform instructions | Do not equate installability with offline recognition |

## Motion and responsiveness

Rise is 0.45s; shimmer 1.6s; halo 2.4s; bar 1.05s. CSS has reduced-motion overrides for several animations and hover lift. Verify all JS-triggered scrolling and dynamic meter effects separately. Safe-area padding supports notched installed contexts; responsive behavior still needs real 390px/1440px captures and Arabic overflow tests.

## Governance gaps

Maker-specific hard-coded palette values conflict with the repository's no-hardcoded-color test. Decide whether this profile deliberately owns a scoped subtheme or should adopt global tokens. Add a component/state gallery and measured contrast documentation after source policy is resolved; do not report an approved design-system audit from source inventory alone.

## Source evidence

- [app/globals.css:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/app/globals.css#L1-L25)
- [lib/fonts.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/lib/fonts.js#L1-L25)
- [app/layout.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/app/layout.js#L1-L25)
- [components/AudioSourceCard.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/components/AudioSourceCard.js#L1-L25)
- [components/TranscriptPanel.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/components/TranscriptPanel.js#L1-L25)
- [app/maker/MakerContent.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/app/maker/MakerContent.js#L1-L25)
