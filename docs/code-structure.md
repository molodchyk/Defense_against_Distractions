# Code Structure

DaD is moving toward small modules grouped by runtime surface and product responsibility.

The detailed modularization target, dependency rules, file-size budgets, and migration phases live in [DaD Modularization Roadmap](modularization-roadmap.md). The reusable cross-extension version lives in [Extension Modularization Playbook](extension-modularization-playbook.md). Ownership and coordination rules live in [Development Coordination](parallel-development.md). The external Chrome extension architecture constraints behind that roadmap are summarized in [Extension Architecture Research](extension-architecture-research.md).

## Runtime Areas

`src/app` contains extension runtime entries. `src/app/background/index.js` is the MV3 service-worker entry: it registers Chrome listeners and initializes feature/background runtimes, but it should not own product behavior. `src/app/popup/index.js` is the popup page entry: it initializes popup shell state, panel modules, refresh loops, storage listeners, and event bindings. `src/app/options/index.js` is the options page entry: it initializes language/theme state, the password gate, migrations, plans, diagnostics, settings, storage transfer, and lock-state polling. `src/app/instructions/index.js` is the instructions page entry: it applies the shared language and theme helpers to the static guide page.

`src/features` contains feature-owned source modules that are not runtime entry points. New cross-surface product behavior should move here when it can be imported by extension pages or the MV3 module service worker without depending on manifest content-script order.

`src/features/content-blocking/background/runtime.js` owns background message routing and tab lifecycle hooks for page blocking, including badge updates, top-frame block requests, and mute-state delegation. `src/features/content-blocking/background/tabMute.js` owns blocked-page tab mute state for that runtime.

The root `src/js` folder should contain only legacy runtime entries that are still loaded directly by manifest or extension HTML constraints. At this point those are `src/js/content.js` and `src/js/blockedScript.js`; do not add new helper modules there.

`src/js/background` contains background/service-worker adapters and compatibility barrels for existing background feature modules. New background behavior should go into a feature-owned module first, with `src/app/background/index.js` or a narrow background adapter only registering listeners and routing messages.

`src/js/content` contains page-injected content scripts. These files are loaded by `manifest.json` in order and are not ES modules, so shared content-script APIs attach to `window.DAD`. Feature-specific content scripts should live in subfolders while preserving the manifest order.

`src/js/content/uiLanguage.js` owns the classic content-script localization bridge, including selected-locale message loading and right-to-left attributes for extension-owned injected UI. It must not change the host page's document direction.

`src/js/options` contains options-page-only feature modules used by the app entry `src/app/options/index.js`. Feature-specific option modules should live in a feature subfolder instead of adding more files directly to this folder.

`src/js/options/password/manager.js` owns options-page password management, the password overlay gate, password button state, and protected-schedule disabling of password changes. `src/js/options/password/crypto.js` owns the WebCrypto helpers used by that module.

`src/js/options/storage-transfer/model.js` owns the pure full-settings export/import schema and the narrower shareable ruleset schema. Full settings export uses `dad.settings.v1`; ruleset export uses `dad.ruleset.v1` and deliberately excludes local UI preferences, custom blocked-page notes, passwords, billing state, runtime state, usage stats, and diagnostics.

`src/js/popup` contains popup-only helper modules. The app entry `src/app/popup/index.js` bootstraps these helpers: it initializes language/theme state, creates the panel set, starts refresh loops, handles storage changes, and binds events. Generic Chrome messaging, DOM helpers, formatting helpers, popup shell behavior, popup i18n, panel construction, UI picker launching, diagnostics export, event binding, refresh intervals, the protection summary, the Page Signals panel, the Block Diagnostics panel, and the Pomodoro panel live in focused modules under `src/js/popup/`. `popup/pageSignalsPanel.js` owns current-page signal counts, passive-region summaries, plus ephemeral keyword-idea derivation and copy formatting from bounded page-signal tokens. `popup/shell.js` owns the Control/Inspect tablist state, local pane persistence, keyboard navigation, theme loading, and storage reactions that affect the whole popup shell. Popup intent UI lives under `src/js/popup/intent/` for diagnostics, compact score-signal breakdowns, and recovery actions. Popup usage summaries live under `src/js/popup/usage/` and render in the Inspect pane with other read-only diagnostics. The Inspect action bar owns local diagnostics copy and copy-then-feedback actions; feedback opens externally only after the local copy succeeds. Future popup work should go into the narrowest matching popup module instead of expanding the entry file.

