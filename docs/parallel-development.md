# Development Coordination

This document is the coordination file for DaD development. The project is currently in single-developer mode. If a second developer joins again later, this file becomes the shared coordination source for ownership, active tasks, risk boundaries, misunderstandings, step-ins, and handoffs.

## Current Rule

Codex in this thread is currently the only active developer. Work should still be done in small, verified checkpoints so future parallel development can resume without untangling mixed changes.

If a second developer becomes active again, one developer owns one area at a time. Do not edit another developer's owned files unless the owner has committed and pushed their checkpoint or explicitly hands the area over.

Keep commits small, verified, and pushed. Prefer behavior-neutral structure commits before behavior changes.

Codex is responsible for keeping this document current. If the active ownership, next task, blocked area, or shared understanding changes, Codex should update this file in the same checkpoint that changes the project state.

If chat context is unclear, this document is the authoritative local coordination record.

## Protected Invariants

- Chrome extension content scripts are classic scripts loaded by `manifest.json` in order. Path moves must preserve that order.
- Storage keys are user data contracts. Do not rename keys without a migration and tests.
- Locked or forced schedules are critical protection data. Changes that can weaken them need tests and explicit review.
- Pomodoro strict breaks must block pages during required rest and must not be bypassable through popup controls while a locked schedule is active.
- Page blocking must keep media/audio suspension reversible after the block ends.
- UI element blocking is separate from enforceable page blocking. Global UI rules can be enabled or disabled and can later be assigned to plans.
- Intent coherence stores bounded local diagnostics only. Do not store raw typed input, raw page text, full tab URLs, tab titles, or personal text samples.
- Billing/entitlement UI is dormant unless explicitly enabled. Provider truth belongs on a backend, not in the extension package.

## Active Developer

Owner: Codex in this thread.

Current focus:

- Repository modularization and hard architecture debt burn-down.
- Completed checkpoint: the broad `test/shared.test.js` file has been split into feature-owned tests under `test/shared/`.
- Completed checkpoint: `src/js/shared/intentCoherence.js` has been split into feature-owned modules under `src/js/shared/intent/` while preserving the public barrel API.
- Completed checkpoint: `src/js/shared/pomodoro.js` has been split into feature-owned modules under `src/js/shared/pomodoro/` while preserving the public barrel API.
- Completed checkpoint: `src/js/background/pomodoro.js` has been split into feature-owned modules under `src/js/background/pomodoro/` while preserving the public background initializer export.
- Completed checkpoint: shared schedule helpers have been moved from the shared root into `src/js/shared/schedules/`, reducing `src/js/shared` from hard folder-density debt to soft folder-density debt.
- Completed checkpoint: reusable options schedule-board modules have been moved from the options root into `src/js/options/schedules/`, bringing `src/js/options` back within the folder-density budget.
- Completed checkpoint: shared storage helpers now live under `src/js/shared/storage/`, and shared UI helpers now live under `src/js/shared/ui/`, bringing `src/js/shared` back within the folder-density budget.
- Completed checkpoint: the on-page Pomodoro mini-panel has been split into state, style, theme, layout, render, and controller content scripts while preserving manifest load order.
- Completed checkpoint: the blocked-page overlay has been split into messages, style, theme, diagnostics, Pomodoro status, event guards, and a thin controller while preserving manifest load order.
- Current checkpoint: remaining JS work is soft-size adapter cleanup and folder-density reduction; no JS file-size hard violations are currently reported by `npm run audit:file-sizes`.
- Current folder-density debt: none reported by `npm run audit:folder-density`.
- `manifest.json` load order must stay preserved exactly when content scripts move.

Codex currently owns:

- `manifest.json`
- `src/js/content/**`
- `src/js/shared/intentCoherence.js`
- `src/js/shared/intent/**`
- `src/js/shared/pomodoro.js`
- `src/js/shared/pomodoro/**`
- `src/js/shared/schedules/**`
- `src/js/shared/storage/**`
- `src/js/shared/ui/**`
- `src/js/options/schedules/**`
- `src/js/background/pomodoro.js`
- `src/js/background/pomodoro/**`
- `test/shared/**`
- `docs/code-structure.md`
- `docs/modularization-roadmap.md`
- `docs/parallel-development.md`

Next active-developer tasks after this checkpoint:

- Split remaining large content adapters:
  - `src/js/content/pageSignals.js`
- Split soft shared modules when they are touched for behavior:
  - `src/js/shared/usageStats.js`
  - `src/js/shared/plans.js`
- Keep shared-root density under budget; new shared behavior should go into a feature subfolder instead of `src/js/shared`.
- Keep tests in feature folders under `test/shared/`; do not recreate a broad omnibus test file.

## Developer 2

Status: inactive. There is no second developer right now.

This lane is parked guidance for a future second developer. It is not an active ownership claim.

Recommended future owner: UI/CSS and options-page design work that does not touch Codex-owned architecture/runtime files.

Safe future tasks:

- Split `src/css/style.css` into feature/surface CSS files according to `docs/modularization-roadmap.md`.
- Improve options-page visual hierarchy and spacing without changing plan storage behavior.
- Work in these paths first:
  - `src/css/**`
  - `src/options.html`
  - `src/js/options/**`, except avoid `src/js/options/plans/**` if a plan-controller edit is also active and avoid `src/js/options/schedules/**` unless claiming schedule-board UI work.
  - `docs/release-readiness.md`
  - `docs/plans-architecture.md`
- Add CSS ownership notes to `docs/code-structure.md` only after Codex's current doc edit is pushed.

A future Developer 2 should avoid while Codex owns architecture/runtime debt:

- `manifest.json`
- `src/js/content/**`
- `src/js/shared/intentCoherence.js`
- `src/js/shared/intent/**`
- `src/js/shared/pomodoro.js`
- `src/js/shared/pomodoro/**`
- `src/js/shared/schedules/**`
- `src/js/shared/storage/**`
- `src/js/shared/ui/**`
- `src/js/options/schedules/**`
- `src/js/background/pomodoro.js`
- `src/js/background/pomodoro/**`
- `test/shared/**`
- `docs/code-structure.md`
- `docs/modularization-roadmap.md`
- `docs/parallel-development.md`, unless the edit is a coordination handoff note.

Good future Developer 2 follow-up tasks:

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
3. In single-developer mode, keep this document updated when active focus or ownership boundaries change. In parallel mode, claim an area by updating this document before broad edits.
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

- `src/js/shared` is back within the folder-density budget after moving schedule, storage, and UI helpers into feature subfolders.
- `src/js/options` is back within the folder-density budget after moving reusable schedule-board modules into `src/js/options/schedules/`.
- `src/js/content` is now split by feature folder, but several content adapters still exceed file-size budgets.
- `src/js/content/pomodoro/miniPanel.js` is now a thin controller after extracting mini-panel theme, layout, and render modules.
- `src/js/content/content-blocking/overlay.js` is now a thin controller after extracting blocked-overlay message, style, theme, diagnostics, Pomodoro, and event modules.
- `src/js/content/ui-blocking/controller.js` is below the hard file-size limit after extracting `pickerStyle.js` and `pickerPanel.js`.
- `src/js/content/intentIntervention.js` is below the hard file-size limit after extracting `src/js/content/intent/` constants, messages, style, theme, and prompt modules.
- `src/css/style.css` exceeds file-size hard limits.
- The test suite is now feature-owned under `test/shared/`; `test/shared/intent/intent-coherence-tabs.test.js` is still over the soft file-size target and should not grow.
- `src/js/shared/intentCoherence.js` is now a small compatibility barrel. The shared intent implementation lives under `src/js/shared/intent/`.
- `src/js/shared/pomodoro.js` is now a small compatibility barrel. The shared Pomodoro implementation lives under `src/js/shared/pomodoro/`.
- Shared schedule helpers now live under `src/js/shared/schedules/`.
- Shared storage helpers now live under `src/js/shared/storage/`, and shared UI helpers now live under `src/js/shared/ui/`.
- `src/js/background/pomodoro.js` is now a small compatibility barrel. The background Pomodoro implementation lives under `src/js/background/pomodoro/`.
- `npm run audit:file-sizes` currently reports no hard JS file-size violations. Remaining file-size issues are soft warnings.

## Conflict Resolution

If a conflict happens:

- Preserve behavior first.
- Prefer the version with the newer tests or updated docs only when it still satisfies the protected invariants.
- Re-run checks after resolving.
- Add a short note to this document if the conflict exposed a missing ownership boundary.
