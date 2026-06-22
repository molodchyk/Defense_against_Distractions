# Browser Extension Playbook Requirements

This ledger expands the shared browser-extension playbook into concrete requirements for this repository. It is intentionally more granular than `docs/browser-extension-playbook-compliance.md`: the compliance document indexes areas, while this file tracks the individual obligations that must stay true.

Status meanings:

- Static evidence passed: covered by repository files, package archives, and non-browser checks.
- Browser-only pending: requires isolated target-browser loading or manual browser QA.

## Product Shape

| Requirement | Current evidence | Status |
| --- | --- | --- |
| Name describes concrete browser behavior. | `README.md`, `manifest.json`, and `_locales/en/messages.json` use Defense Against Distractions for plan-based page blocking, Pomodoro, intent coherence, and UI cleanup. | Static evidence passed |
| Summary says what changes for the user in one sentence. | `_locales/en/messages.json` `description.message` and `package.json` describe plans that block pages by keywords, schedules, Pomodoro state, intent coherence, and UI cleanup. | Static evidence passed |
| First screen performs the core job. | `src/popup.html` opens to protection status, current page, focus state, Pomodoro, intent recovery, diagnostics, and actions. | Static evidence passed |
| Permissions are minimal and explainable. | `manifest.json`, `PRIVACY.md`, `docs/permission-audit.md`, and `docs/chrome-web-store-privacy-form.md` list and justify `storage`, `alarms`, `downloads`, `activeTab`, `idle`, `webNavigation`, and audited content-script host access. | Static evidence passed |
| Avoid analytics, remote calls, search changes, dashboards, and broad host permissions unless required. | `PRIVACY.md`, `docs/permission-audit.md`, `scripts/check-package-output.mjs`, and `npm run verify:package` cover no analytics, telemetry, remote executable code, unexpected remote network access, search overrides, OAuth, or external messaging. Broad host access is limited to the audited content-script and web-accessible-resource surfaces required for local page protection. | Static evidence passed |
| Give users a visible reset path before uninstall. | `README.md`, `PRIVACY.md`, `src/options.html`, and `src/js/options/storageTransfer.js` document and implement Reset extension data with confirmation and protected-schedule lockout. | Static evidence passed |

## Repository Shape

| Requirement | Current evidence | Status |
| --- | --- | --- |
| README explains product goal, load-unpacked steps, checks, privacy posture, license, and source URL. | `README.md`; guarded by `scripts/check-browser-extension-playbook.mjs`. | Static evidence passed |
| License file contains full GPLv3 text. | `LICENSE`; guarded by `scripts/check-browser-extension-playbook.mjs`. | Static evidence passed |
| Privacy policy explains stored data, network behavior, permissions, and sale/sharing posture. | `PRIVACY.md`; guarded by `scripts/check-browser-extension-playbook.mjs`. | Static evidence passed |
| Manifest stays small and auditable. | `manifest.json`, `docs/permission-audit.md`, and manifest-key checks in `scripts/check-browser-extension-playbook.mjs`. | Static evidence passed |
| Human-authored source lives in `src/`; icons and packaged static assets live in `assets/`. | `src/`, `assets/icons/`, `manifest.json`, and package verification. | Static evidence passed |
| Reviewer notes, privacy form answers, release notes, and decision records live in `docs/`. | `docs/reviewer-notes.md`, `docs/chrome-web-store-privacy-form.md`, `docs/release-notes.md`, and `docs/decision-records.md`. | Static evidence passed |
| Browser-store copy and media live under `store/`. | `store/store-listing/`, `store/screenshots/`, `store/promo/`, and `docs/store-media-review.md`. | Static evidence passed |
| Chrome Web Store automation files follow the StorePilot project reference. | `docs/storepilot-automation.md`, `docs/chrome-web-store-privacy-form.md`, `docs/chrome-web-store-additional-fields.md`, and `docs/chrome-web-store-category.md`; guarded by StorePilot tests. | Static evidence passed |
| Scripts contain repeatable validation and packaging commands. | `package.json`, `scripts/`, `npm run package`, `npm run verify:package`, and `npm run verify:release`. | Static evidence passed |
| Tests cover pure logic and migration-sensitive behavior. | `test/` plus `npm test` through `npm run verify:release`. | Static evidence passed |
| Generated release output contains only current package ZIPs. | `docs/release-readiness.md`, `scripts/package-extension.ps1`, and `scripts/verify-release.ps1`. | Static evidence passed |

