# DaD Modularization Roadmap

This document defines the target structure for the extension as it grows from a small blocker into a plan-based protection system with schedules, Pomodoro, UI cleanup, intent coherence, diagnostics, payments, and research-driven interventions.

The goal is not cosmetic folder movement. The goal is to make future work cheaper, safer, and easier to review.

The source-backed Chrome extension constraints behind this roadmap are summarized in [Extension Architecture Research](extension-architecture-research.md). When more than one developer is active, ownership and handoff rules live in [Parallel Development Coordination](parallel-development.md).

## Problems To Fix

Current pressure points:

- Runtime folders are becoming dumping grounds. `src/js/options`, `src/js/content`, and root `src/js` contain unrelated responsibilities side by side.
- Some files were too large to reason about safely. The largest JavaScript and CSS entry points have been split, but plan/schedule UI behavior still needs careful incremental refinement.
- UI rendering, storage mutation, validation, Chrome API calls, and domain rules are often mixed in the same file.
- Content scripts use classic manifest load order and `window.DAD` globals. That is workable, but it must be treated as an explicit adapter layer, not as the main architecture.
- Tests and several runtime modules have been split into feature-owned files. Remaining debt is concentrated in product-flow refinement, soft-size adapters, and keeping new work inside the existing feature folders.

## Architectural Direction

Use a hybrid feature-first structure with thin runtime entry points.

Runtime entry points should only bootstrap:

- background service worker
- options page
- popup
- blocked page
- content script bootstrap

Product behavior should live in feature folders. Shared browser wrappers should live in platform folders. Pure logic should stay independent from Chrome and DOM APIs.

## Target Folder Structure

```text
src/js/
  app/
    background/
      index.js
      messageRouter.js
    content/
      index.global.js
      manifestScripts.js
    options/
      index.js
    popup/
      index.js
    blocked/
      index.js

  features/
    plans/
      core/
        model.js
        activity.js
        migration.js
        storagePriority.js
      options/
        PlanList.js
        PlanPage.js
        PlanEntries.js
        PlanSchedule.js
        PlanPomodoro.js
        PlanIntent.js
      content/
        planMatcher.global.js

    schedules/
      core/
        time.js
        grid.js
        rules.js
        summary.js
      options/
        ScheduleBoard.js
        ScheduleInspector.js
        ScheduleDragController.js

    pomodoro/
      core/
        runtime.js
        history.js
        activity.js
        strictBreaks.js
      background/
        pomodoroRuntime.js
      content/
        activityReporter.global.js
        mini-panel/
          MiniPanel.global.js
          MiniPanelState.global.js
          MiniPanelDragResize.global.js
          MiniPanelRenderer.global.js
          MiniPanelStyles.global.js
      popup/
        PomodoroCard.js
      options/
        PomodoroSettings.js

    intent/
      core/
        scoring.js
        trajectory.js
        lineage.js
        feedback.js
        policy.js
      background/
        intentRuntime.js
      content/
        intentIntervention.global.js
      options/
        IntentDiagnostics.js
        IntentSettings.js
      popup/
        IntentSummary.js

    content-blocking/
      core/
        keywordScoring.js
        matchDiagnostics.js
      content/
        blockPage.global.js
        overlay.global.js
        mediaSuspension.global.js
        keywordScanner.global.js
        siteCheck.global.js

    ui-blocking/
      core/
        fingerprint.js
        matcher.js
        ruleModel.js
        storageModel.js
      content/
        picker/
          PickerController.global.js
          PickerPanel.global.js
          PickerPreview.global.js
          PickerStyles.global.js
        applyRules.global.js
      options/
        ElementRulesList.js
        ElementRuleEditor.js

    usage-stats/
      core/
        aggregate.js
        retention.js
      background/
        usageRecorder.js
      options/
        UsageStatsPanel.js

    billing/
      core/
        entitlements.js
        providerConfig.js
      options/
        BillingPanel.js

    release/
      core/
        backupNotice.js
      options/
        ReleaseNotice.js

    i18n/
      core/
        messages.js
        localeSupport.js
      content/
        uiLanguage.global.js
      options/
        UiLanguageControl.js

  platform/
    chrome/
      storage.js
      runtimeMessages.js
      tabs.js
      alarms.js
      idle.js
      downloads.js
    dom/
      createElement.js
      dialog.js
      formControls.js
      theme.js
    time/
      clock.js
      duration.js
    diagnostics/
      logger.js

  legacy/
    migration/
      legacyGroups.js
      legacySchedules.js
      legacyWhitelist.js
```