`src/css/popup.css` is a thin popup stylesheet entry point. It imports focused files from `src/css/popup`: `tokens.css` for theme variables, `layout.css` for shell/card/tab structure, `controls.css` for fields and buttons, `status.css` for protection badges and status grids, `pomodoro.css` for the popup timer panel, `diagnostics.css` for Page Signals, block diagnostics, usage summaries, and intent diagnostics, and `intent-recovery.css` for the Session coherence path and accountable Continue control. Future popup styling should go into the narrowest matching CSS module instead of growing the entry file.

`src/css/style.css` is a thin options-page stylesheet entry point. It imports focused files from `src/css/options`: `tokens.css` for theme variables and base controls, `layout.css` for the page shell and sidebar navigation, `settings.css` for global settings cards, `blocked-ui.css` for UI element rules, `plans.css` for plan rows and plan pages, `diagnostics.css` for intent and usage diagnostics, `actions.css` for action states and password controls, `dialogs.css` for overlays and export/import actions, `responsive.css` for options-page breakpoints, and `schedule.css` for the weekly schedule editor. Future options styling should go into the narrowest matching CSS module instead of growing the entry file.

`src/js/shared` contains ES modules used by option/background code and tests.

- `src/js/shared/keywords.js` owns shared keyword parsing helpers, including structural/time/passive-surface keyword parsing, explicit 100-point keyword score authoring tokens, and normalized 0-100 diagnostics score helpers.

Shared schedule helpers live under `src/js/shared/schedules/`:

- `src/js/shared/schedules/scheduleForm.js` owns schedule form defaults, display formatting, typed time normalization, and unnamed schedule naming.
- `src/js/shared/schedules/scheduleGrid.js` owns weekly-grid constants, the current-time marker model, and pure range helpers for click, drag, move, and resize interactions.
- `src/js/shared/schedules/scheduleRules.js` owns overlap, minimum-unlocked-time, and strictness validation.
- `src/js/shared/schedules/scheduleSummary.js` owns compact schedule count and activity summary text.
- `src/js/shared/schedules/scheduleTime.js` owns time conversion, active-schedule checks, recurrence matching, and schedule activity counts.

New schedule behavior should go into this subfolder instead of adding files directly to `src/js/shared`.

Shared plan helpers live under `src/js/shared/plans/`:

- `src/js/shared/plans/protectedScheduleChanges.js` owns the pure strictness policy for plan edits during locked schedules. Options UI should call through this shared comparator instead of duplicating protected-schedule edit rules.

Shared storage helpers live under `src/js/shared/storage/`:

- `src/js/shared/storage/chromeStorage.js` owns Promise wrappers around `chrome.storage.sync`.
- `src/js/shared/storage/criticalScheduleStorage.js` owns priority saving for plan data when forced schedule data must be preserved.

Shared UI helpers live under `src/js/shared/ui/`:

- `src/js/shared/ui/theme.js` owns UI-mode normalization and system-mode resolution.
- `src/js/shared/ui/uiLanguage.js` owns UI-language normalization, Chrome-locale fallback, right-to-left direction resolution, document language/direction attributes, and message formatting.

New storage or UI helpers should go into these subfolders instead of adding files directly to `src/js/shared`.

Shared blocked-page helpers live under `src/js/shared/blocked-page/`:

- `src/js/shared/blocked-page/settings.js` owns the pure storage key, defaults, and normalization for the custom note shown on blocked pages.

Shared self-state helpers live under `src/js/shared/self-state/`:

- `src/js/shared/self-state/focusState.js` owns the local popup Focus state signal, expiry normalization, and the conservative intent-threshold adjustment.

## Test Structure

Node tests live under `test/shared/` by product area:

