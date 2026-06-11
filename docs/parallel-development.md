# Parallel Development Coordination

This document is the shared coordination file for simultaneous development on DaD. Both developers should read it before starting work and update it when ownership, active tasks, or risk boundaries change.

## Current Rule

One developer owns one area at a time. Do not edit another developer's owned files unless the owner has committed and pushed their checkpoint or explicitly hands the area over.

Keep commits small, verified, and pushed. Prefer behavior-neutral structure commits before behavior changes.

Developer 1 is responsible for keeping this document current. If the active ownership, next task, blocked area, or shared understanding changes, Developer 1 should update this file in the same checkpoint that changes the project state.

This file is also the shared communication place for coordination misunderstandings, step-ins, and handoffs. If chat context is unclear, this document is the authoritative local coordination record.

## Protected Invariants

- Chrome extension content scripts are classic scripts loaded by `manifest.json` in order. Path moves must preserve that order.
- Storage keys are user data contracts. Do not rename keys without a migration and tests.
- Locked or forced schedules are critical protection data. Changes that can weaken them need tests and explicit review.
- Pomodoro strict breaks must block pages during required rest and must not be bypassable through popup controls while a locked schedule is active.
- Page blocking must keep media/audio suspension reversible after the block ends.
- UI element blocking is separate from enforceable page blocking. Global UI rules can be enabled or disabled and can later be assigned to plans.
- Intent coherence stores bounded local diagnostics only. Do not store raw typed input, raw page text, full tab URLs, tab titles, or personal text samples.
- Billing/entitlement UI is dormant unless explicitly enabled. Provider truth belongs on a backend, not in the extension package.

## Developer 1

Owner: Codex in this thread.

Current focus:

- Repository modularization and hard architecture debt burn-down.
- Completed checkpoint: the broad `test/shared.test.js` file has been split into feature-owned tests under `test/shared/`.
- Current checkpoint: shared runtime debt is next, especially intent coherence and Pomodoro modules.
- `manifest.json` load order must stay preserved exactly when content scripts move.

Developer 1 currently owns:

- `manifest.json`
- `src/js/content/**`
- `src/js/shared/intentCoherence.js`
- `src/js/shared/pomodoro.js`
- `src/js/background/pomodoro.js`
- `test/shared/**`
- `docs/code-structure.md`
- `docs/modularization-roadmap.md`
- `docs/parallel-development.md`

Next Developer 1 tasks after this checkpoint:

- Split `src/js/shared/intentCoherence.js` into feature-owned shared modules without changing public exports.
- Split Pomodoro runtime debt in `src/js/shared/pomodoro.js` and `src/js/background/pomodoro.js`.
- Split remaining large content adapters after shared runtime boundaries are clearer:
  - `src/js/content/content-blocking/overlay.js`
  - `src/js/content/pageSignals.js`
  - `src/js/content/pomodoro/miniPanel.js`
- Keep tests in feature folders under `test/shared/`; do not recreate a broad omnibus test file.

## Developer 2

Recommended owner: UI/CSS and options-page design work that does not touch Developer 1's files.

Safe initial tasks:

- Split `src/css/style.css` into feature/surface CSS files according to `docs/modularization-roadmap.md`.
- Improve options-page visual hierarchy and spacing without changing plan storage behavior.
- Work in these paths first:
  - `src/css/**`
  - `src/options.html`
  - `src/js/options/**`, except avoid `src/js/options/plans/**` if a plan-controller edit is also active.
  - `docs/release-readiness.md`
  - `docs/plans-architecture.md`
- Add CSS ownership notes to `docs/code-structure.md` only after Developer 1's current doc edit is pushed.

Developer 2 should avoid while Developer 1 owns architecture/runtime debt:

- `manifest.json`
- `src/js/content/**`
- `src/js/shared/intentCoherence.js`
- `src/js/shared/pomodoro.js`
- `src/js/background/pomodoro.js`
- `test/shared/**`
- `docs/code-structure.md`
- `docs/modularization-roadmap.md`
- `docs/parallel-development.md`, unless the edit is a coordination handoff note.

Good Developer 2 follow-up tasks:

- Create an options-page layout plan for the future sidebar sections:
  - Plans
  - Blocked UI
  - Intent
  - Usage
  - Settings
- Redesign settings placement so passwords, UI mode, UI language, import/export, and instruction guide live in Settings.
- Keep the UI redesign grounded in existing behavior. Do not remove controls unless the replacement workflow is implemented.

## Coordination Workflow

1. Pull latest `main`.
2. Read this document, `docs/code-structure.md`, and `docs/modularization-roadmap.md`.
3. Claim an area by updating this document before broad edits.
4. Do not mix large path moves with behavior changes in the same commit.
5. Run the narrowest relevant checks before committing.
6. Push after every stable checkpoint.
7. If both developers need the same file, one developer should finish and push first; the other rebases or pulls before continuing.

## Required Checks By Change Type

Manifest or content-script path move:

- `npm run verify:manifest`
- `npm run verify:imports`
- `npm test`

Storage model or plan behavior:

- `npm test`
- Add or update tests in the relevant feature area.
- Verify protected-schedule behavior remains stricter, not weaker.

Options or popup UI:

- `npm test`
- `npm run verify:imports`
- Manual browser check when layout/interaction changes are visible.

Folder/file structure:

- `npm run audit:folder-density`
- `npm run audit:file-sizes`
- Update `docs/code-structure.md`.

Release-facing changes:

- `npm test`
- `npm run verify:manifest`
- `npm run verify:imports`
- `npm run verify:release`
- `npm run package`

## Current Architecture Hotspots

- `src/js/shared` exceeds folder-density hard limits.
- `src/js/content` is now split by feature folder, but several content adapters still exceed file-size budgets.
- `src/js/content/ui-blocking/controller.js` is below the hard file-size limit after extracting `pickerStyle.js` and `pickerPanel.js`.
- `src/js/content/intentIntervention.js` is below the hard file-size limit after extracting `src/js/content/intent/` constants, messages, style, theme, and prompt modules.
- `src/css/style.css` exceeds file-size hard limits.
- The test suite is now feature-owned under `test/shared/`; `test/shared/intent/intent-coherence-tabs.test.js` is still over the soft file-size target and should not grow.
- `src/js/shared/intentCoherence.js`, `src/js/background/pomodoro.js`, and `src/js/shared/pomodoro.js` exceed file-size hard limits.

## Conflict Resolution

If a conflict happens:

- Preserve behavior first.
- Prefer the version with the newer tests or updated docs only when it still satisfies the protected invariants.
- Re-run checks after resolving.
- Add a short note to this document if the conflict exposed a missing ownership boundary.
