# Storage Ownership

This document is the current ownership map for persistent DaD storage. It exists to make storage keys user-data contracts, not incidental implementation details.

Every new persistent key must name an owner before it ships. Renaming or moving an existing key needs a migration path and tests unless the key is explicitly temporary and safe to drop.

Required fields for each key or key family:

- storage area;
- owner feature;
- data shape/version;
- migration path;
- retention or pruning;
- quota risk;
- classification as user configuration, runtime state, diagnostics, or cache data.

## Chrome Sync Storage

Chrome sync storage is reserved for compact user configuration and mission-critical protection settings. It has tight total and per-item quotas, so large lists should use split key families.

### Plans

- Keys: `plans`, `planCounter`, `planMigrationState`.
- Storage area: `chrome.storage.sync`.
- Owner feature: `src/features/plans/core/` for the model, `src/js/options/plans/` for options-page mutation, and `src/features/plans/storage/criticalScheduleStorage.js` for priority saves under quota pressure.
- Data shape/version: current unversioned plan array plus counter and migration-state object. Each plan owns enabled state, groups, allowed sites, schedules, UI rule assignments, Pomodoro settings, intent settings, and bounded triggered-action chain configuration.
- Migration path: `src/js/options/plans/migration.js` creates and normalizes plan records, moves legacy standalone schedules and whitelists into plans, and records one-way migration flags in `planMigrationState`.
- Retention or pruning: durable until the user edits plans, imports replacement settings, deletes plans, or resets extension data. Empty schedule placeholders are normalized out on options startup.
- Quota risk: high because plans can contain website and keyword entries. Critical schedule storage preserves plan data first and may remove non-critical UI cleanup rules before retrying plan or schedule saves.
- Classification: user configuration and mission-critical protection data.

### Legacy Protection Inputs

- Keys: `websiteGroups`, `group_<id>`, `schedules`, `whitelistedSites`.
- Storage area: `chrome.storage.sync`.
- Owner feature: migration compatibility owned by `src/js/options/legacyMigration.js`, `src/js/shared/legacyMigration.js`, and `src/js/options/plans/migration.js`.
- Data shape/version: legacy standalone group arrays, split group records, standalone schedule arrays, and global whitelist arrays.
- Migration path: `websiteGroups` first migrates into `group_<id>` records, then group records, `schedules`, and `whitelistedSites` migrate into plan-owned records. Migrated legacy keys are removed after a successful options-page migration.
- Retention or pruning: retained only while needed for compatibility or failed/unfinished migration. They should not keep acting as hidden global rules after migration succeeds.
- Quota risk: medium to high for old group arrays and split group records. Migration reduces hidden duplication by moving rules into `plans`.
- Classification: legacy user configuration and migration data.

### UI Element Rules

- Keys: `elementBlockRuleIds`, `elementBlockRule.<id>`, and legacy `elementBlockRules`.
- Storage area: `chrome.storage.sync`.
- Owner feature: `src/js/options/element-rules/` for options-page rule management, `src/js/content/ui-blocking/` for content-script matching/actions, and `src/features/plans/storage/criticalScheduleStorage.js` for cleanup under protected-storage pressure.
- Data shape/version: current split index plus one sync item per rule. Legacy shape is a single `elementBlockRules` array.
- Migration path: `src/js/options/element-rules/storage.js` and `src/js/content/ui-blocking/storage.js` migrate the legacy array into split rule records and remove the legacy key after saving the split form.
- Retention or pruning: durable until the user deletes a rule, imports replacement settings, or resets extension data. Deleting a rule removes stale plan assignments. Enabled rules cannot be deleted or disabled during active protected schedules when doing so would relax protection.
- Quota risk: high because element fingerprints and labels can grow. Saves reserve sync quota for locked schedules, and critical schedule saves may remove non-critical UI rules before retrying.
- Classification: user configuration with some protection effect.

### Global UI Preferences

- Keys: `uiThemeMode`, `uiLanguage`, `blockedPageSettings`.
- Storage area: `chrome.storage.sync`.
- Owner feature: `src/js/shared/ui/theme.js`, `src/js/shared/ui/uiLanguage.js`, and `src/js/shared/blocked-page/settings.js`.
- Data shape/version: small unversioned preference strings and a normalized blocked-page settings object.
- Migration path: no historical rename. Normalizers accept missing or malformed values and fall back to defaults.
- Retention or pruning: durable until the user changes preferences, imports replacement settings, or resets extension data.
- Quota risk: low.
- Classification: user configuration.

