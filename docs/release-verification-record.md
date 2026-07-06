# Release Verification Record

This file records release verification status without replacing the detailed [Release Checklist](release-checklist.md).

Use it as the short release evidence log. Do not mark browser-only items as passed unless they were verified in an isolated Chromium-based browser/profile where launching a browser could not close active user windows or unsaved work.

## Current Release

- Version: `1.6.1`
- Extension archive: `dist/Defense_against_Distractions-v1.6.1-extension.zip`
- Source archive: `dist/Defense_against_Distractions-v1.6.1-source.zip`
- Static verification status: passed on 2026-07-06 for the current `1.6.1` package after `npm run verify:playbook`, `npm run verify:research`, `npm test`, `npm run package`, `npm run verify:package`, and `npm run verify:release`.
- Browser-load status: command not run on this active workstation; manual target-browser behavior user-reported working on 2026-07-06.
- Manual browser QA status: user-reported pass on 2026-07-06.

## Static Gate Evidence

Current result: passed on 2026-07-06 for version `1.6.1`.

Commands run from the repository root:

| Gate | Recorded evidence |
| --- | --- |
| `npm test` | Passed directly and through `npm run verify:release`; 542 unit tests passed on 2026-07-06. |
| `npm run verify:manifest` | Covered by `npm run verify:release`; manifest-referenced paths exist. |
| `npm run verify:imports` | Covered by `npm run verify:release`; 393 relative source imports resolve. |
| `npm run verify:locales` | Covered by `npm run verify:release`; 68 locales match 993 English message keys and 68 store listing files match `_locales`. |
| `npm run verify:static-localization` | Covered by `npm run verify:release`; 4 static extension HTML surfaces scanned. |
| `npm run verify:playbook` | Passed directly and through `npm run verify:release`; 68 localized store listings verified. |
| `npm run verify:research` | Passed directly and through `npm run verify:release`; 2 answered or implemented research syntheses verified and 1 revisit synthesis tracked. |
| `npm run audit:file-sizes` | Passed directly and through `npm run verify:release`; 417 budgeted files checked and no files exceed documented budgets. |
| `npm run audit:folder-density` | Passed directly and through `npm run verify:release`; 87 budgeted folders checked and no folders exceed documented budgets. |
| `npm run package` | Generated the current extension and source ZIPs in `dist/`. |
| `npm run verify:package` | Passed through `npm run verify:release`; 356 packaged runtime files scanned and 84 manifest references verified. |
| `npm run verify:release` | Passed for `Defense_against_Distractions-v1.6.1` on 2026-07-06. |

## Browser-Only Evidence

These checks must be recorded separately because they require an isolated browser environment:

| Gate | Current status | Evidence required before publishing |
| --- | --- | --- |
| `npm run verify:browser-load` | Not run | Command passes in an isolated Chromium-based browser/profile. |
| Manual QA from `docs/release-checklist.md` | User-reported pass on 2026-06-25 | Browser/profile details were not captured in chat; notable result is recorded below. |

## Manual QA Evidence

```text
Date: 2026-07-06
Version: 1.6.1
Browser and version: user-reported Chromium-based browser; exact version not captured in chat
Profile/environment: user-reported local browser extension environment; automated browser-load command not run on this active workstation
Extension package: dist/Defense_against_Distractions-v1.6.1-extension.zip / current unpacked 1.6.1 project state
Tester: project owner, user-reported
Automated static gates: passed on 2026-07-06 through npm run verify:release
Browser-load result: command not run
Manual QA result: user reported that manual QA looks working
Notes: Keep npm run verify:browser-load separate; only run it in a safe isolated browser/profile. DaD Select right-click quick add was added after the earlier manual QA pass and should be checked manually before publishing.
```

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