- `test/shared/core/`: small shared primitives such as keywords, URLs, themes, UI language, release notice, and billing entitlement helpers.
- `test/shared/schedules/`: schedule time, validation, form, and weekly-grid model tests.
- `test/shared/plans/`: plan model, legacy migration, and group-rule tests.
- `test/shared/pomodoro/`: Pomodoro shared runtime and history model tests.
- `test/shared/signals/`: page-signal and usage-stat model tests.
- `test/shared/intent/`: intent coherence scoring, sessions, diagnostics, interventions, and tab-lineage tests.
- `test/shared/self-state/`: local user-state signals that affect protection conservatively.

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
- `src/js/options/plans/scheduleEditor.js` owns plan schedule UI, draft and selected-schedule state, default-wide schedule graph state, schedule persistence, and schedule validation. `controller.js` supplies the render callback and clears schedule UI state when a plan is deleted.
- `src/js/options/plans/scheduleModel.js` owns plan-schedule normalization helpers shared by migration and the schedule editor.
- `src/js/options/schedules/scheduleBoard.js` owns the reusable weekly schedule graph and drag/resize interaction used by plan schedules.
- `src/js/options/schedules/scheduleBoardInspector.js` owns the schedule inspector form, day presets, recurrence controls, validation message, and action buttons.
- `src/js/options/schedules/scheduleBoardModel.js` owns pure schedule-board helpers such as schedule cloning, selected-draft resolution, date normalization, recurrence bounds, and draft completeness checks.
- `src/js/options/schedules/scheduleBoardSummary.js` owns the compact saved-time-block summary shown above the schedule graph.
- `src/js/content/plans.js` owns the non-module content-script adapter used by website blocking and UI-rule filtering.

Global Blocked UI options behavior is split under `src/js/options/element-rules/`:

- `constants.js` owns UI-rule storage keys, picker strategy labels, fingerprint diagnostic fields, and fallback messages.
- `messages.js` owns localized message lookup for global UI-rule controls.
- `format.js` owns small display formatters used by UI-rule diagnostics and quota text.
- `storage.js` owns split sync-storage reads/writes, legacy rule migration, quota reserve checks, rule updates, deletion, and storage-usage measurement.
- `ruleItem.js` owns global UI-rule card rendering, editable controls, diagnostics, domain-scope action, deletion action, and plan-assignment checkboxes.
- `src/js/options/elementRules.js` is the thin entry that renders the list, storage-usage summary, empty state, and storage-change listener.

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
- `src/js/content/ui-blocking/actions.js`: applying saved rules, hiding/restoring elements, and bounded click-once / clear-field / pause-media rule actions.
- `src/js/content/ui-blocking/dom.js`: previewing candidate rules and mutation observation.
- `src/js/content/ui-blocking/builtInRules.js`: narrow built-in cosmetic cleanup rules such as ChatGPT message action controls.
- `src/js/content/ui-blocking/pickerStyle.js`: picker highlight and panel CSS injection.
- `src/js/content/ui-blocking/pickerPanel.js`: picker copy, theme sync, draggable panel rendering, and picker controls.
- `src/js/content/ui-blocking/controller.js`: public entry points, picker lifecycle, rule creation, preview orchestration, and content-script event wiring.

The public content-script API remains:

- `window.DAD.createElementBlockRule`
- `window.DAD.applyElementBlockRules`
- `window.DAD.startElementPicker`

Options-page UI rule management is split under `src/js/options/element-rules/`: `ruleItem.js` renders saved rule controls, diagnostics, plan assignment, and protected-schedule feedback; `storage.js` owns reads, writes, split-rule migration, delete cleanup, storage-budget accounting, protected storage reserve checks, and locked-schedule guards that reject disabling or deleting active UI rules.

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
- `src/js/content/content-blocking/overlayCustomization.js`: blocked-overlay custom note storage sync and rendering.
- `src/js/content/content-blocking/overlay.js`: thin blocked-overlay controller that assembles, updates, and keeps the overlay mounted.
- `src/js/content/content-blocking/navigationGuards.js`: blocked-page `beforeunload` prompt suppression and immediate overlay reassertion after focus, visibility, and history/navigation-warning related events.
- `src/js/content/content-blocking/media.js`: audio, video, iframe, embed, and object suspension.
- `src/js/content/content-blocking/blocker.js`: the central `blockPage` action and runtime tab-mute messaging.
- `src/js/content/content-blocking/structuralTriggers.js`: explicit `has:*` keyword conditions that turn page media, currently audible playback, feed/recommendation/comment/short-form surfaces, links, and bounded page/active seconds into normal score contributions.
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

