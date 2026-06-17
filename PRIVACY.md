# Privacy Policy

Defense Against Distractions is a local-first browser extension for blocking distracting web pages and page interface elements according to rules configured by the user.

## Data the Extension Uses

The extension may process page text, URLs, page titles, page structure, media counts, link counts, visible interface elements, top-frame navigation transition types and qualifiers, open-tab/window counts, and coarse browser activity signals such as recent interaction time and whether the browser reports the system as active, idle, or locked. This is used to detect configured keywords, apply blocking rules, show a blocked-page overlay, hide user-selected UI elements, run Pomodoro work/rest behavior, avoid counting locked or idle system time as completed work time, and produce local diagnostics about browsing-session coherence.

The extension stores user configuration such as website groups, keywords, schedules, whitelist entries, UI mode, UI element blocking rules, Pomodoro settings, export/import state, and optional extension password data. It may also store bounded local diagnostic summaries such as recent page visits, extracted URL/title/host tokens, media/feed/link counts, hostname-level usage aggregates, open-tab/window count summaries, recent activity time, local active-time totals, current local system activity state, navigation transition summaries, intent-coherence scores, and local intervention feedback actions such as continue, isolate, or return. If plan auto-calibration is enabled, that local feedback may conservatively adjust the effective intent-intervention threshold. The usage aggregates do not store raw page text, full URLs, page titles, topic tokens, tab URLs, tab titles, or tab identities.

## Storage

Configuration is stored using Chrome extension storage. Some settings use `chrome.storage.sync` so they can be available across the user's browser profile. Some local security, timer, and diagnostic state, such as password attempt state, encryption helper data, Pomodoro runtime and activity state, hostname-level usage aggregates, and intent-coherence trajectory summaries, uses `chrome.storage.local`.

## Permissions

Defense Against Distractions requests these browser permissions:

- `storage`: saves user configuration, locked schedules, UI rules, Pomodoro state, local diagnostics, and export/import state.
- `alarms`: checks locked schedules and advances Pomodoro work/rest timing while the Manifest V3 background worker may be asleep.
- `downloads`: creates user-triggered settings, usage-stats, and intent-diagnostics export files.
- `activeTab`: lets the popup act on the current tab after the user starts the UI element picker or a tab-specific action.
- `idle`: reads local active, idle, and locked system state for Pomodoro rest-credit timing.
- `webNavigation`: observes top-frame navigation transitions locally for intent-coherence lineage, drift detection, recovery prompts, and diagnostics.
- Host access through content scripts: lets the extension scan configured pages locally, block matching pages, suspend blocked-page media, summarize page signals, and apply user-created UI cleanup rules.

## No Sale or Third-Party Transfer

Defense Against Distractions does not sell user data.

Defense Against Distractions does not transfer user data to third parties.

Defense Against Distractions does not use user data for creditworthiness, lending, advertising, or unrelated profiling.

## Remote Code and Servers

Defense Against Distractions does not use remote JavaScript or WebAssembly code.

Defense Against Distractions does not require a remote server to perform its core blocking behavior.

Defense Against Distractions does not use analytics, ads, tracking pixels, or telemetry.

## User Control

Users can export and import their own extension configuration. Users can delete or change stored rules from the extension options page, subject to any locked schedules they configured. Users can also clear local usage stats, clear local intent-coherence diagnostics, and export local diagnostics JSON snapshots from the options page.

## Contact

For questions or issues, use the project repository:

https://github.com/molodchyk/Defense_against_Distractions
