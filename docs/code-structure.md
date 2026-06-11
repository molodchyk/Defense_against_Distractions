# Code Structure

DaD is moving toward small modules grouped by runtime surface and product responsibility.

The detailed modularization target, dependency rules, file-size budgets, and migration phases live in [DaD Modularization Roadmap](modularization-roadmap.md). Ownership and coordination rules live in [Development Coordination](parallel-development.md). The external Chrome extension architecture constraints behind that roadmap are summarized in [Extension Architecture Research](extension-architecture-research.md).

## Runtime Areas

`src/js/background` contains extension background/service-worker behavior.

`src/js/content` contains page-injected content scripts. These files are loaded by `manifest.json` in order and are not ES modules, so shared content-script APIs attach to `window.DAD`. Feature-specific content scripts should live in subfolders while preserving the manifest order.

`src/js/options` contains options-page-only UI helpers and page behavior. Feature-specific option modules should live in a feature subfolder instead of adding more files directly to this folder.

`src/js/popup` contains popup-only helper modules. The root `src/js/popup.js` is the popup bootstrap: it initializes language/theme state, creates the panel set, starts refresh loops, handles storage changes, and binds events. Generic Chrome messaging, DOM helpers, formatting helpers, popup shell behavior, popup i18n, panel construction, UI picker launching, diagnostics export, event binding, refresh intervals, the protection summary, the Page Signals panel, the Block Diagnostics panel, the Intent Diagnostics panel, and the Pomodoro panel live in focused modules under `src/js/popup/`. Future popup work should go into the narrowest matching popup module instead of expanding the entry file.

`src/css/popup.css` is a thin popup stylesheet entry point. It imports focused files from `src/css/popup`: `tokens.css` for theme variables, `layout.css` for shell/card/tab structure, `controls.css` for fields and buttons, `status.css` for protection badges and status grids, `pomodoro.css` for the popup timer panel, and `diagnostics.css` for Page Signals, block diagnostics, and intent diagnostics. Future popup styling should go into the narrowest matching CSS module instead of growing the entry file.

`src/css/style.css` is a thin options-page stylesheet entry point. It imports focused files from `src/css/options`: `tokens.css` for theme variables and base controls, `layout.css` for the page shell and sidebar navigation, `settings.css` for global settings cards, `blocked-ui.css` for UI element rules, `plans.css` for plan rows and plan pages, `diagnostics.css` for intent and usage diagnostics, `actions.css` for action states and password controls, `dialogs.css` for overlays and export/import actions, `responsive.css` for options-page breakpoints, and `schedule.css` for the weekly schedule editor. Future options styling should go into the narrowest matching CSS module instead of growing the entry file.

`src/js/shared` contains ES modules used by option/background code and tests.

Shared schedule helpers live under `src/js/shared/schedules/`:

- `src/js/shared/schedules/scheduleForm.js` owns schedule form defaults, display formatting, typed time normalization, and unnamed schedule naming.
- `src/js/shared/schedules/scheduleGrid.js` owns weekly-grid constants and pure range helpers for click, drag, move, and resize interactions.
- `src/js/shared/schedules/scheduleRules.js` owns overlap, minimum-unlocked-time, and strictness validation.
- `src/js/shared/schedules/scheduleSummary.js` owns compact schedule count and activity summary text.
- `src/js/shared/schedules/scheduleTime.js` owns time conversion, active-schedule checks, recurrence matching, and schedule activity counts.

New schedule behavior should go into this subfolder instead of adding files directly to `src/js/shared`.

Shared storage helpers live under `src/js/shared/storage/`:

- `src/js/shared/storage/chromeStorage.js` owns Promise wrappers around `chrome.storage.sync`.
- `src/js/shared/storage/criticalScheduleStorage.js` owns priority saving for plan data when forced schedule data must be preserved.

Shared UI helpers live under `src/js/shared/ui/`:

- `src/js/shared/ui/theme.js` owns UI-mode normalization and system-mode resolution.
- `src/js/shared/ui/uiLanguage.js` owns UI-language normalization, Chrome-locale fallback, and message formatting.

New storage or UI helpers should go into these subfolders instead of adding files directly to `src/js/shared`.

## Test Structure