- `src/js/shared/pageSignals.js` is the tested ES-module collector shape, including bounded visible-text, heading, meta-description, clicked-link, and selected-text topic tokens, passive recommendation/comment/short-form region counts, plus summarized activity signals.
- `src/js/content/page-signals/contextTokens.js` owns bounded clicked-link and selected-text token extraction for transient click context.
- `src/js/content/page-signals/recommenderZones.js` owns generic, conservative repeated-card/grid, and site-specific recommendation/feed/comment zone classification for page activity signals.
- `src/js/content/page-signals/activityScroll.js` owns bounded scroll counts, distance in viewport units, direction reversals, depth, and recent-scroll timing.
- `src/js/content/page-signals/activityInput.js` owns bounded key/input counts and active editable-field focus duration without storing field values, labels, selectors, or typed text.
- `src/js/content/page-signals/activityMedia.js` owns bounded visible media-playback time, play/pause/end counts, and transient source-change counts without reporting media URLs, titles, captions, or source strings.
- `src/js/content/page-signals/activity.js` owns page-local active time, click counters, bounded dynamic-content append counts, recommendation/feed/comment zone click counting, click-context token handoff, and bounded interaction-rate aggregation.
- `src/js/content/page-signals/collector.js` owns the classic content-script page-signal collector shape, including bounded visible-text, heading, meta-description, clicked-link, and selected-text token extraction plus media/structure counts, passive recommendation/comment/short-form region counts, and the local currently audible media count.
- `src/js/content/page-signals/reporter.js` owns top-frame signal reporting, duplicate-report suppression, URL-change detection, history hooks, and mutation-observer scheduling.
- `src/js/content/pageSignals.js` is the thin classic content-script controller that exposes `window.DAD.PageSignals`, installs listeners, and answers popup/background message requests.
- `src/js/shared/intentCoherence.js` is the compatibility barrel for the tested shared intent coherence API. Keep existing imports pointed there unless a caller has a narrow reason to import a submodule directly.
- `src/js/shared/intent/constants.js` owns intent storage keys, default settings, action names, risk states, Pomodoro influence modes, and bounded numeric sets.
- `src/js/shared/intent/settings.js` owns plan intent-settings normalization and shared action-strictness helpers.
- `src/js/shared/intent/signals.js` owns flat and weighted token extraction, page-signal normalization, passive region-count normalization, navigation-transition normalization, and token similarity helpers.
- `src/js/shared/intent/signals/activitySignals.js` owns bounded activity-summary normalization for intent visits, including aggregate recommendation, separate recommendation/feed/comment interaction counters, and active editable-field duration.
- `src/js/shared/intent/loadMetrics.js` owns passive media, passive structure, media playback, interaction, active input, agency-ratio, recommender, redirect, navigation-loop, aggregate tab-pressure, recent tab-switch, dwell, and duration-total calculations used by scoring.
- `src/js/shared/intent/score/coherenceScore.js` owns the deterministic 0-100 coherence score and risk-state classification.
- `src/js/shared/intent/anchors/originAnchor.js` owns bounded origin-anchor confidence and unanchored-session load calculations for ambiguous sessions.
- `src/js/shared/intent/anchors/originDecay.js` owns sustained origin-decay calculations for chains that stay low-overlap with the origin while passive or loop pressure is high.
- `src/js/shared/intent/anchors/returnSignals.js` owns return-to-origin and return-to-hub load calculations for fragmented chains.
- `src/js/shared/intent/chains/mediaChain.js` owns repeated passive media-chain pressure calculations for video/audio sequences with contextual drift pressure.
- `src/js/shared/intent/searchRefinement.js` owns repeated-search-cycle and search-query-continuity load calculations from bounded weighted search tokens.
- `src/js/shared/intent/timingSignals.js` owns session-age, deliberate-action gap, visits-since-search/input/edit timing pressure, and contextual long-session pressure from bounded visit metadata.
- `src/js/shared/intent/transitions/navigationIntent.js` owns direct-navigation transition evidence from typed, bookmark, keyword/search, form-submit, and address-bar visits.
- `src/js/shared/intent/tabActivity.js` owns bounded active-tab activation history updates and recent tab-switch/loop summaries used by trajectory visits.
- `src/js/shared/intent/feedback.js` owns feedback normalization, bounded Continue-reason normalization, bounded post-intervention outcome annotations, Continue outcome summaries, feedback summaries, and local feedback calibration.
- `src/js/shared/intent/feedback/outcomes.js` owns bounded post-intervention outcome matching and outcome normalization for feedback entries.
- `src/js/shared/intent/state.js` owns trajectory state construction, tab-lineage and bounded tab-activation normalization, lineage queries, drift-descendant tab selection, and same-chain return target selection.
- `src/js/shared/intent/scoring.js` owns load metrics, session metrics, return-rate and tab-switch metrics, coherence scoring, and risk-state classification.
- `src/js/shared/intent/visits.js` owns visit/session construction, visit/session mutation, pruning, and tab-session helpers.
- `src/js/shared/intent/trajectory.js` owns public page-visit, navigation, tab-lifecycle, feedback, and active-session recording functions.
- `src/js/shared/intent/interventions.js` owns recovery-visit selection, user-facing reason lines, intervention decisions, and chain-block metadata.
- `src/js/shared/intent/graph.js` owns the bounded intent chain graph model, coherent/uncertain/drift labels, and capped coherent-host/drift-descendant host summaries used by diagnostics UI.
- `src/js/shared/usageStats.js` is the compatibility barrel for tested bounded hostname-level usage aggregates. The implementation lives under `src/js/shared/usage-stats/`: constants and retention limits, timestamp/hostname sanitizers, metric bucket aggregation, state normalization, page-signal recording, summaries, derived blocked outcome shares, and local JSON export payloads. It stores counts, timing summaries, page word counts, coarse tab/window pressure maxima, passive region maxima, and blocked/allowed aggregate outcome counters only, not raw page text, full URLs, titles, topic tokens, tab URLs, tab titles, or tab identities.
- `src/js/background/intentCoherence.js` is the background intent compatibility barrel imported by `src/app/background/index.js`.
- `src/js/background/intent/chromeApi.js` owns Chrome storage, tab pressure, open-tab enumeration, tab URL update, tab-discard, tab window moving, and tab-removal wrappers used by background intent runtime.
- `src/js/background/intent/storage.js` owns `intentTrajectoryState` and `usageStats` local-storage read/update helpers.
- `src/js/background/intent/policy.js` owns plan-owned intent-policy lookup, Pomodoro runtime influence, feedback summaries, and local feedback calibration.
- `src/js/background/intent/pageSignals.js` owns background recording of page-signal messages into intent trajectory and bounded usage stats.
- `src/js/background/intent/tabs.js` owns active-tab, created-tab, removed-tab, navigation-transition, drift-descendant tab return/move/suspend/close cleanup recording, and hard-quarantine chain return updates.
- `src/js/background/intent/diagnostics.js` owns intent diagnostics, intervention-state reads, hard-quarantine auto-return after cooldown, clear actions, and usage-stats diagnostic reads.
- `src/js/background/intent/messages.js` owns runtime message routing for intent diagnostics, interventions, page-signal recording, feedback, usage stats, and drift-descendant return/move/suspend/close cleanup.
- `src/js/background/intent/initializer.js` owns Chrome event listener registration for the background intent runtime.
- `src/js/content/intent/constants.js` owns intent-intervention content-script constants.
- `src/js/content/intent/messages.js` owns intent-intervention localized fallback copy.
- `src/js/content/intent/style.js` owns intent prompt and grayscale CSS injection.
- `src/js/content/intent/theme.js` owns intent prompt UI-mode syncing.
- `src/js/content/intent/prompt.js` owns intent prompt DOM rendering, prompt button construction, and the bounded reason field required before Continue.
- `src/js/content/intent/elementReduction.js` owns reversible recommendation/feed/comment container hiding for the reduce-noise intent action.
- `src/js/content/intent/newTabFreeze.js` owns reversible page-local suppression of link gestures that would open new tabs during active non-warning drift interventions.
- `src/js/content/intent/effects.js` owns applying and clearing reversible visual intent effects such as grayscale and reduce-noise.
- `src/js/content/intent/media.js` owns media pause/restore during block-style intent interventions by reusing the page-blocking media suspension API at runtime.
- `src/js/content/intent/continueMessage.js` owns the popup-to-content Continue message. It accepts only active prompt-style interventions, requires a bounded reason, records local continue feedback, dismisses the current content prompt, and refuses hard chain quarantine.
- `src/js/content/intentIntervention.js` owns intent-intervention polling, dismissal state, feedback messages, grayscale application, and action wiring for proportional drift interventions. Depending on the active plan policy, it can warn, desaturate the page with grayscale, show a return/isolate prompt, show a modal drift-chain block, or show a non-continue current-page chain quarantine for locked/drift-descendant block actions with a cooldown before isolation or opt-in automatic current-tab closure.
- `src/js/options/intentDiagnostics.js` renders the options-page intent diagnostics panel with policy source, score reasons, score signals, bounded chain graph, capped coherent-host/drift-descendant host counts, feedback/Continue outcome summaries, recent trajectory, clear, and user-triggered local JSON export.
- `src/js/options/intent-diagnostics/format.js` owns options-page intent diagnostics display formatters, including capped coherent-host/drift-descendant host count and Continue outcome text.
- `src/js/options/usageStats.js` renders the options-page Usage panel, clear control, and user-triggered local JSON export for local hostname aggregates.
- `src/js/options/plans/intentEditor.js` owns plan-level intent settings: enabled state, intervention action, thresholds, local auto-calibration, and Pomodoro influence.
- `src/app/popup/index.js` is the compact popup bootstrap. Popup features are split under `src/js/popup/`: `chrome.js` owns popup Chrome wrappers including Options, feedback, and local diagnostics graph opening, `shell.js` owns the semantic Control/Inspect tablist, local pane persistence, and shell-level theme behavior, `panelSet.js` assembles the panel modules, `elementPickerLauncher.js` starts the UI picker, `diagnosticsExport.js` builds/copies the Inspect-pane local diagnostics snapshot, `events.js` binds popup actions, `refreshLoop.js` owns polling intervals, and the existing panel modules render protection, Page Signals, block diagnostics, and Pomodoro status. `pageSignalsPanel.js` also owns the pure current-page keyword-idea helper and copy action. Popup intent behavior lives under `src/js/popup/intent/`: `intentDiagnosticsPanel.js` owns debug-state rendering, `intentRecoveryModel.js` owns pure session-coherence, compact timeline, active-intervention, and effective-policy display helpers, `intentRecoveryTimeline.js` owns compact timeline DOM rendering, `intentContinueControl.js` owns popup Continue availability and bounded reason-control state, `intentDriftTabActions.js` owns repeated drift-tab return/move/suspend/close runtime actions, and `intentRecoveryPanel.js` owns the main session-coherence card plus Return chain, Return, Continue, Isolate, Mark coherent, Show graph, and action orchestration.