The exact filenames can change during implementation. The boundaries should not.

## Dependency Rules

Pure feature core modules:

- May import other pure core modules.
- Must not access `chrome`, `window`, `document`, `localStorage`, `sessionStorage`, or DOM nodes.
- Must be directly testable with Node.

Platform modules:

- Own browser API wrappers and error handling.
- Hide Chrome callback APIs behind small Promise-based functions where possible.
- Keep permission-specific behavior visible. For example, tab mute belongs near `platform/chrome/tabs.js`.

Runtime and UI modules:

- May use DOM and Chrome APIs through platform wrappers.
- Should not contain core validation or scoring rules inline.
- Should delegate persistence to feature storage helpers.

Content scripts:

- Can remain classic scripts while there is no bundler.
- Must attach only a small public API to `window.DAD`.
- Should treat `window.DAD` as the compatibility boundary, not as shared application state.
- Must have load order documented next to the manifest list.

## File Size Budgets

These are review limits, not hard compiler limits:

- Runtime entry file: target under 150 lines.
- Pure core module: target 100 to 300 lines.
- UI component/module: target 150 to 450 lines.
- Content-script adapter: target 100 to 350 lines.
- CSS file per surface or feature: target under 500 lines.
- Test file per feature: target under 500 lines.

If a file crosses 600 lines, create a follow-up split unless there is a clear reason. If a file crosses 900 lines, treat it as architecture debt, not normal growth.

## Folder Density Budgets

Runtime folders should stay navigable without becoming flat indexes of unrelated work.

- Root runtime folders such as `src/js/options`, `src/js/content`, `src/js/shared`, and `src/js/background` should target 12 files or fewer.
- Feature subfolders should target 15 files or fewer. If a feature crosses that, split by sub-surface such as `options`, `content`, `core`, `background`, or `styles`.
- A flat folder may temporarily exceed the target during migration, but new work should either land in an existing feature folder or create one.
- File moves should be behavior-neutral and accompanied by import checks, tests, and documentation updates.

Use `npm run audit:folder-density` for reporting and `npm run audit:folder-density:strict` when hard folder-index debt should fail the check. The audit output also reports how many matching source folders are covered by a configured budget and how many matching folders are intentionally outside current budgets.

## Migration Strategy

Do not perform a giant rename-only refactor. It creates high merge risk and hides behavior regressions.

Use compatibility wrappers and move one feature surface at a time.

### Phase 1: Guardrails

- Add this roadmap.
- Add a file-size audit script that reports files over the budget and prints its source-file coverage scope. Use `npm run audit:file-sizes` for reporting and `npm run audit:file-sizes:strict` when a hard threshold should fail.
- Add a manifest reference check so moved files cannot silently break extension loading. Use `npm run verify:manifest`.
- Done: split the large shared test file into feature-owned tests under `test/shared/` without changing assertions.

### Phase 2: Popup Split

Status: completed for the entry-file split. `src/js/popup.js` is now a bootstrap/wiring file, and popup responsibilities live under `src/js/popup/`.

The popup is the safest first UI split because it is a single page and already imports ES modules.

The split separates:

- popup bootstrap
- message helpers
- active-tab helpers
- protection summary
- UI picker card
- Pomodoro card
- block diagnostics card
- page signals card
- intent diagnostics and recovery cards under `src/js/popup/intent/`
- diagnostics export

The popup entry file is now an initializer that wires modules together. New popup features should not grow `src/js/popup.js`; add or extend the smallest focused popup module.

### Phase 3: Plans Options Split

Move plan-specific options modules into `src/js/options/plans/` and continue splitting the plan controller by plan page:

- compact plan list
- plan page shell and navigation
- storage mutation and protected-schedule guards
- entries editor
- schedule editor
- Pomodoro editor
- intent editor
- shared controls and confirmation dialog

Completed first step:

- Plan-specific options files now live under `src/js/options/plans/`.
- Reusable schedule-board modules now live under `src/js/options/schedules/` because they are a shared options-page schedule feature, not generic options root code.

This is high priority because plans are the center of the product.

### Phase 4: Schedule Board Split

Split schedule UI into:

- grid rendering
- inspector rendering
- pointer drag controller
- recurrence controls
- read-only/protected mode rules

The schedule core logic already has useful shared modules. The UI should match that separation.

### Phase 5: Pomodoro Mini-Panel Split