Node tests live under `test/shared/` by product area:

- `test/shared/core/`: small shared primitives such as keywords, URLs, themes, UI language, release notice, and billing entitlement helpers.
- `test/shared/schedules/`: schedule time, validation, form, and weekly-grid model tests.
- `test/shared/plans/`: plan model, legacy migration, and group-rule tests.
- `test/shared/pomodoro/`: Pomodoro shared runtime and history model tests.
- `test/shared/signals/`: page-signal and usage-stat model tests.
- `test/shared/intent/`: intent coherence scoring, sessions, diagnostics, interventions, and tab-lineage tests.

Do not recreate a broad `test/shared.test.js` file. New tests should be added to the smallest matching feature folder, and new folders should be created before a folder becomes hard to scan.

Plan behavior is split by runtime and feature folder:

- `src/js/shared/plans.js` owns the tested ES-module plan model used by options code.
- `src/js/options/plans/controller.js` owns the options-page plan UI controller, storage mutation, and protected-schedule checks.
- `src/js/options/plans/dom.js` owns reusable plan-editor DOM controls, destructive confirmation dialogs, and guarded action dispatch.
- `src/js/options/plans/collections.js` owns small plan-editor collection helpers shared by migration and editing flows.
- `src/js/options/plans/entriesEditor.js` owns plan detail rendering for the plan name, website/keyword entries, allowed sites, and assigned UI cleanup rules.
- `src/js/options/plans/elementRules.js` owns compact UI-rule summaries and storage keys used when plan rows reference global UI cleanup rules.
- `src/js/options/plans/messages.js` owns plan-editor fallback text and UI-language message resolution.
- `src/js/options/plans/facts.js` owns compact plan summary/fact-list rendering for plan rows and plan detail headers.
- `src/js/options/plans/intentEditor.js` owns plan intent-coherence settings UI.
- `src/js/options/plans/migration.js` owns default-plan creation and one-way migration of legacy standalone groups, schedules, and whitelist entries into plan-owned records.
- `src/js/options/plans/pomodoroEditor.js` owns plan Pomodoro settings UI, runtime status rendering, runtime command buttons, and active-page polling.
- `src/js/options/plans/scheduleEditor.js` owns plan schedule UI, draft and selected-schedule state, schedule graph expansion state, schedule persistence, and schedule validation. `controller.js` supplies the render callback and clears schedule UI state when a plan is deleted.
- `src/js/options/plans/scheduleModel.js` owns plan-schedule normalization helpers shared by migration and the schedule editor.
- `src/js/options/schedules/scheduleBoard.js` owns the reusable weekly schedule graph and drag/resize interaction used by plan schedules.
- `src/js/options/schedules/scheduleBoardInspector.js` owns the schedule inspector form, day presets, recurrence controls, validation message, and action buttons.
- `src/js/options/schedules/scheduleBoardModel.js` owns pure schedule-board helpers such as schedule cloning, selected-draft resolution, date normalization, recurrence bounds, and draft completeness checks.
- `src/js/options/schedules/scheduleBoardSummary.js` owns the compact saved-time-block summary shown above the schedule graph.
- `src/js/content/plans.js` owns the non-module content-script adapter used by website blocking and UI-rule filtering.

Legacy standalone groups, schedules, and whitelist entries are migration inputs. The options page first converts old `websiteGroups` arrays into `group_*` records with an awaitable migration, then migrates `group_*` records into plan-owned entries, `schedules` into plan schedules, and `whitelistedSites` into plan allowed sites. The retired standalone editor modules have been removed; future compatibility work should happen in `src/js/options/legacyMigration.js`, `src/js/shared/legacyMigration.js`, and the plan model instead of reintroducing hidden global editors.

Billing behavior is intentionally dormant and provider-neutral:

- `src/js/shared/billing.js` owns the tested entitlement and billing config model.
- `src/js/options/billing.js` owns the hidden options-page supporter panel. It renders only when `billingIntegration.enabled` is set in storage.
- Provider checkout, webhook handling, and entitlement truth must live on a backend, not inside the extension package.

## UI Element Blocking

UI element blocking is split into ordered content-script modules:

- `src/js/content/ui-blocking/constants.js`: storage keys, attributes, defaults, and shared constants.
- `src/js/content/ui-blocking/fingerprint.js`: element fingerprints, labels, roles, target selection, and picker hit testing.
- `src/js/content/ui-blocking/matcher.js`: structural matching and match scoring.
- `src/js/content/ui-blocking/storage.js`: sync storage migration, split-rule storage, quota reserve checks, and rule persistence.
- `src/js/content/ui-blocking/dom.js`: applying saved rules, previewing candidate rules, hiding/restoring elements, and mutation observation.
- `src/js/content/ui-blocking/pickerStyle.js`: picker highlight and panel CSS injection.
- `src/js/content/ui-blocking/pickerPanel.js`: picker copy, theme sync, draggable panel rendering, and picker controls.
- `src/js/content/ui-blocking/controller.js`: public entry points, picker lifecycle, rule creation, preview orchestration, and content-script event wiring.

The public content-script API remains:

- `window.DAD.createElementBlockRule`
- `window.DAD.applyElementBlockRules`
- `window.DAD.startElementPicker`

Future work should keep new UI blocking behavior inside the narrowest module that owns it. For example, selector or diagnostic changes belong near fingerprint/matcher code, preview matching belongs in `ui-blocking/dom.js`, picker panel presentation belongs in `ui-blocking/pickerPanel.js`, and picker CSS belongs in `ui-blocking/pickerStyle.js`.

## Page Blocking

Main page blocking is also split into ordered content-script modules:

- `src/js/content/content-blocking/constants.js`: score thresholds, message names, overlay IDs, event options, and timing constants.
- `src/js/content/content-blocking/overlayMessages.js`: blocked-overlay localized message fallback resolution.
- `src/js/content/content-blocking/overlayStyle.js`: blocked-overlay host style and theme-variable CSS injection.
- `src/js/content/content-blocking/overlayTheme.js`: blocked-overlay UI-mode sync with extension theme settings and system color-scheme changes.
- `src/js/content/content-blocking/overlayDiagnostics.js`: blocked-overlay trigger, score, and context diagnostics rendering.
- `src/js/content/content-blocking/overlayPomodoro.js`: blocked-overlay Pomodoro strict-break timer rendering and stale Pomodoro-only block clearing.
- `src/js/content/content-blocking/overlayEvents.js`: blocked-page event suppression and event-guard installation.
- `src/js/content/content-blocking/overlay.js`: thin blocked-overlay controller that assembles, updates, and keeps the overlay mounted.
- `src/js/content/content-blocking/media.js`: audio, video, iframe, embed, and object suspension.
- `src/js/content/content-blocking/blocker.js`: the central `blockPage` action and runtime tab-mute messaging.
- `src/js/content/content-blocking/keywords.js`: keyword context extraction, text-node scanning, score updates, badge updates, and mutation observation.
- `src/js/content/content-blocking/siteCheck.js`: storage lookup, plan allowed-site checks, matching plan-owned or legacy website groups, and starting scans.
- `content.js`: bootstrap, runtime message handling, and BFCache/pageshow reinitialization.

Blocking diagnostics start in `content-blocking/keywords.js`, where score contributions are recorded into local page state. `content-blocking/overlayDiagnostics.js` renders the concise reason on the blocked overlay. Future diagnostic expansion should stay near `content-blocking/keywords.js` and `content-blocking/siteCheck.js`, because those modules know which keyword or group caused risk to rise. Future intervention work should start near `content-blocking/blocker.js` and `content-blocking/media.js`.

## Future Protection Model

The emerging product model lives in `docs/protection-model.md`.

The plan-based structure that should guide options-page and storage work lives in `docs/plans-architecture.md`.

The dormant payment and entitlement foundation lives in `docs/billing-entitlements.md`.

Release-hardening expectations live in `docs/release-readiness.md`.

New protection features should avoid becoming one large content script again. Prefer dedicated modules for:

- Signals.
- Risk scoring.
- Interventions.
- Diagnostics.
- Plans.
- Trust windows.

The first local signal collector is split by runtime:

- `src/js/shared/pageSignals.js` is the tested ES-module collector shape, including bounded visible-text topic tokens and summarized activity signals.
- `src/js/content/page-signals/activity.js` owns page-local active time, scroll/click/input counters, recommender-zone click detection, and bounded interaction-rate summaries.
- `src/js/content/page-signals/collector.js` owns the classic content-script page-signal collector shape, including bounded visible-text token extraction and media/structure counts.
- `src/js/content/page-signals/reporter.js` owns top-frame signal reporting, duplicate-report suppression, URL-change detection, history hooks, and mutation-observer scheduling.
- `src/js/content/pageSignals.js` is the thin classic content-script controller that exposes `window.DAD.PageSignals`, installs listeners, and answers popup/background message requests.
- `src/js/shared/intentCoherence.js` is the compatibility barrel for the tested shared intent coherence API. Keep existing imports pointed there unless a caller has a narrow reason to import a submodule directly.
- `src/js/shared/intent/constants.js` owns intent storage keys, default settings, action names, risk states, Pomodoro influence modes, and bounded numeric sets.
- `src/js/shared/intent/settings.js` owns plan intent-settings normalization.
- `src/js/shared/intent/signals.js` owns token extraction, page-signal normalization, navigation-transition normalization, and token similarity helpers.
- `src/js/shared/intent/feedback.js` owns feedback normalization, feedback summaries, and local feedback calibration.
- `src/js/shared/intent/state.js` owns trajectory state construction, tab-lineage normalization, lineage queries, and drift-descendant tab selection.
- `src/js/shared/intent/scoring.js` owns load metrics, session metrics, coherence scoring, and risk-state classification.
- `src/js/shared/intent/visits.js` owns visit/session construction, visit/session mutation, pruning, and tab-session helpers.
- `src/js/shared/intent/trajectory.js` owns public page-visit, navigation, tab-lifecycle, feedback, and active-session recording functions.
- `src/js/shared/intent/interventions.js` owns recovery-visit selection, user-facing reason lines, intervention decisions, and chain-block metadata.
- `src/js/shared/usageStats.js` owns tested bounded hostname-level usage aggregates. It stores counts, timing summaries, and coarse tab/window pressure maxima only, not raw page text, full URLs, titles, topic tokens, tab URLs, tab titles, or tab identities.
- `src/js/background/intentCoherence.js` records page summaries and `chrome.tabs` opener lineage into `chrome.storage.local` under `intentTrajectoryState`, records bounded local usage aggregates under `usageStats`, resolves the effective plan-owned intent policy, applies local feedback calibration, exposes tab-aware intervention state to content scripts and diagnostics UI, and detaches the active tab from inherited opener lineage when the user isolates the current page.
- `src/js/content/intent/constants.js` owns intent-intervention content-script constants.
- `src/js/content/intent/messages.js` owns intent-intervention localized fallback copy.
- `src/js/content/intent/style.js` owns intent prompt and grayscale CSS injection.
- `src/js/content/intent/theme.js` owns intent prompt UI-mode syncing.
- `src/js/content/intent/prompt.js` owns intent prompt DOM rendering and prompt button construction.
- `src/js/content/intentIntervention.js` owns intent-intervention polling, dismissal state, feedback messages, grayscale application, and action wiring for proportional drift interventions. Depending on the active plan policy, it can warn, desaturate the page with grayscale, show a return/isolate prompt, show a modal drift-chain block, or show a non-continue current-page chain quarantine for locked/drift-descendant block actions with a cooldown before isolation.
- `src/js/options/intentDiagnostics.js` renders the options-page intent diagnostics panel with policy source, score reasons, score signals, recent trajectory, clear, and user-triggered local JSON export.
- `src/js/options/usageStats.js` renders the options-page Usage panel, clear control, and user-triggered local JSON export for local hostname aggregates.
- `src/js/options/plans/intentEditor.js` owns plan-level intent settings: enabled state, intervention action, thresholds, local auto-calibration, and Pomodoro influence.
- `src/js/popup.js` is the compact popup bootstrap. Popup features are split under `src/js/popup/`: `panelSet.js` assembles the panel modules, `elementPickerLauncher.js` starts the UI picker, `diagnosticsExport.js` builds/copies local diagnostics, `events.js` binds popup actions, `refreshLoop.js` owns polling intervals, and the existing panel modules render protection, Page Signals, block diagnostics, intent diagnostics, and Pomodoro status.