The intent layer is plan-aware, but it is still not a full browser-navigation quarantine. It records bounded local diagnostic state, prunes trajectory sessions by the strictest active plan retention setting, evaluates the current page against the active plan policy, and can intervene proportionally when coherence collapses. Local feedback can conservatively adjust effective policy when plan auto-calibration is enabled: it can raise the effective intervention threshold and, after repeated failed outcomes, escalate warning/grayscale/reduce-noise one action step up to prompt level, but it does not lower the configured locked threshold or auto-upgrade prompts to hard blocking. Feedback entries can also receive a bounded outcome annotation from the next observed same-tab or same-session visit, limited to risk state, score, score delta, and return-to-recovery-host status, with Continue outcomes summarized separately as recovered versus drift-after-Continue. Continue choices from return-style prompts and popup prompt-style interventions require a short bounded local reason, Mark coherent/Trust this shift records explicit local false-positive feedback through the clean isolate/new-session path, and Show graph opens the local diagnostics graph for the current trajectory. Current proportional content-script actions are warn-only, grayscale page, reduce-noise element hiding, new-tab gesture freezing, return prompt, modal drift-chain block, and current-page hard chain quarantine for locked or drift-descendant block actions. Hard quarantine includes a cooldown that delays isolation while keeping Return available; after that cooldown it can automatically return the current tab plus known same-root drift descendants, or close the current quarantined tab when a plan explicitly enables the stricter auto-close setting. Opener-based tab lineage and top-frame `chrome.webNavigation` transition summaries are tracked, and hard quarantine can return, move to a separate window, suspend, or close other open same-chain drift-descendant tabs from explicit user actions.

