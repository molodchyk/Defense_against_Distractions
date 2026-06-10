# Code Structure

DaD is moving toward small modules grouped by runtime surface and product responsibility.

## Runtime Areas

`src/js/background` contains extension background/service-worker behavior.

`src/js/content` contains page-injected content scripts. These files are loaded by `manifest.json` in order and are not ES modules, so shared content-script APIs attach to `window.DAD`.

`src/js/options` contains options-page-only UI helpers and page behavior.

`src/js/shared` contains ES modules used by option/background code and tests.

Plan behavior is split by runtime:

- `src/js/shared/plans.js` owns the tested ES-module plan model used by options code.
- `src/js/options/plans.js` owns the options-page plan UI.
- `src/js/options/scheduleBoard.js` owns the reusable weekly schedule board used by plan schedules.
- `src/js/content/plans.js` owns the non-module content-script adapter used by website blocking and UI-rule filtering.

Legacy standalone groups, schedules, and whitelist entries are migration inputs. The options page first converts old `websiteGroups` arrays into `group_*` records with an awaitable migration, then migrates `group_*` records into plan-owned entries, `schedules` into plan schedules, and `whitelistedSites` into plan allowed sites. The retired standalone editor modules have been removed; future compatibility work should happen in `src/js/options/legacyMigration.js`, `src/js/shared/legacyMigration.js`, and the plan model instead of reintroducing hidden global editors.

Billing behavior is intentionally dormant and provider-neutral:

- `src/js/shared/billing.js` owns the tested entitlement and billing config model.
- `src/js/options/billing.js` owns the hidden options-page supporter panel. It renders only when `billingIntegration.enabled` is set in storage.
- Provider checkout, webhook handling, and entitlement truth must live on a backend, not inside the extension package.

## UI Element Blocking

UI element blocking is split into ordered content-script modules:

- `elementBlockingConstants.js`: storage keys, attributes, defaults, and shared constants.
- `elementBlockingFingerprint.js`: element fingerprints, labels, roles, target selection, and picker hit testing.
- `elementBlockingMatcher.js`: structural matching and match scoring.
- `elementBlockingStorage.js`: sync storage migration, split-rule storage, quota reserve checks, and rule persistence.
- `elementBlockingDom.js`: applying saved rules, previewing candidate rules, hiding/restoring elements, and mutation observation.
- `elementBlocking.js`: public entry points, picker lifecycle, rule creation, and content-script event wiring.

The public content-script API remains:

- `window.DAD.createElementBlockRule`
- `window.DAD.applyElementBlockRules`
- `window.DAD.startElementPicker`

Future work should keep new UI blocking behavior inside the narrowest module that owns it. For example, selector or diagnostic changes belong near fingerprint/matcher code, while preview display changes belong in `elementBlockingDom.js`.

## Page Blocking

Main page blocking is also split into ordered content-script modules:

- `contentBlockingConstants.js`: score thresholds, message names, overlay IDs, event options, and timing constants.
- `contentBlockingOverlay.js`: blocked-page overlay rendering and blocked-page event guards.
- `contentBlockingMedia.js`: audio, video, iframe, embed, and object suspension.
- `contentBlockingBlocker.js`: the central `blockPage` action and runtime tab-mute messaging.
- `contentBlockingKeywords.js`: keyword context extraction, text-node scanning, score updates, badge updates, and mutation observation.
- `contentBlockingSiteCheck.js`: storage lookup, plan allowed-site checks, matching plan-owned or legacy website groups, and starting scans.
- `content.js`: bootstrap, runtime message handling, and BFCache/pageshow reinitialization.

Blocking diagnostics start in `contentBlockingKeywords.js`, where score contributions are recorded into local page state. `contentBlockingOverlay.js` can render a concise reason on the blocked overlay. Future diagnostic expansion should stay near `contentBlockingKeywords.js` and `contentBlockingSiteCheck.js`, because those modules know which keyword or group caused risk to rise. Future intervention work should start near `contentBlockingBlocker.js` and `contentBlockingMedia.js`.

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
- `src/js/content/intentIntervention.js` renders proportional drift interventions for `intervene` and `locked` states. Depending on the active plan policy, it can warn, desaturate the page with grayscale, show a return/isolate prompt, show a modal drift-chain block, or show a non-continue current-page chain quarantine for locked/drift-descendant block actions with a cooldown before isolation.
- `src/js/options/intentDiagnostics.js` renders the options-page intent diagnostics panel with policy source, score reasons, score signals, recent trajectory, clear, and user-triggered local JSON export.
- `src/js/options/usageStats.js` renders the options-page Usage panel, clear control, and user-triggered local JSON export for local hostname aggregates.
- `src/js/options/plans.js` owns plan-level intent settings: enabled state, intervention action, thresholds, local auto-calibration, and Pomodoro influence.
- `src/js/popup.js` renders the compact popup control surface: current protection status, UI picker controls, Pomodoro runtime controls, collapsible page-signal diagnostics, current-tab block/media/mute diagnostics with local copy support, and collapsible intent diagnostics with score reasons and clear support.

The intent layer is plan-aware, but it is still not a full browser-navigation quarantine. It records bounded local diagnostic state, prunes trajectory sessions by the strictest active plan retention setting, evaluates the current page against the active plan policy, and can intervene proportionally when coherence collapses. Local feedback can conservatively adjust the effective intervention threshold when plan auto-calibration is enabled, but it does not lower the configured locked threshold. Current proportional content-script actions are warn-only, grayscale page, return prompt, modal drift-chain block, and current-page hard chain quarantine for locked or drift-descendant block actions. Hard quarantine includes a cooldown that delays isolation while keeping Return available. Opener-based tab lineage and top-frame `chrome.webNavigation` transition summaries are tracked, but DaD does not yet suspend or close every drift-descendant tab automatically.

Pomodoro is split across plan configuration, runtime, and local activity:

- `src/js/shared/pomodoro.js` owns tested Pomodoro settings, runtime, phase, activity-state, rest-credit, and local history helpers.
- `src/js/background/pomodoro.js` owns timer truth, alarms, local runtime state, activity state, local history state, auto-start, system idle/locked reconciliation, and popup/options messages.
- `src/js/content/pomodoroActivity.js` sends throttled top-frame activity pings for local active/away status.
- `src/js/content/pomodoroMiniPanelState.js` owns local-only mini-panel UI-state persistence and normalization.
- `src/js/content/pomodoroMiniPanel.js` renders the optional on-page Pomodoro mini-panel opened from the popup.
- `src/js/content/contentBlockingSiteCheck.js` applies strict-break blocking when a Pomodoro break is active for the current plan.
- `src/js/content/contentBlockingOverlay.js` and `src/blocked.html` render Pomodoro timer status on blocked pages.