The intent layer is plan-aware, but it is still not a full browser-navigation quarantine. It records bounded local diagnostic state, prunes trajectory sessions by the strictest active plan retention setting, evaluates the current page against the active plan policy, and can intervene proportionally when coherence collapses. Local feedback can conservatively adjust the effective intervention threshold when plan auto-calibration is enabled, but it does not lower the configured locked threshold. Current proportional content-script actions are warn-only, grayscale page, return prompt, modal drift-chain block, and current-page hard chain quarantine for locked or drift-descendant block actions. Hard quarantine includes a cooldown that delays isolation while keeping Return available. Opener-based tab lineage and top-frame `chrome.webNavigation` transition summaries are tracked, but DaD does not yet suspend or close every drift-descendant tab automatically.

Pomodoro is split across plan configuration, runtime, and local activity:

- `src/js/shared/pomodoro.js` is the compatibility barrel for the tested shared Pomodoro API. Keep existing imports pointed there unless a caller has a narrow reason to import a submodule directly.
- `src/js/shared/pomodoro/constants.js` owns Pomodoro storage keys, phase names, pause reasons, system states, default settings, and bounded constants.
- `src/js/shared/pomodoro/settings.js` owns plan Pomodoro settings normalization.
- `src/js/shared/pomodoro/activity.js` owns local activity-state normalization and active/away/system-state updates.
- `src/js/shared/pomodoro/history.js` owns local Pomodoro history normalization, daily reset behavior, recent event bounding, and local aggregate counters.
- `src/js/shared/pomodoro/runtime.js` owns runtime phase transitions, pause/resume/reset, system-rest credit, required rest, remaining time, and active-state checks.
- `src/js/shared/pomodoro/status.js` owns display-oriented Pomodoro status summaries and duration formatting.
- `src/js/background/pomodoro.js` is the background Pomodoro entry barrel imported by `src/js/background.js`.
- `src/js/background/pomodoro/constants.js` owns background-only alarm, suppression, and protected-schedule message constants.
- `src/js/background/pomodoro/chromeStorage.js` owns Chrome sync/local storage wrappers, runtime/activity/history persistence, and alarm scheduling.
- `src/js/background/pomodoro/autoStartSuppression.js` owns manual-reset auto-start suppression state.
- `src/js/background/pomodoro/planSelection.js` owns active/startable/runtime plan selection helpers.
- `src/js/background/pomodoro/history.js` owns background transition-history event emission.
- `src/js/background/pomodoro/engine.js` owns timer truth, runtime reconciliation, auto-start, strict-break protected command guards, system idle/locked reconciliation, and popup/options payloads.
- `src/js/background/pomodoro/notifications.js` owns best-effort tab notifications for runtime changes and strict-break reset clearing.
- `src/js/background/pomodoro/initializer.js` owns Chrome event listener registration, idle detection startup, alarm wakeups, and runtime message routing.
- `src/js/content/pomodoro/activity.js` sends throttled top-frame activity pings for local active/away status.
- `src/js/content/pomodoro/miniPanelState.js` owns local-only mini-panel UI-state persistence and normalization.
- `src/js/content/pomodoro/miniPanelStyle.js` owns mini-panel CSS injection and shared layout constants. It must load before the mini-panel controller.
- `src/js/content/pomodoro/miniPanelTheme.js` owns mini-panel UI-mode sync with extension theme settings and system color-scheme changes.
- `src/js/content/pomodoro/miniPanelLayout.js` owns mini-panel persisted layout state, drag, resize, viewport clamping, minimized state, and responsive size flags.
- `src/js/content/pomodoro/miniPanelRender.js` owns mini-panel runtime/status row rendering and display formatting.
- `src/js/content/pomodoro/miniPanel.js` is the thin optional on-page Pomodoro mini-panel controller opened from the popup. It wires DOM construction, refresh, close/open behavior, and the public content-script API.
- `src/js/content/content-blocking/siteCheck.js` applies strict-break blocking when a Pomodoro break is active for the current plan.
- `src/js/content/content-blocking/overlayPomodoro.js`, `src/js/content/content-blocking/overlay.js`, and `src/blocked.html` render Pomodoro timer status on blocked pages.
