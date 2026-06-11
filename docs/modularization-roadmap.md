# DaD Modularization Roadmap

This document defines the target structure for the extension as it grows from a small blocker into a plan-based protection system with schedules, Pomodoro, UI cleanup, intent coherence, diagnostics, payments, and research-driven interventions.

The goal is not cosmetic folder movement. The goal is to make future work cheaper, safer, and easier to review.

The source-backed Chrome extension constraints behind this roadmap are summarized in [Extension Architecture Research](extension-architecture-research.md). When more than one developer is active, ownership and handoff rules live in [Parallel Development Coordination](parallel-development.md).

## Problems To Fix

Current pressure points:

- Runtime folders are becoming dumping grounds. `src/js/options`, `src/js/content`, and root `src/js` contain unrelated responsibilities side by side.
- Some files are too large to reason about safely: options plans, popup, Pomodoro mini-panel, intent coherence, and large CSS files.
- UI rendering, storage mutation, validation, Chrome API calls, and domain rules are often mixed in the same file.
- Content scripts use classic manifest load order and `window.DAD` globals. That is workable, but it must be treated as an explicit adapter layer, not as the main architecture.
- Tests have been split into feature-owned files under `test/shared/`, but runtime modules still carry the main hard-size debt.

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

Use `npm run audit:folder-density` for reporting and `npm run audit:folder-density:strict` when hard folder-index debt should fail the check.

## Migration Strategy

Do not perform a giant rename-only refactor. It creates high merge risk and hides behavior regressions.

Use compatibility wrappers and move one feature surface at a time.

### Phase 1: Guardrails

- Add this roadmap.
- Add a file-size audit script that reports files over the budget. Use `npm run audit:file-sizes` for reporting and `npm run audit:file-sizes:strict` when a hard threshold should fail.
- Add a manifest reference check so moved files cannot silently break extension loading. Use `npm run verify:manifest`.
- Done: split the large shared test file into feature-owned tests under `test/shared/` without changing assertions.

### Phase 2: Popup Split

The popup is the safest first UI split because it is a single page and already imports ES modules.

Split `src/js/popup.js` into:

- popup bootstrap
- message helpers
- active-tab helpers
- protection summary
- UI picker card
- Pomodoro card
- block diagnostics card
- page signals card
- intent diagnostics card
- diagnostics export

The popup entry file should become an initializer that wires modules together.

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
- Reusable schedule-board modules remain directly under `src/js/options/` because they are not plan-specific.

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

Continue splitting `src/js/content/pomodoro/miniPanel.js` into small content-script modules:

- panel controller
- runtime refresh and message handling
- drag/resize geometry
- renderer
- formatting/status rows

Completed first steps:

- `src/js/content/pomodoro/miniPanelState.js` owns local UI-state persistence.
- `src/js/content/pomodoro/miniPanelStyle.js` owns CSS injection and shared layout constants.
- Pomodoro content scripts now live under `src/js/content/pomodoro/`.
- UI blocking content scripts now live under `src/js/content/ui-blocking/`.
- `src/js/content/ui-blocking/pickerStyle.js` owns picker highlight and panel CSS injection.
- `src/js/content/ui-blocking/pickerPanel.js` owns picker copy, theme sync, draggable panel rendering, and picker controls.
- Page blocking content scripts now live under `src/js/content/content-blocking/`.
- Intent content intervention modules now live under `src/js/content/intent/` for constants, messages, CSS injection, theme sync, and prompt rendering. `src/js/content/intentIntervention.js` remains the controller for polling, feedback, dismissal state, grayscale application, and action wiring.

The final shape should keep `miniPanel.js` as a thin adapter that wires the modules together and exposes the public mini-panel API.

### Phase 6: Intent Core Split

Split intent coherence core into:

- token extraction
- similarity scoring
- trajectory/session mutation
- tab lineage
- intervention policy
- feedback calibration
- diagnostics summarization

This should be done after popup/options splits because intent is more behavior-sensitive.

### Phase 7: CSS Split

Split CSS by surface and feature:

```text
src/css/
  tokens.css
  options/
    layout.css
    plans.css
    schedule.css
    blocked-ui.css
    diagnostics.css
    settings.css
  popup/
    layout.css
    cards.css
    diagnostics.css
  content/
    picker.css
    pomodoro-mini-panel.css
    blocking-overlay.css
  blocked/
    blocked-page.css
```

Only split CSS after the JS ownership boundaries are stable, otherwise selectors will churn twice.

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

## First Implementation Target

The next best practical target is the popup split.

Reason:

- It is too large.
- It is user-facing.
- It is already ES-module based.
- It touches Pomodoro, block diagnostics, intent diagnostics, and UI picker, so splitting it creates reusable UI conventions before deeper options-page work.
- It does not require changing content-script manifest load order.

The second target is the plan controller in `src/js/options/plans/controller.js`, because that file owns the product model users will live in.