## Store Listing, Localization, And License

| Requirement | Current evidence | Status |
| --- | --- | --- |
| Store copy is direct, concrete, free of inflated claims, and stored as direct body text. | `store/store-listing/*.txt`; checked for title, field-label, Markdown, stale-version, donation-link, and inflated-claim patterns. `docs/claim-traceability.md` maps visible claims to proof gates. | Static evidence passed |
| Store listing includes inputs, privacy boundaries, examples, features, browser notes, and open-source footer. | English listing variants are checked for plans, allowed websites, Pomodoro, intent coherence, local processing, remote server wording, examples, current-version notes, incognito and file URL notes, and GPL/source footer. | Static evidence passed |
| Localized UI and store listing workflow follows `docs/localization.md`. | `_locales/`, `store/store-listing/`, `docs/localization.md`, `npm run verify:locales`, and `npm run verify:static-localization`. | Static evidence passed |
| Right-to-left language support is documented and checked. | `docs/localization.md`, UI language helpers, RTL CSS tests, Arabic/Persian/Hebrew/Urdu references, and static localization checks. | Static evidence passed |
| GPL-3.0 appears in `LICENSE`, `package.json`, README, and store listing footer. | `LICENSE`, `package.json`, `README.md`, `store/store-listing/*.txt`; guarded by playbook and release checks. | Static evidence passed |
| README support block uses the canonical donation links and store listings omit donation links. | `README.md` and store listing guards. | Static evidence passed |

## Privacy, UI, Review, And Release

| Requirement | Current evidence | Status |
| --- | --- | --- |
| Privacy copy lists exact permissions and why each exists. | `PRIVACY.md`, `docs/permission-audit.md`, and StorePilot privacy keys. | Static evidence passed |
| Privacy copy explains sync, local, session, and managed storage. | `PRIVACY.md` and `docs/storage-ownership.md`. | Static evidence passed |
| Privacy copy states network, analytics, ads, tracking, content-script, and remote-code posture. | `PRIVACY.md`, `docs/reviewer-notes.md`, `scripts/check-package-output.mjs`, and `npm run verify:package`. | Static evidence passed |
| Privacy policy stays aligned with manifest and package output. | `scripts/check-browser-extension-playbook.mjs`, `scripts/verify-release.ps1`, and package verification. | Static evidence passed |
| Options expose the main setting immediately and popup supports quick status/actions. | `src/options.html`, `src/popup.html`, and release checklist manual QA. | Static evidence passed |
| Destructive actions are explicit and blank states are intentional. | Reset/diagnostic-clear confirmation tests and `docs/release-checklist.md`. | Static evidence passed |
| File URL, incognito, browser-controlled behavior, reviewer limitations, and package contents are documented. | `docs/reviewer-notes.md`. | Static evidence passed |
| Screenshots stay consistent with current UI and store copy. | `store/screenshots/`, `store/promo/`, the consistency map in `docs/store-media-review.md`, and media hash checks. | Static evidence passed |
| Release checks validate manifest paths, icons, screenshots, unit tests, package output, stale `dist/` artifacts, privacy alignment, and store listing footer. | `npm run package`, `npm run verify:package`, `npm run verify:release`, `docs/release-readiness.md`, and `docs/release-verification-record.md`. | Static evidence passed |
| Load the unpacked extension in the target browser before publishing. | `npm run verify:browser-load`, `scripts/check-unpacked-extension-load.ps1`, `docs/release-checklist.md`, and `docs/release-verification-record.md`. This must only run in an isolated browser/profile. | Browser-only pending |

## Codex Protocol Evidence

| Requirement | Current evidence | Status |
| --- | --- | --- |
| Read local README, manifest, privacy policy, store copy, localization docs, and project playbooks before changing release-facing behavior. | Required in the shared playbook; current work uses `scripts/check-browser-extension-playbook.mjs` as the repeatable evidence gate. | Static evidence passed |
| Preserve existing uncommitted user changes. | Worktree status is checked before edits. | Static evidence passed |
| Keep claims synchronized across README, store listing, privacy docs, manifest, and package metadata. | `npm run verify:playbook` and `npm run verify:release`. | Static evidence passed |
| Add or update validation scripts when a rule should remain true. | Playbook helpers under `scripts/playbook/` and tests under `test/`. | Static evidence passed |
| Run smallest useful checks before reporting completion. | Focused tests are run before broader non-browser gates; browser-load remains isolated and pending. | Static evidence passed |