Status: completed for the controller split. `src/js/content/pomodoro/miniPanel.js` is now the thin content-script controller, and the surrounding mini-panel responsibilities live in focused sibling modules:

- panel controller
- theme sync
- layout state, drag, resize, and viewport geometry
- renderer
- formatting/status rows

Completed first steps:

- Shared Pomodoro core now lives under `src/js/shared/pomodoro/` for constants, settings, activity, history, runtime transitions, and status formatting. `src/js/shared/pomodoro.js` remains the compatibility barrel for current callers.
- Shared schedule helpers now live under `src/js/shared/schedules/` for form, grid, rules, summary, and time helpers. Options code and tests import the subfolder directly so `src/js/shared` no longer exceeds the folder-density hard limit.
- Shared storage helpers now live under `src/js/shared/storage/`, and shared UI helpers now live under `src/js/shared/ui/`. `src/js/shared` is now within the folder-density budget.
- Background Pomodoro now lives under `src/js/background/pomodoro/` for Chrome storage/alarms, auto-start suppression, plan selection, transition history, runtime reconciliation, notifications, and event listener registration. `src/js/background/pomodoro.js` remains the compatibility entry imported by `background.js`.
- `src/js/content/pomodoro/miniPanelState.js` owns local UI-state persistence.
- `src/js/content/pomodoro/miniPanelStyleConstants.js` owns mini-panel IDs, layout constants, and resize directions.
- `src/js/content/pomodoro/miniPanelStyleCss.js` owns the generated mini-panel CSS text.
- `src/js/content/pomodoro/miniPanelStyle.js` is the thin style facade that injects CSS and exposes the public `PomodoroMiniPanelStyle` API.
- `src/js/content/pomodoro/miniPanelTheme.js` owns mini-panel theme sync.
- `src/js/content/pomodoro/miniPanelLayout.js` owns mini-panel layout persistence, drag, resize, and viewport clamping.
- `src/js/content/pomodoro/miniPanelRender.js` owns mini-panel runtime/status rendering and display formatting.
- `src/js/content/pomodoro/miniPanel.js` is now the thin controller that wires modules together and exposes the public mini-panel API.
- Pomodoro content scripts now live under `src/js/content/pomodoro/`.
- UI blocking content scripts now live under `src/js/content/ui-blocking/`.
- `src/js/content/ui-blocking/pickerStyle.js` owns picker highlight and panel CSS injection.
- `src/js/content/ui-blocking/pickerPanel.js` owns picker copy, theme sync, draggable panel rendering, and picker controls.
- `src/js/content/ui-blocking/builtInRules.js` owns narrow built-in cosmetic cleanup rules separately from user-saved structural rules.
- Page blocking content scripts now live under `src/js/content/content-blocking/`.
- Blocked-overlay content responsibilities now live in focused modules for messages, style, theme, diagnostics, Pomodoro strict-break status, event guards, navigation guards, and a thin overlay controller.
- Blocked-page customization uses a pure shared settings model under `src/js/shared/blocked-page/`, an options Settings card under `src/js/options/settings/`, an ES-module renderer under `src/js/blocked/`, and a classic content-script adapter in `src/js/content/content-blocking/overlayCustomization.js`.
- Page-signal content responsibilities now live under `src/js/content/page-signals/` for activity tracking, signal collection, and reporting, with `src/js/content/pageSignals.js` kept as the thin public controller.
- Intent content intervention modules now live under `src/js/content/intent/` for constants, messages, CSS injection, theme sync, prompt rendering, reversible element reduction, visual-effect application, and media pause/restore. `src/js/content/intentIntervention.js` remains the controller for polling, feedback, dismissal state, and action wiring.

The final shape keeps `miniPanel.js` as a thin adapter that wires the modules together and exposes the public mini-panel API.

### Phase 6: Intent Core Split

Status: completed for the shared intent model. `src/js/shared/intentCoherence.js` now stays as a public compatibility barrel, while the implementation lives under `src/js/shared/intent/`.

The split separates:

- token extraction
- similarity scoring
- trajectory/session mutation
- tab lineage
- intervention policy
- feedback calibration
- diagnostics summarization

Do not put new intent behavior back into the barrel file. Add it to the smallest fitting `src/js/shared/intent/` module and export it through the barrel only when it is part of the public shared API.

The background intent runtime is also split. `src/js/background/intentCoherence.js` remains the initializer barrel imported by `background.js`, while Chrome API wrappers, storage mutation, effective-policy lookup, page-signal recording, tab lineage, diagnostics, runtime messages, and listener registration live under `src/js/background/intent/`.

