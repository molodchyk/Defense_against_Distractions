# Permission Audit

This document records why each current manifest permission and broad content-script match exists. It is a release review artifact for the browser-extension playbook requirement that permissions stay minimal and explainable.

## Current Manifest Permissions

### `storage`

- Feature owner: plans, settings, UI cleanup rules, Pomodoro runtime, usage summaries, intent diagnostics, export/import, and migration code.
- API evidence: `src/platform/chrome/storage.js`, used by extension pages and background modules; `src/js/content/state.js` remains the classic content-script storage adapter.
- Why retained: DaD must persist user configuration, protected schedules, local runtime state, and bounded diagnostics across Manifest V3 service-worker restarts.
- Removal trigger: no realistic removal path while the extension has configurable rules, local diagnostics, or reset/export/import behavior.

### `alarms`

- Feature owner: locked schedule monitoring and plan-owned Pomodoro timing.
- API evidence: `src/platform/chrome/alarms.js`, used by `src/js/background/scheduleMonitor.js`, `src/js/background/pomodoro/initializer.js`, and `src/js/background/pomodoro/chromeStorage.js`.
- Why retained: Manifest V3 background workers can sleep; alarms provide browser-owned wakeups so schedule locks and Pomodoro phase changes are reconciled without a persistent background page.
- Removal trigger: remove only if schedules and Pomodoro timing no longer need background wakeups.

### `downloads`

- Feature owner: user-triggered settings, ruleset, usage, and intent-diagnostics export.
- API evidence: `src/platform/chrome/downloads.js`, used by `src/js/options/storageTransfer.js`.
- Why retained: DaD creates local files only when the user explicitly exports configuration or diagnostics.
- Removal trigger: remove if every export path is replaced by clipboard-only or browser-native save flows that do not call the downloads platform wrapper.

### `activeTab`

- Feature owner: popup current-tab tools such as UI picker launch, page signals, block diagnostics, Pomodoro mini panel, and intent recovery actions.
- API evidence: `src/platform/chrome/tabs.js`, used by popup current-tab modules, content-blocking background top-frame block requests, blocked-tab mute state, Pomodoro tab notifications, and intent drift-tab recovery actions.
- Why retained: popup actions are user-invoked and operate on the currently active tab. Keeping `activeTab` makes that temporary current-tab capability explicit without adding the broader `tabs` permission.
- Removal trigger: remove only after popup current-tab actions are proven to work without activeTab in Chrome Web Store review contexts and without adding `tabs`.

### `idle`

- Feature owner: plan-owned Pomodoro rest-credit timing.
- API evidence: `src/platform/chrome/idle.js`, used by `src/js/background/pomodoro/initializer.js`.
- Why retained: DaD needs local active/idle/locked state to distinguish screen work from away time and to credit locked or idle time toward required rest.
- Removal trigger: remove if Pomodoro rest credit stops using browser idle/locked state.

### `webNavigation`

- Feature owner: local intent-coherence lineage, transition diagnostics, and drift recovery.
- API evidence: `src/platform/chrome/navigation.js`, used by `src/js/background/intent/initializer.js`; intent transition consumers live in `src/js/background/intent/tabs.js` and `src/js/shared/intent/loadMetrics.js`.
- Why retained: top-frame navigation transition types and history updates are needed to distinguish link clicks, typed navigation, reloads, redirects, and history-state loops in a browsing chain.
- Removal trigger: remove if intent coherence no longer uses navigation ancestry or transition qualifiers.

## Host Access Through Content Scripts

- Manifest surface: `content_scripts.matches: ["<all_urls>"]` and `web_accessible_resources.matches: ["<all_urls>"]`.
- Feature owner: page scanning, blocking overlay, media suspension, page signals, Pomodoro page activity, intent prompt, and user-created UI cleanup rules.
- API evidence: manifest content-script list, `src/app/content/index.js`, `src/js/content/content-blocking/siteCheck.js`, `src/js/content/content-blocking/keywords.js`, `src/js/content/ui-blocking/controller.js`, `src/js/content/page-signals/collector.js`.
- Why retained: users can configure protection for arbitrary websites. A fixed host list would silently make user-created rules fail on unlisted sites.
- Constraints: the extension processes page content locally, does not send browsing data to a server, and keeps store/privacy copy aligned with this broad access.
- Removal trigger: replace only if the product moves to an explicit user-managed host-permission request model and verifies every protection workflow under that model.

## Permissions Deliberately Not Requested

- `tabs`: not requested. Current code uses allowed `chrome.tabs` operations and active/current-tab context without declaring the broad tabs permission.
- `scripting`: not requested. Content scripts are manifest-declared instead of dynamically injected.
- `webRequest`: not requested. DaD does not intercept network requests.
- `declarativeNetRequest`: not requested. Blocking is page/content based, not URL-rule based.
- `notifications`: not requested. Pomodoro and protection state are shown in extension surfaces instead.
- `cookies`, `history`, `identity`, `debugger`, `nativeMessaging`, and `offscreen`: not requested.

## Manifest Surfaces Deliberately Not Used

- `chrome_settings_overrides`: not used. DaD does not change browser search, homepage, startup pages, or new tab behavior.
- `host_permissions`, `optional_permissions`, and `optional_host_permissions`: not used. Host access is the audited `content_scripts.matches` surface described above, not a second permission surface.
- `externally_connectable` and `oauth2`: not used. DaD does not expose an external messaging API and does not sign users in through OAuth.

## Release Rule

Any manifest permission addition, removal, or new broad host access must update this audit, `PRIVACY.md`, `docs/chrome-web-store-privacy-form.md`, reviewer notes if browser behavior changes, and the release verification checks before publishing.
