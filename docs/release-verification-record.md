# Release Verification Record

This file records release verification status without replacing the detailed [Release Checklist](release-checklist.md).

Use it as the short release evidence log. Do not mark browser-only items as passed unless they were verified in an isolated Chromium-based browser/profile where launching a browser could not close active user windows or unsaved work.

## Current Release

- Version: `1.6.1`
- Extension archive: `dist/Defense_against_Distractions-v1.6.1-extension.zip`
- Source archive: `dist/Defense_against_Distractions-v1.6.1-source.zip`
- Static verification status: passed on 2026-06-25 for the current `1.6.1` package after `npm run verify:playbook`, `npm run audit:file-sizes`, `npm run audit:folder-density`, `npm run package`, `npm run verify:package`, and `npm run verify:release`.
- Browser-load status: not run on this active workstation; not fully browser-verified.
- Manual browser QA status: pending.

## Static Gate Evidence

Current result: passed on 2026-06-25 for version `1.6.1`.

Commands run from the repository root:

| Gate | Recorded evidence |
| --- | --- |
| `npm test` | Covered by `npm run verify:release`; 400 unit tests passed on 2026-06-25. |
| `npm run verify:manifest` | Covered by `npm run verify:release`; manifest-referenced paths exist. |
| `npm run verify:imports` | Covered by `npm run verify:release`; relative source imports resolve. |
| `npm run verify:locales` | Covered by `npm run verify:release`; 68 locales match the English message keys. |
| `npm run verify:static-localization` | Covered by `npm run verify:release`; 4 static extension HTML surfaces scanned. |
| `npm run verify:playbook` | Passed directly and through `npm run verify:release`; 68 localized store listings verified. |
| `npm run audit:file-sizes` | Passed directly and through `npm run verify:release`; no files exceed documented budgets. |
| `npm run audit:folder-density` | Passed directly and through `npm run verify:release`; no folders exceed documented budgets. |
| `npm run package` | Generated the current extension and source ZIPs in `dist/`. |
| `npm run verify:package` | Passed directly and through `npm run verify:release`; 337 packaged runtime files scanned and 76 manifest references verified. |
| `npm run verify:release` | Passed for `Defense_against_Distractions-v1.6.1` on 2026-06-25. |

## Browser-Only Evidence

These checks must be recorded separately because they require an isolated browser environment:

| Gate | Current status | Evidence required before publishing |
| --- | --- | --- |
| `npm run verify:browser-load` | Not fully browser-verified | Command passes in an isolated Chromium-based browser/profile. |
| Manual QA from `docs/release-checklist.md` | Pending | Browser, profile, date, tester, and notable pass/fail notes are recorded. |

## Manual QA Recording Format

When the isolated browser pass is complete, add a dated entry here:

```text
Date:
Version:
Browser and version:
Profile/environment:
Extension package:
Tester:
Automated static gates:
Browser-load result:
Manual QA result:
Notes:
```