### Phase 7: CSS Split

Status: completed for popup and options-page entry stylesheets. `src/css/popup.css` and `src/css/style.css` are now thin import barrels, and the actual styling lives in focused surface folders.

Current CSS structure:

```text
src/css/
  options/
    tokens.css
    layout.css
    plans.css
    schedule.css
    blocked-ui.css
    diagnostics.css
    settings.css
    actions.css
    dialogs.css
    responsive.css
  popup/
    tokens.css
    layout.css
    controls.css
    status.css
    pomodoro.css
    diagnostics.css
```

Content-script CSS is still mostly injected by content-script modules because those surfaces need page isolation and manifest load-order compatibility. Future content styling should stay in the owning content module unless a bundling step is introduced.

### Phase 8: Optional Build Step

Do not add a bundler just to move files.

Consider Rollup or Vite only when:

- content-script global load order becomes too fragile,
- repeated module duplication becomes expensive,
- CSS bundling becomes necessary,
- or TypeScript migration is approved.

Until then, keep the extension package transparent and easy to inspect.

## Review Checklist For Each Refactor Slice

Each modularization slice should satisfy:

- No user-facing behavior change unless explicitly scoped.
- Existing tests pass.
- Any moved manifest file is still referenced correctly.
- Public storage keys stay unchanged unless a migration is included.
- Existing user data remains readable.
- Docs are updated if ownership changes.
- The commit message names the moved responsibility, not just "refactor".

## Next Implementation Targets

The popup and CSS entry splits are complete for the entry-file level. The next practical targets are:

- Continue reducing soft file-size warnings in touched files, starting with user-facing adapters and model files.
- Split the plan controller further when plan schedule, entries, Pomodoro, or intent behavior changes.
- Refine the plan schedule editor behavior and visuals without reintroducing standalone global schedules.
- Keep CSS changes inside the narrowest existing surface file instead of growing `src/css/style.css` or `src/css/popup.css`.

The highest product-value target remains the plan editor because it owns the product model users will live in.

Recent checkpoint:

- Global Blocked UI options behavior now lives under `src/js/options/element-rules/` for constants/messages, formatting, storage/quota, and rule-card rendering. `src/js/options/elementRules.js` remains the thin list/sync entry.
- Shared usage stats now live under `src/js/shared/usage-stats/` for constants, sanitizers, metric aggregation, state normalization, page-signal recording, summaries, and export payloads. `src/js/shared/usageStats.js` remains the compatibility barrel for current callers and tests.
- Background intent coherence now lives under `src/js/background/intent/` for Chrome API wrappers, storage mutation, effective-policy lookup, page-signal recording, tab lineage, diagnostics, runtime messages, and listener registration. `src/js/background/intentCoherence.js` remains the compatibility barrel for `background.js`.
- Shared plan helpers now live under `src/js/shared/plans/` for constants, normalization, schedule activity, effective group/UI-rule selection, and intent-policy combination. `src/js/shared/plans.js` remains the compatibility barrel for current callers and tests.
- Blocked-page runtime behavior now lives under `src/js/blocked/` for Chrome API wrappers, localization, UI-mode theme sync, and Pomodoro timer rendering. `src/js/blockedScript.js` remains the `src/blocked.html` module entry.
- Shared Pomodoro runtime helpers now live in focused modules for runtime state, phase durations, rest credit, and transitions. `src/js/shared/pomodoro/runtime.js` remains the compatibility barrel for current callers and tests.
- Pomodoro mini-panel style behavior now lives in focused content scripts for constants, CSS text generation, and a thin injection facade. `src/js/content/pomodoro/miniPanelStyle.js` remains the public content-script style API.
- Options and popup CSS now use thin entry barrels with focused surface files under `src/css/options/` and `src/css/popup/`.
- Blocked-page customization is now a bounded local note rendered on both the extension blocked page and the in-page overlay. The content overlay keeps a small classic adapter because manifest-loaded content scripts cannot import the shared ES module directly without a build step.
- Intent chain graph modeling now lives in `src/js/shared/intent/graph.js`, with the Options diagnostics panel rendering the bounded graph and the content prompt exposing a Show graph action that opens it.
- Intent new-tab freezing now lives in `src/js/content/intent/newTabFreeze.js` as a small reversible content adapter owned by the intent effects layer.
- Drift-descendant tab containment now includes an explicit move-to-separate-window action through `src/js/background/intent/tabs.js`, prompt controls, and popup recovery controls.