### Password Gate

- Keys: `password`.
- Storage area: `chrome.storage.sync`.
- Owner feature: `src/js/options/password/manager.js` and `src/js/options/password/crypto.js`.
- Storage access boundary: `src/js/options/password/manager.js` calls `src/platform/chrome/storage.js` instead of raw Chrome storage callbacks.
- Data shape/version: encrypted Base64 password payload. The encryption key is local-only and stored separately under `key`.
- Migration path: no current rename. Password changes and deletion are blocked during protected schedules when they would relax protection.
- Retention or pruning: durable until the user deletes the password or resets extension data. Full settings export/import deliberately excludes it.
- Quota risk: low.
- Classification: user configuration and protection-lock data.

### Billing Stub

- Keys: `billingIntegration`, `billingIdentity`, `billingEntitlement`.
- Storage area: `chrome.storage.sync`.
- Owner feature: `src/js/shared/billing.js` and the hidden `src/js/options/billing.js` panel.
- Data shape/version: dormant provider-neutral config, identity, and entitlement objects.
- Migration path: no active provider migration. Storage transfer deliberately excludes these keys so ruleset/settings imports cannot overwrite account-like state.
- Retention or pruning: retained until reset or a future billing implementation defines a backend-backed lifecycle.
- Quota risk: low while dormant.
- Classification: user configuration and account-like state.

### Release Backup Notice

- Keys: `releaseBackupNoticeEligible.<version>`, `releaseBackupNoticeSeen.<version>`.
- Storage area: `chrome.storage.sync`.
- Owner feature: `src/js/shared/releaseBackupNotice.js`, `src/js/background/releaseNotice.js`, and `src/js/options/releaseNotice.js`.
- Data shape/version: version-suffixed Boolean flags.
- Migration path: version suffix creates a new key family when a release notice needs to run for a later release.
- Retention or pruning: retained as tiny release-state flags until reset. Old version flags are safe to leave because they are small and inert.
- Quota risk: low.
- Classification: runtime/release state.

## Chrome Local Storage

Chrome local storage is used for local-only runtime state, diagnostics, history, and UI state. It should not sync across devices and should be bounded or clearable when it can grow.

### Intent Trajectory Diagnostics

- Key: `intentTrajectoryState`.
- Storage area: `chrome.storage.local`.
- Owner feature: `src/js/shared/intent/` for state shape and pruning, `src/js/background/intent/storage.js` for persistence, and intent diagnostics UI under options and popup modules.
- Data shape/version: bounded unversioned trajectory state containing sessions, visits, tab lineage, feedback, intervention state, and aggregate chain diagnostics. It intentionally stores bounded tokens and host summaries rather than raw page text or full browsing history.
- Migration path: normalizers tolerate missing or malformed state. Future schema changes should add migration tests under `test/shared/intent/trajectory/`.
- Retention or pruning: pruned by plan-owned diagnostics retention, using the strictest active plan retention window. Options exposes clear and local JSON export controls.
- Quota risk: medium. It can grow with browsing but is bounded by retention and capped arrays.
- Classification: diagnostics and runtime state.

### Usage Aggregates

- Key: `usageStats`.
- Storage area: `chrome.storage.local`.
- Owner feature: `src/features/usage-stats/core/` and `src/js/background/intent/storage.js`.
- Data shape/version: bounded hostname-level aggregate state with day buckets, visit counts, active time, dwell time, page word counts, passive-surface maxima, and blocked/allowed outcome counters.
- Migration path: pure normalizers in the usage-stats core accept missing or malformed state. Future shape changes should add tests under `test/features/usage-stats/`.
- Retention or pruning: default bounded day retention in the model, plus options clear and local JSON export controls.
- Quota risk: medium. It stores aggregates only, not raw URLs, titles, text, tokens, selectors, tab identities, or tab titles.
- Classification: diagnostics.

### Pomodoro Runtime

