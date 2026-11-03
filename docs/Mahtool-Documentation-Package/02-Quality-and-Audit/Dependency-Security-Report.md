# Dependency security report

## Fresh registry result

`npm audit --json` exited 1. Metadata reports **22 vulnerable dependency nodes: 1 critical, 5 high, 16 moderate**. Counts include transitive/dev/metavulnerable entries and are not 22 independently proven production exploits. The raw JSON is preserved unchanged in Evidence. No npm audit fix, forced install, dependency update or source modification was performed.

## Dependency-level inventory

| Node | Registry severity | Direct | Via | Suggested fix (unapproved) |
| --- | --- | --- | --- | --- |
| @eslint-community/eslint-utils | moderate | False | eslint | `{"name": "eslint", "version": "4.0.0", "isSemVerMajor": true}` |
| @eslint/config-array | moderate | False | minimatch | `{"name": "eslint", "version": "4.0.0", "isSemVerMajor": true}` |
| @eslint/eslintrc | moderate | False | minimatch | `{"name": "eslint", "version": "4.0.0", "isSemVerMajor": true}` |
| @next/eslint-plugin-next | moderate | False | @eslint-community/eslint-utils | `{"name": "eslint-config-next", "version": "12.0.4", "isSemVerMajor": true}` |
| @typescript-eslint/eslint-plugin | moderate | False | @typescript-eslint/parser, @typescript-eslint/type-utils, @typescript-eslint/utils, eslint | `true` |
| @typescript-eslint/parser | moderate | False | @typescript-eslint/typescript-estree, eslint | `{"name": "eslint-config-next", "version": "12.0.4", "isSemVerMajor": true}` |
| @typescript-eslint/type-utils | moderate | False | @typescript-eslint/typescript-estree, @typescript-eslint/utils, eslint | `true` |
| @typescript-eslint/typescript-estree | moderate | False | minimatch | `{"name": "eslint-config-next", "version": "12.0.4", "isSemVerMajor": true}` |
| @typescript-eslint/utils | moderate | False | @eslint-community/eslint-utils, @typescript-eslint/typescript-estree, eslint | `{"name": "eslint-config-next", "version": "12.0.4", "isSemVerMajor": true}` |
| @vercel/blob | high | True | @vercel/oidc | `{"name": "@vercel/blob", "version": "2.4.0", "isSemVerMajor": true}` |
| @vercel/cli-config | high | False | zod | `{"name": "@vercel/blob", "version": "2.4.0", "isSemVerMajor": true}` |
| @vercel/oidc | high | False | @vercel/cli-config | `{"name": "@vercel/blob", "version": "2.4.0", "isSemVerMajor": true}` |
| eslint | moderate | True | @eslint-community/eslint-utils, @eslint/config-array, @eslint/eslintrc, minimatch | `{"name": "eslint", "version": "4.0.0", "isSemVerMajor": true}` |
| eslint-config-next | moderate | True | @next/eslint-plugin-next, eslint, eslint-plugin-import, eslint-plugin-jsx-a11y, eslint-plugin-react, typescript-eslint | `{"name": "eslint-config-next", "version": "12.0.4", "isSemVerMajor": true}` |
| eslint-plugin-import | moderate | False | minimatch | `{"name": "eslint-config-next", "version": "12.0.4", "isSemVerMajor": true}` |
| eslint-plugin-jsx-a11y | moderate | False | minimatch | `{"name": "eslint-config-next", "version": "12.0.4", "isSemVerMajor": true}` |
| eslint-plugin-react | moderate | False | minimatch | `true` |
| minimatch | moderate | False | minimatch has potential denial of service via globparts amplification | `{"name": "eslint", "version": "4.0.0", "isSemVerMajor": true}` |
| next | critical | True | Next.js: Unauthenticated Remote Code Execution in Image Optimization API when SVG files are used, Next.js: Denial of Service in App Router using Server Actions, Next.js: Unauthenticated Remote Code Execution in `use cache` functions returning typed arrays | `true` |
| typescript-eslint | moderate | False | @typescript-eslint/eslint-plugin, @typescript-eslint/parser, @typescript-eslint/typescript-estree, @typescript-eslint/utils, eslint | `{"name": "eslint-config-next", "version": "12.0.4", "isSemVerMajor": true}` |
| undici | high | False | undici vulnerable to Denial of Service via unbounded memory in the EventSource parser, undici vulnerable to Denial of Service via unhandled error on excessive content-encodings, undici vulnerable to TLS certificate validation bypass via dropped tls options in Agent, undici vulnerable to Denial of Service via TLS 1.2 certificate-changing renegotiation, undici WebSocket client vulnerable to Denial of Service via unbounded automatic PONG buffering | `true` |
| zod | high | False | Zod can exhaust memory while validating oversized constrained collections | `{"name": "@vercel/blob", "version": "2.4.0", "isSemVerMajor": true}` |

