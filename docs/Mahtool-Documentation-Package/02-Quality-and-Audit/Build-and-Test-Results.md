# Fresh build and test results

## Actual execution, not historical recovery

Collected 2026-11-03 in a fresh sandbox checkout of the pinned baseline. Node v22.22.3, npm 10.9.8. The original archive and older logs were unavailable; these outputs were newly generated. Each command's complete stdout/stderr and separate exit code are retained in [Raw-Logs](../05-Evidence/Raw-Logs/README.md). No paid calls, key validation or production mutations were performed.

| Command | Exit | Actual result / interpretation |
| --- | --- | --- |
| npm ci --ignore-scripts --no-audit --no-fund | 0 | Installed locked dependencies; lifecycle scripts deliberately disabled |
| DISABLE_BUILTIN_KEYS=1 npm test | 1 | 127 tests; 121 pass, 6 fail; no skipped/cancelled tests |
| DISABLE_BUILTIN_KEYS=1 npm run lint | 1 | One error: studio render-time timingRef read; one warning: SRT memo speakers dependency |
| DISABLE_BUILTIN_KEYS=1 NEXT_TELEMETRY_DISABLED=1 npm run build | 1 | Two Google Fonts fetch errors: IBM Plex Sans and IBM Plex Sans Arabic |
| npm audit --json | 1 | 22 affected nodes: 1 critical / 5 high / 16 moderate; reachability unproven |
| npm ls next @vercel/blob @vercel/oidc @vercel/cli-config undici zod minimatch --all | 0 | Installed dependency path snapshot |

## Six unit failures explained

1. credentials.test.mjs:267 — built-in default shape expectation.
2. credentials.test.mjs:278 — built-in masking expectation.
3. credentials.test.mjs:292 — personal/default precedence fixture.
4. credentials.test.mjs:301 — defaults reach configuration expectation.
5. theme.test.mjs:77 — Maker hard-coded palette violates scan policy.
6. transcript-format.test.mjs:55 — fallback sentence output contains an extra space.

The first four are sensitive to the deliberate DISABLE_BUILTIN_KEYS=1 safety policy. This is not a standard-config green/red release verdict or evidence of four production bugs. The suite was not rerun with source defaults enabled. The other two are independently actionable correctness/policy discrepancies. See F12/F13 and raw failure assertions.

## Build blocker and unexecuted checks

The network environment cannot obtain the two next/font/google families. No font mocks, source patches or build bypasses were introduced to manufacture success. Failure at that stage does not prove deployed build failure or rule out later compilation problems. The production-build-dependent mocked HTTP e2e harness was not executed. No real-provider recognition, browser interaction, offline install or accessibility task was executed.

## Reproduction and release gate

Run the exact commands above in a clean controlled checkout; never use real deployment keys for fixtures. For a safe green unit gate, revise configuration-dependent tests through an approved source change, then separately test missing/default-disabled semantics. Build in an approved font-access/self-hosted-font environment, review lint fixes and mock provider scenarios, then run browser/RTL/retention checks. A future successful build or audit must be recorded as a separate run rather than overwriting these failed logs.

## Source evidence

- [tests/credentials.test.mjs:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/tests/credentials.test.mjs#L1-L25)
- [tests/theme.test.mjs:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/tests/theme.test.mjs#L1-L25)
- [tests/transcript-format.test.mjs:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/tests/transcript-format.test.mjs#L1-L25)
- [tests/e2e.mjs:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/tests/e2e.mjs#L1-L25)
- [lib/fonts.js:L1–L25](https://github.com/3boalazm/MahmoudTC-tool/blob/456bccaec494c93491f0115b213dcc005098f912/lib/fonts.js#L1-L25)
