# Development Coordination

This document is the coordination file for DaD development. The project is currently in single-developer mode. If a second developer joins again later, this file can become the shared coordination source for ownership, active tasks, risk boundaries, misunderstandings, step-ins, and handoffs.

## Current Rule

Codex in this thread is currently the only active developer. Work should still be done in small, verified checkpoints so future parallel development can resume without untangling mixed changes.

There is no active second developer right now. Treat all ownership notes below as Codex's current working ledger, not as a live handoff contract.

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
- Completed checkpoint: schedule core helpers have moved into feature ownership under `src/features/schedules/core/`.
- Completed checkpoint: reusable options schedule-board modules have been moved from the options root into `src/js/options/schedules/`, bringing `src/js/options` back within the folder-density budget.
- Completed checkpoint: Chrome sync/local storage wrappers now live under `src/platform/chrome/`, plan-critical storage priority lives under `src/features/plans/storage/`, and old shared storage paths are compatibility barrels.
- Completed checkpoint: shared UI helpers now live under `src/js/shared/ui/`, bringing `src/js/shared` back within the folder-density budget.
- Completed checkpoint: the on-page Pomodoro mini-panel has been split into state, style, theme, layout, render, and controller content scripts while preserving manifest load order.
- Completed checkpoint: the blocked-page overlay has been split into messages, style, theme, diagnostics, Pomodoro status, event guards, and a thin controller while preserving manifest load order.
- Completed checkpoint: page-signal content reporting has been split into activity, collector, reporter, and thin controller content scripts while preserving manifest load order.
- Completed checkpoint: the popup entry file has been split into panel construction, UI picker launching, diagnostics export, event binding, refresh loops, and a thin bootstrap.
- Completed checkpoint: the options-page bootstrap now lives at `src/app/options/index.js`, keeping `src/js/options` focused on options feature modules.
- Completed checkpoint: options password management now lives under `src/js/options/password/` and is initialized by the options app entry instead of a second root module script.
- Completed checkpoint: the instructions-page bootstrap now lives at `src/app/instructions/index.js`; the dead root `ScheduleState.js` module was removed.
- Completed checkpoint: the blocked-page bootstrap now lives at `src/app/blocked/index.js`, keeping root `src/js` limited to the classic content-script entry.
- Completed checkpoint: the content-script bootstrap now lives at `src/app/content/index.js`; root `src/js` no longer contains runtime entries.
- Completed checkpoint: blocked-page implementation modules now live under `src/features/content-blocking/blocked-page/`.
- Completed checkpoint: the shared page-signal collector model now lives under `src/features/page-signals/core/`, with the old shared path kept as a compatibility barrel.
- Completed checkpoint: global Blocked UI options have been split into constants/messages, formatting, storage/quota, rule-card rendering, and a thin list/sync entry.
- Completed checkpoint: shared usage stats have moved into feature ownership under `src/features/usage-stats/core/`, while preserving the public shared barrel API.
- Completed checkpoint: shared plan helpers have moved into feature ownership under `src/features/plans/core/`, while preserving the public shared barrel API.
- Completed checkpoint: background intent coherence has been split into Chrome API, storage, policy, page-signal recording, tab lineage, diagnostics, message routing, and initializer modules under `src/js/background/intent/` while preserving the public initializer barrel.
- Completed checkpoint: Pomodoro mini-panel style behavior has been split into constants, CSS generation, and a thin style-injection facade while preserving the public `PomodoroMiniPanelStyle` API.
- Completed checkpoint: options and popup CSS are split into thin entry barrels plus focused surface stylesheets.
- Completed checkpoint: Pomodoro away-rest credit now continues until user return, resolves remaining breaks from the return timestamp, avoids away-time alarm loops, and documents the behavior in the Pomodoro spec.
- Current checkpoint: remaining JS work is soft-size adapter cleanup and folder-density reduction; no JS file-size hard violations are currently reported by `npm run audit:file-sizes`.
- Current folder-density debt: none reported by `npm run audit:folder-density`.
- `manifest.json` load order must stay preserved exactly when content scripts move.

Codex currently owns:

- `manifest.json`
- `src/app/content/index.js`
- `src/js/content/**`
- `src/features/content-blocking/blocked-page/**`
- `src/features/page-signals/**`
- `test/features/page-signals/**`
- `src/js/shared/intentCoherence.js`
- `src/js/shared/intent/**`
- `src/js/shared/pomodoro.js`
- `src/js/shared/pomodoro/**`
- `src/features/schedules/**`
- `test/features/schedules/**`
- `src/features/plans/**`
- `src/js/shared/storage/**`
- `src/js/shared/ui/**`
- `src/platform/chrome/**`
- `src/features/usage-stats/**`
- `test/features/usage-stats/**`
- `src/js/shared/usageStats.js`
- `src/js/options/schedules/**`
- `src/js/options/password/**`
- `src/js/options/elementRules.js`
- `src/js/options/element-rules/**`
- `src/js/background/pomodoro.js`
- `src/js/background/pomodoro/**`
- `src/js/background/intentCoherence.js`
- `src/js/background/intent/**`
- `src/app/popup/index.js`
- `src/app/options/index.js`
- `src/app/instructions/index.js`
- `src/app/blocked/index.js`
- `src/js/popup/**`
- `test/shared/**`
- `docs/code-structure.md`
- `docs/modularization-roadmap.md`
- `docs/parallel-development.md`

