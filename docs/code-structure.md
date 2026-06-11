# Code Structure

DaD is moving toward small modules grouped by runtime surface and product responsibility.

The detailed modularization target, dependency rules, file-size budgets, and migration phases live in [DaD Modularization Roadmap](modularization-roadmap.md). Parallel ownership rules live in [Parallel Development Coordination](parallel-development.md). The external Chrome extension architecture constraints behind that roadmap are summarized in [Extension Architecture Research](extension-architecture-research.md).

## Runtime Areas

`src/js/background` contains extension background/service-worker behavior.

`src/js/content` contains page-injected content scripts. These files are loaded by `manifest.json` in order and are not ES modules, so shared content-script APIs attach to `window.DAD`. Feature-specific content scripts should live in subfolders while preserving the manifest order.

`src/js/options` contains options-page-only UI helpers and page behavior. Feature-specific option modules should live in a feature subfolder instead of adding more files directly to this folder.

`src/js/popup` contains popup-only helper modules. The root `src/js/popup.js` is still the popup entry point, but generic Chrome messaging, DOM helpers, formatting helpers, popup shell behavior, popup i18n, the protection summary, the Page Signals panel, the Block Diagnostics panel, the Intent Diagnostics panel, and the Pomodoro panel now live in `src/js/popup/chrome.js`, `src/js/popup/dom.js`, `src/js/popup/format.js`, `src/js/popup/shell.js`, `src/js/popup/i18n.js`, `src/js/popup/protectionSummaryPanel.js`, `src/js/popup/pageSignalsPanel.js`, `src/js/popup/blockDiagnosticsPanel.js`, `src/js/popup/intentDiagnosticsPanel.js`, and `src/js/popup/pomodoroPanel.js`. Future popup work should move one feature panel at a time out of the entry file.

`src/css/popup.css` is a thin popup stylesheet entry point. It imports focused files from `src/css/popup`: `tokens.css` for theme variables, `layout.css` for shell/card/tab structure, `controls.css` for fields and buttons, `status.css` for protection badges and status grids, `pomodoro.css` for the popup timer panel, and `diagnostics.css` for Page Signals, block diagnostics, and intent diagnostics. Future popup styling should go into the narrowest matching CSS module instead of growing the entry file.

`src/css/style.css` is a thin options-page stylesheet entry point. It imports focused files from `src/css/options`: `tokens.css` for theme variables and base controls, `layout.css` for the page shell and sidebar navigation, `settings.css` for global settings cards, `blocked-ui.css` for UI element rules, `plans.css` for plan rows and plan pages, `diagnostics.css` for intent and usage diagnostics, `actions.css` for action states and password controls, `dialogs.css` for overlays and export/import actions, `responsive.css` for options-page breakpoints, and `schedule.css` for the weekly schedule editor. Future options styling should go into the narrowest matching CSS module instead of growing the entry file.

`src/js/shared` contains ES modules used by option/background code and tests.

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
- `src/js/options/scheduleBoard.js` owns the reusable weekly schedule graph and drag/resize interaction used by plan schedules.
- `src/js/options/scheduleBoardInspector.js` owns the schedule inspector form, day presets, recurrence controls, validation message, and action buttons.
- `src/js/options/scheduleBoardModel.js` owns pure schedule-board helpers such as schedule cloning, selected-draft resolution, date normalization, recurrence bounds, and draft completeness checks.
- `src/js/options/scheduleBoardSummary.js` owns the compact saved-time-block summary shown above the schedule graph.
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
- `src/js/content/content-blocking/overlay.js`: blocked-page overlay rendering and blocked-page event guards.
- `src/js/content/content-blocking/media.js`: audio, video, iframe, embed, and object suspension.
- `src/js/content/content-blocking/blocker.js`: the central `blockPage` action and runtime tab-mute messaging.
- `src/js/content/content-blocking/keywords.js`: keyword context extraction, text-node scanning, score updates, badge updates, and mutation observation.
- `src/js/content/content-blocking/siteCheck.js`: storage lookup, plan allowed-site checks, matching plan-owned or legacy website groups, and starting scans.
- `content.js`: bootstrap, runtime message handling, and BFCache/pageshow reinitialization.

Blocking diagnostics start in `content-blocking/keywords.js`, where score contributions are recorded into local page state. `content-blocking/overlay.js` can render a concise reason on the blocked overlay. Future diagnostic expansion should stay near `content-blocking/keywords.js` and `content-blocking/siteCheck.js`, because those modules know which keyword or group caused risk to rise. Future intervention work should start near `content-blocking/blocker.js` and `content-blocking/media.js`.

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
- `src/js/content/pageSignals.js` is the classic content-script adapter that reports top-frame page summaries on navigation, throttled DOM changes, and summarized scroll/click/input activity.
- `src/js/shared/intentCoherence.js` owns the tested trajectory model, bounded tab opener lineage, token extraction, metadata/text similarity, coherence scoring, intervention decisions, hard chain-quarantine decision metadata, stable chain cooldown metadata, plan-owned diagnostics retention, local feedback calibration, and recovery-target selection.
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
- `src/js/popup.js` renders the compact popup control surface: current protection status, UI picker controls, Pomodoro runtime controls, collapsible page-signal diagnostics, current-tab block/media/mute diagnostics with local copy support, and collapsible intent diagnostics with score reasons and clear support.

The intent layer is plan-aware, but it is still not a full browser-navigation quarantine. It records bounded local diagnostic state, prunes trajectory sessions by the strictest active plan retention setting, evaluates the current page against the active plan policy, and can intervene proportionally when coherence collapses. Local feedback can conservatively adjust the effective intervention threshold when plan auto-calibration is enabled, but it does not lower the configured locked threshold. Current proportional content-script actions are warn-only, grayscale page, return prompt, modal drift-chain block, and current-page hard chain quarantine for locked or drift-descendant block actions. Hard quarantine includes a cooldown that delays isolation while keeping Return available. Opener-based tab lineage and top-frame `chrome.webNavigation` transition summaries are tracked, but DaD does not yet suspend or close every drift-descendant tab automatically.

Pomodoro is split across plan configuration, runtime, and local activity:

- `src/js/shared/pomodoro.js` owns tested Pomodoro settings, runtime, phase, activity-state, rest-credit, and local history helpers.
- `src/js/background/pomodoro.js` owns timer truth, alarms, local runtime state, activity state, local history state, auto-start, system idle/locked reconciliation, and popup/options messages.
- `src/js/content/pomodoro/activity.js` sends throttled top-frame activity pings for local active/away status.
- `src/js/content/pomodoro/miniPanelState.js` owns local-only mini-panel UI-state persistence and normalization.
- `src/js/content/pomodoro/miniPanelStyle.js` owns mini-panel CSS injection and shared layout constants. It must load before `miniPanel.js`.
- `src/js/content/pomodoro/miniPanel.js` renders the optional on-page Pomodoro mini-panel opened from the popup and owns runtime refresh, drag, resize, and close/open behavior.
- `src/js/content/content-blocking/siteCheck.js` applies strict-break blocking when a Pomodoro break is active for the current plan.
- `src/js/content/content-blocking/overlay.js` and `src/blocked.html` render Pomodoro timer status on blocked pages.
