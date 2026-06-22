# Browser Extension Playbook Compliance

This document maps the shared browser-extension playbook to the current repository evidence for Defense Against Distractions.

It is not a replacement for the release checklist. It is an index for reviewers and future maintenance work: each row points to the files or commands that prove the claim, and it keeps the browser-load requirement separate from static repository checks.

## Verification Status

- Static repository, package, locale, store-copy, and release-archive checks are covered by `npm run verify:release` after `npm run package`.
- Package contents are covered by `npm run verify:package`.
- The target-browser load check is still a manual isolated check: `npm run verify:browser-load` must only be run in an isolated Chromium-based browser/profile where launching a browser cannot close active user windows or unsaved work.

## Compliance Matrix

| Playbook area | Current evidence |
| --- | --- |
| Product shape | `README.md` describes the concrete browser behavior: plan-based page blocking, Pomodoro, intent coherence, and UI cleanup. `manifest.json` uses the localized summary from `_locales/en/messages.json`. `src/popup.html` opens to operational status and controls, not marketing copy. |
| Repository shape | Required root files and folders are `README.md`, `LICENSE`, `PRIVACY.md`, `manifest.json`, `src/`, `assets/`, `docs/`, `store/`, `scripts/`, `test/`, and `_locales/`. `scripts/check-browser-extension-playbook.mjs` checks these roots. |
| Architecture shape | `docs/code-structure.md` and `docs/extension-modularization-playbook.md` document feature-first ownership, runtime entry points, platform wrappers, CSS entry boundaries, storage ownership, and test ownership. `npm run audit:file-sizes` and `npm run audit:folder-density` keep module and folder size budgets visible. |
| Store listing copy | `store/store-listing/*.txt` contains plain-text direct Chrome Web Store detailed-description bodies. `scripts/check-browser-extension-playbook.mjs` checks that listing files do not start with a title, field label, or extension name, include GPL/source footer, avoid inflated claims, and keep current product wording. |
| Localization | `_locales/*/messages.json`, `store/store-listing/*.txt`, and `docs/localization.md` define the runtime and store-listing localization workflow. `npm run verify:locales` checks message key coverage. `npm run verify:static-localization` checks extension-owned static HTML surfaces. RTL behavior is documented for Arabic, Persian, Hebrew, and Urdu. |
| License and source | `LICENSE` contains GPLv3 text. `package.json` uses `GPL-3.0-only`. `README.md` and store listing footers point to `https://github.com/molodchyk/Defense_against_Distractions`. |
| Support block | `README.md` contains the canonical Buy Me a Coffee and Patreon support block after privacy, license, and source information. Store listing files deliberately exclude donation links. |
| Privacy and permissions | `PRIVACY.md` lists exact permissions, storage areas, host access, network behavior, remote-code posture, analytics/tracking posture, sale/transfer posture, and reset controls. `docs/permission-audit.md` maps each manifest permission and deliberately unrequested broad permissions. `docs/chrome-web-store-privacy-form.md` contains StorePilot canonical keys. |
| No tracking or remote runtime behavior | `scripts/check-package-output.mjs` rejects remote executable code, unexpected remote network access, source maps, and recognized analytics/tracking/telemetry SDK signatures in generated runtime output. `npm run verify:package` runs the package gate against the built archive. |
| UI expectations | `src/popup.html` exposes quick status and controls. `src/options.html` exposes plan creation and settings surfaces. Destructive reset and diagnostic-clearing actions are localized, confirmed, and protected during active locked schedules. Blank states are included in `docs/release-checklist.md`. |
| Reviewer notes | `docs/reviewer-notes.md` documents file URL behavior, incognito behavior, browser-controlled API limits, MV3 restart behavior, package exclusions, and claim alignment. |
| Store media | `store/screenshots/` and `store/promo/` contain the reviewed Chrome Web Store media. `docs/store-media-review.md` records privacy boundaries and reviewed hashes. `scripts/check-browser-extension-playbook.mjs` checks dimensions and reviewed hashes. |
| Release checks | `docs/release-readiness.md` lists automated gates and manual gates. `docs/release-checklist.md` lists preflight, package, manual QA, regression, store asset, and publish checks. `scripts/verify-release.ps1` runs unit tests, manifest/import/playbook/audit/locale/static-localization/package/archive checks. |
| Release archives | `docs/release-readiness.md` defines the explicit `dist/` archive policy: only the current extension ZIP and current source ZIP may remain after packaging. `scripts/package-extension.ps1` resets `dist/` before packaging. `scripts/verify-release.ps1` rejects stale ZIPs and staging directories. |
| Codex protocol | `scripts/check-browser-extension-playbook.mjs` keeps product, privacy, license, store, localization, permission, package, release, and architecture claims synchronized through one repeatable gate. Future work should update docs and validation scripts when a playbook rule should remain true after an edit. |

## Known Non-Static Requirement

The shared playbook requires loading the unpacked extension in the target browser before release. That check is intentionally not part of `npm run verify:release`, because launching Chrome on an active workstation can close active browser windows or unsaved work.

Current release status remains "not fully browser-verified" until `npm run verify:browser-load` is run in a safe isolated browser environment, or the same target-browser load behavior is manually verified and recorded.