Pomodoro is split across plan configuration, runtime, and local activity:

- `src/js/shared/pomodoro.js` is the compatibility barrel for the tested shared Pomodoro API. Keep existing imports pointed there unless a caller has a narrow reason to import a submodule directly.
- `src/js/shared/pomodoro/constants.js` owns Pomodoro storage keys, phase names, pause reasons, system states, default settings, and bounded constants.
- `src/js/shared/pomodoro/settings.js` owns plan Pomodoro settings normalization.
- `src/js/shared/pomodoro/activity.js` owns local activity-state normalization and active/away/system-state updates.
- `src/js/shared/pomodoro/history.js` owns local Pomodoro history normalization, daily reset behavior, recent event bounding, and local aggregate counters.
- `src/js/shared/pomodoro/runtime.js` is the compatibility barrel for runtime helpers. `runtimeState.js` owns runtime normalization, remaining time, and active checks. `runtimeDurations.js` owns phase duration and required-rest calculations. `runtimeRestCredit.js` owns system away/locked rest credit. `runtimeTransitions.js` owns start, pause, resume, reset, and phase completion.
- `src/js/shared/pomodoro/status.js` owns display-oriented Pomodoro status summaries, required-rest/rest-credit/rest-still-needed fields, and duration formatting.
- `src/js/background/pomodoro.js` is the background Pomodoro entry barrel imported by `src/app/background/index.js`.
- `src/js/background/pomodoro/constants.js` owns background-only alarm, suppression, and protected-schedule message constants.
- `src/js/background/pomodoro/chromeStorage.js` owns Chrome sync/local storage wrappers, runtime/activity/history persistence, and alarm scheduling.
- `src/js/background/pomodoro/autoStartSuppression.js` owns manual-reset auto-start suppression state.
- `src/js/background/pomodoro/planSelection.js` owns active/startable/runtime plan selection helpers.
- `src/js/background/pomodoro/history.js` owns background transition-history event emission.
- `src/js/background/pomodoro/runtimeReconciliation.js` owns background runtime transition helpers for away-rest credit, return-time phase resolution, and runtime-change detection.
- `src/js/background/pomodoro/engine.js` owns timer truth, auto-start, strict-break protected command guards, system idle/locked reconciliation, and popup/options payloads.
- `src/js/background/pomodoro/notifications.js` owns best-effort tab notifications for runtime changes and strict-break reset clearing.
- `src/js/background/pomodoro/initializer.js` owns Chrome event listener registration, idle detection startup, alarm wakeups, and runtime message routing.
- `src/js/content/pomodoro/activity.js` sends throttled top-frame activity pings for local active/away status.
- `src/js/content/pomodoro/miniPanelState.js` owns local-only mini-panel UI-state persistence and normalization.
- `src/js/content/pomodoro/miniPanelStyleConstants.js` owns mini-panel IDs, layout constants, and resize directions.
- `src/js/content/pomodoro/miniPanelStyleCss.js` owns the generated mini-panel CSS text.
- `src/js/content/pomodoro/miniPanelStyle.js` is the thin style facade that injects CSS and exposes the public `PomodoroMiniPanelStyle` API. These style scripts must load before the mini-panel controller.
- `src/js/content/pomodoro/miniPanelTheme.js` owns mini-panel UI-mode sync with extension theme settings and system color-scheme changes.
- `src/js/content/pomodoro/miniPanelLayout.js` owns mini-panel persisted layout state, drag, resize, viewport clamping, minimized state, and responsive size flags.
- `src/js/content/pomodoro/miniPanelRender.js` owns mini-panel runtime/status row rendering and display formatting.
- `src/js/content/pomodoro/miniPanel.js` is the thin optional on-page Pomodoro mini-panel controller opened from the popup. It wires DOM construction, refresh, close/open behavior, and the public content-script API.
- `src/js/content/content-blocking/siteCheck.js` applies strict-break blocking when a Pomodoro break is active for the current plan.
- `src/js/content/content-blocking/overlayPomodoro.js`, `src/js/content/content-blocking/overlay.js`, and `src/blocked.html` render Pomodoro timer status on blocked pages.
- `src/js/blockedScript.js` is the blocked-page module entry. Blocked-page Chrome API wrappers, localization including right-to-left document direction, theme sync, custom message rendering, and Pomodoro timer rendering live under `src/js/blocked/`.
- `src/js/options/settings/blockedPageSettings.js` owns the options-page Settings card for the local custom blocked-page note.