## Advisory references supplied by the registry

- [minimatch has potential denial of service via globparts amplification](https://github.com/advisories/GHSA-g3hv-75wg-m249) — moderate; affected range `<11.0.1`.
- [Next.js: Unauthenticated Remote Code Execution in Image Optimization API when SVG files are used](https://github.com/advisories/GHSA-2464-fhr4-w9xw) — critical; affected range `>=16.0.0 <=16.4.0`.
- [Next.js: Denial of Service in App Router using Server Actions](https://github.com/advisories/GHSA-p3m5-59mp-jv5r) — high; affected range `>=16.0.0 <=16.4.0`.
- [Next.js: Unauthenticated Remote Code Execution in `use cache` functions returning typed arrays](https://github.com/advisories/GHSA-673q-mjm6-r5xr) — critical; affected range `>=16.0.0 <=16.4.0`.
- [undici vulnerable to Denial of Service via unbounded memory in the EventSource parser](https://github.com/advisories/GHSA-4qv8-2p9j-2685) — moderate; affected range `>=6.5.0 <6.29.1`.
- [undici vulnerable to Denial of Service via unhandled error on excessive content-encodings](https://github.com/advisories/GHSA-xjj6-f33q-929c) — high; affected range `>=6.23.0 <6.29.1`.
- [undici vulnerable to TLS certificate validation bypass via dropped tls options in Agent](https://github.com/advisories/GHSA-2m5v-pch6-74hx) — high; affected range `>=4.0.0 <6.29.1`.
- [undici vulnerable to Denial of Service via TLS 1.2 certificate-changing renegotiation](https://github.com/advisories/GHSA-qrxm-fqhp-jwvm) — high; affected range `>=4.2.1 <6.29.1`.
- [undici WebSocket client vulnerable to Denial of Service via unbounded automatic PONG buffering](https://github.com/advisories/GHSA-9fm3-97px-rjf6) — moderate; affected range `>=5.15.0 <6.29.1`.
- [Zod can exhaust memory while validating oversized constrained collections](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) — high; affected range `<4.6.6`.

## Exposure-aware interpretation

Next is a direct production framework dependency; its advisories deserve prompt review, but applicability depends on the specific feature and request path. Registry titles include SVG optimization, Server Actions and typed-array/use-cache paths. Source inspection alone does not reproduce those exploit prerequisites; lack of an obvious component/string is not a safety proof. No exploit request or upstream-independent verification was attempted.

Blob is production code. Its transitive chain includes @vercel/oidc → @vercel/cli-config → an older Zod, and undici. A newer Zod elsewhere in the development tree does not remove that older nested node. ESLint/config-next and minimatch findings also involve development tooling; consider CI/untrusted-input exposure separately from public request execution. The complete npm ls snapshot is included to make those paths reviewable.

Some force suggestions are downgrades (including old ESLint/config-next majors and a lower Blob version), not approved compatible security remedies. Do not equate fixAvailable with a tested migration plan. Record an advisory-by-advisory applicability decision, select supported versions, inspect the lock diff, build, run regression/mocked HTTP tests and rerun the audit. Restrict public deployment or add compensating controls where justified until the operator accepts residual risk.

The documentation commit does not remediate any advisory. Registry time and installed graph can change; this report preserves one run rather than promising a current clean dependency set.

## Source evidence

- [package.json:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/package.json#L1-L25)
- [package-lock.json:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/package-lock.json#L1-L25)
- [lib/server/blob.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/lib/server/blob.js#L1-L25)
- [app/api/blob/upload/route.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/app/api/blob/upload/route.js#L1-L25)
