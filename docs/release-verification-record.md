# Release Verification Record

This file records release verification status without replacing the detailed [Release Checklist](release-checklist.md).

Use it as the short release evidence log. Do not mark browser-only items as passed unless they were verified in an isolated Chromium-based browser/profile where launching a browser could not close active user windows or unsaved work.

## Current Release

- Version: `1.6.1`
- Extension archive: `dist/Defense_against_Distractions-v1.6.1-extension.zip`
- Source archive: `dist/Defense_against_Distractions-v1.6.1-source.zip`
- Static verification status: pending until the commands below are run for the final release package.
- Browser-load status: not fully browser-verified.
- Manual browser QA status: pending.

## Static Gate Evidence

Record the result after running these commands from the repository root:

| Gate | Expected evidence |
| --- | --- |
| `npm test` | Unit tests pass. |
| `npm run verify:manifest` | Manifest-referenced paths exist. |
| `npm run verify:imports` | Relative source imports resolve. |
| `npm run verify:locales` | Locale message keys and placeholders match. |
| `npm run verify:static-localization` | Static extension HTML surfaces route visible text through localization. |
| `npm run verify:playbook` | Repository, store, privacy, release, and architecture playbook checks pass. |
| `npm run audit:file-sizes` | File-size budgets pass. |
| `npm run audit:folder-density` | Folder-density budgets pass. |
| `npm run package` | Current extension and source ZIPs are generated in `dist/`. |
| `npm run verify:package` | Generated runtime archive passes package-output checks. |
| `npm run verify:release` | Full static release gate passes for the current version. |

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
