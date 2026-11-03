# Fresh raw execution logs

These files are newly captured complete command outputs from 2026-11-03, not recovered historical logs. stdout/stderr were combined except audit JSON, whose stderr is separate and validly empty. Each command has a matching .exit-code file. Exit 1 indicates the specific diagnostic failed, not that this documentation generator failed.

- install.log: npm ci --ignore-scripts --no-audit --no-fund (0).
- unit-tests.log: DISABLE_BUILTIN_KEYS=1 npm test (1).
- lint.log: DISABLE_BUILTIN_KEYS=1 npm run lint (1).
- build.log: DISABLE_BUILTIN_KEYS=1 NEXT_TELEMETRY_DISABLED=1 npm run build (1).
- dependency-audit.json / dependency-audit.stderr.log: npm audit --json (1).
- dependency-tree.log: npm ls next @vercel/blob @vercel/oidc @vercel/cli-config undici zod minimatch --all (0).

Working directory was the source checkout, before documentation generation. Node v22.22.3, npm 10.9.8. No real key test/paid recognition/production mutation was triggered. Built-in defaults remained disabled for executed app checks; four unit failures specifically expect those defaults to be enabled. Review the interpretation in Build-and-Test-Results before using totals as a release gate.

No screenshots or raw complete production-page snapshots are hidden in this folder. Logs can contain harmless local paths/framework traces; source/default credential non-reproduction is checked before commit. Generated dependencies/build output are excluded from this package.