Next active-developer tasks after this checkpoint:

- Split remaining large content adapters as they appear in `npm run audit:file-sizes`.
- Split soft shared modules when they are touched for behavior.
- Keep shared-root density under budget; new shared behavior should go into a feature subfolder, and new browser API wrappers should go into `src/platform/` instead of `src/js/shared`.
- Keep tests in feature folders under `test/shared/`; do not recreate a broad omnibus test file.

## Parked Parallel Lane

Status: inactive. There is no second developer right now.

If a second developer joins again, recreate a live ownership lane here before they edit. Good future split points are CSS/options-page visual design or another clearly bounded feature area that does not overlap the active Codex checkpoint.

## Coordination Workflow

1. Pull latest `main`.
2. Read this document, `docs/code-structure.md`, and `docs/modularization-roadmap.md`.
3. In single-developer mode, keep this document updated when active focus or ownership boundaries change. If parallel mode resumes, claim an area by updating this document before broad edits.
4. Do not mix large path moves with behavior changes in the same commit.
5. Run the narrowest relevant checks before committing.
6. Push after every stable checkpoint.
7. If parallel mode resumes and two developers need the same file, one developer should finish and push first; the other rebases or pulls before continuing.

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

- `src/js/shared` is back within the folder-density budget after moving schedule helpers, Chrome storage wrappers, and UI helpers to narrower owners.
- `src/js/options` is back within the folder-density budget after moving reusable schedule-board modules into `src/js/options/schedules/`.
- `src/js/content` is now split by feature folder, and current file-size audits report no hard JS violations.
- `src/js/content/pomodoro/miniPanel.js` is now a thin controller after extracting mini-panel theme, layout, and render modules.
- `src/js/content/pomodoro/miniPanelStyle.js` is now a thin style facade after extracting mini-panel constants and CSS text generation.
- `src/js/content/content-blocking/overlay.js` is now a thin controller after extracting blocked-overlay message, style, theme, diagnostics, Pomodoro, and event modules.
- `src/js/content/pageSignals.js` is now a thin controller after extracting page-signal activity, collector, and reporter modules.
- `src/app/popup/index.js` is now a thin popup bootstrap after extracting panel construction, UI picker launch, diagnostics export, event binding, and refresh-loop modules.
- `src/app/options/index.js` is now the options-page bootstrap; options feature behavior remains under `src/js/options/`.
- `src/app/instructions/index.js` is now the instructions-page bootstrap for guide localization and theme setup.
- `src/js/options/password/manager.js` owns options password controls and the overlay gate; `src/options.html` now has a single app-entry module script.
- Root `src/js` no longer contains runtime entries; classic content-script feature adapters remain under `src/js/content/`.
- `src/js/options/elementRules.js` is now a thin global Blocked UI list/sync entry after extracting storage/quota, formatting, and rule-item rendering modules.
- `src/js/shared/usageStats.js` is now a small compatibility barrel. The bounded local usage-stats implementation lives under `src/features/usage-stats/core/`.
- `src/js/background/intentCoherence.js` is now a small compatibility barrel. Background intent runtime responsibilities live under `src/js/background/intent/`.
- `src/js/content/ui-blocking/controller.js` is below the hard file-size limit after extracting `pickerStyle.js` and `pickerPanel.js`.
- `src/js/content/intentIntervention.js` is below the hard file-size limit after extracting `src/js/content/intent/` constants, messages, style, theme, and prompt modules.
- `src/css/style.css` and `src/css/popup.css` are thin stylesheet entry barrels. Surface styles live under `src/css/options/` and `src/css/popup/`.
- The test suite is now feature-owned under `test/shared/` and `test/features/`; intent tests are split under `test/shared/intent/scoring/`, `test/shared/intent/trajectory/`, and `test/shared/intent/interventions/`.
- `src/js/shared/intentCoherence.js` is now a small compatibility barrel. The shared intent implementation lives under `src/js/shared/intent/`.
- `src/js/shared/pomodoro.js` is now a small compatibility barrel. The shared Pomodoro implementation lives under `src/js/shared/pomodoro/`.
- Schedule core helpers now live under `src/features/schedules/core/`.
- Chrome sync/local storage wrappers now live under `src/platform/chrome/`, plan-critical storage priority lives under `src/features/plans/storage/`, and shared storage paths are compatibility barrels. Shared UI helpers live under `src/js/shared/ui/`.
- `src/js/background/pomodoro.js` is now a small compatibility barrel. The background Pomodoro implementation lives under `src/js/background/pomodoro/`.
- `npm run audit:file-sizes` currently reports no hard JS file-size violations. Remaining file-size issues are soft warnings.

## Conflict Resolution

If a conflict happens:

- Preserve behavior first.
- Prefer the version with the newer tests or updated docs only when it still satisfies the protected invariants.
- Re-run checks after resolving.
- Add a short note to this document if the conflict exposed a missing ownership boundary.