- Keys: `pomodoroRuntimeState`, `pomodoroActivityState`, `pomodoroHistoryState`, `pomodoroAutoStartSuppressedUntil`, `pomodoroAutoStartSuppressedPlanId`.
- Storage area: `chrome.storage.local`.
- Owner feature: shared Pomodoro model under `src/js/shared/pomodoro/` and background runtime under `src/js/background/pomodoro/`.
- Data shape/version: unversioned runtime, activity, history, and manual auto-start suppression records.
- Migration path: Pomodoro normalizers accept missing or malformed state. Future shape changes should add tests under `test/shared/pomodoro/`.
- Retention or pruning: runtime and activity are overwritten as the timer changes. History keeps bounded daily totals and a capped recent-event list. Auto-start suppression clears when suppression expires or is reset.
- Quota risk: low to medium because history is bounded.
- Classification: runtime state and local history diagnostics.

### Pomodoro Mini Panel UI

- Key: `pomodoroMiniPanelUiState`.
- Storage area: `chrome.storage.local`.
- Owner feature: `src/js/content/pomodoro/miniPanelState.js` and mini-panel layout modules.
- Data shape/version: unversioned local UI placement, size, and minimized state.
- Migration path: normalizer clamps or discards invalid values.
- Retention or pruning: retained locally until the user changes panel layout or resets extension data.
- Quota risk: low.
- Classification: local UI state.

### Focus State Signal

- Key: `focusStateSignal`.
- Storage area: `chrome.storage.local`.
- Owner feature: `src/js/shared/self-state/focusState.js` and background intent messages.
- Data shape/version: unversioned focus-state signal with bounded expiry.
- Migration path: normalizer falls back to the default calm/no-expiry state.
- Retention or pruning: expires by timestamp and is overwritten by the popup/user state control.
- Quota risk: low.
- Classification: runtime state that can affect protection conservatively.

### Popup Shell State

- Key: `popupActivePane`.
- Storage area: `chrome.storage.local`.
- Owner feature: `src/js/popup/shell.js`.
- Data shape/version: unversioned string naming the last selected popup pane.
- Migration path: normalizer falls back to the default pane.
- Retention or pruning: retained locally until changed or reset.
- Quota risk: low.
- Classification: local UI state.

### DaD Select Pending Candidate

- Key: `pendingSelectedTextQuickAdd`.
- Storage area: `chrome.storage.local`.
- Owner feature: `src/js/background/selectedTextQuickAdd.js` for creation/consumption and `src/js/popup/quick-add/selectedTextQuickAddPanel.js` for popup consumption.
- Data shape/version: unversioned object containing bounded selected text, estimated score, editable-field flag, source, coarse host, tab id, URL, frame metadata, and creation timestamp.
- Migration path: no migration. Missing, malformed, expired, or context-mismatched pending candidates are ignored or removed.
- Retention or pruning: short-lived local handoff state. It is removed after popup consumption and expires after five minutes if the popup does not consume it.
- Quota risk: low because the selected text is capped before storage and there is only one pending candidate.
- Classification: temporary runtime state.

### Password Local State

- Keys: `key`, `attempts`, `lastAttempt`.
- Storage area: `chrome.storage.local`.
- Owner feature: `src/js/options/password/manager.js` and `src/js/options/password/crypto.js`.
- Storage access boundary: `src/js/options/password/manager.js` calls `src/platform/chrome/storage.js` instead of raw Chrome storage callbacks.
- Data shape/version: exported WebCrypto key as Base64, failed-attempt count, and last-attempt timestamp.
- Migration path: no current rename. Missing key makes password verification fail closed.
- Retention or pruning: retained until password deletion/reset; failed attempts reset after the lockout interval or successful verification.
- Quota risk: low.
- Classification: local protection-lock state.

## Browser LocalStorage

### Debug Logging Flag

- Key: `debugLogging`.
- Storage area: extension-page `localStorage`, not Chrome sync/local storage.
- Owner feature: `src/js/shared/logger.js`.
- Data shape/version: string flag equal to `true`.
- Migration path: no migration; absence means disabled.
- Retention or pruning: local browser preference until manually removed by developer/user reset.
- Quota risk: low.
- Classification: local debug configuration.

## Import, Export, And Reset

Full settings export uses `dad.settings.v1` and includes durable sync configuration only: plans, legacy migration inputs, UI element rules, blocked-page settings, theme, and language.

Ruleset export uses `dad.ruleset.v1` and includes only protection rules: plans, legacy migration inputs, and UI element rules.

Both export schemas deliberately exclude local runtime state, diagnostics, passwords, billing state, release notice flags, usage stats, intent trajectory state, Pomodoro runtime/history, popup state, and mini-panel layout.

Reset extension data clears both Chrome sync and Chrome local storage through the visible options-page reset path, guarded by active protected schedules.
