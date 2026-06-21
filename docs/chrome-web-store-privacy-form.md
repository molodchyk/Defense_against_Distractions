# Chrome Web Store Privacy Form

StorePilot can scan this document for Chrome Web Store privacy fields. Keep the `[privacy]` block and canonical keys intact.

[privacy]

single_purpose:
Defense Against Distractions helps users stay focused by blocking distracting web pages and selected page interface elements according to rules they configure. Users define plans, plan entries, keywords or phrases, scores, schedules, plan-specific allowed websites, UI mode, optional UI element cleanup rules, intent-coherence settings, and optional plan-owned Pomodoro settings. The extension scans matching pages locally, blocks pages when configured distraction rules are triggered, can hide selected UI elements or perform bounded user-configured cleanup actions, supports locked schedules so protection cannot be relaxed during chosen focus periods, and can run local Pomodoro work/rest timing for active plans.

permission.storage:
The extension needs storage to save and load the user's local configuration: plans, plan entries, keywords and scores, schedules, plan allowed sites, UI mode, UI element rules, Pomodoro settings, intent settings, export/import state, and optional extension password data. It also stores bounded local runtime and diagnostic state, including Pomodoro timer and daily totals, recent browser activity summaries, page-signal summaries, hostname-level usage aggregates, open-tab/window count summaries, intent-coherence trajectory data, navigation transition summaries, active editable-field duration summaries, active-tab switch summaries, and local intervention feedback. This lets DaD explain current timing, local calibration, and risk diagnostics without sending data to a server. Without storage, the extension cannot remember rules, enforce locked schedules, preserve timers, or provide reliable blocking.

permission.alarms:
The extension uses alarms to check locked schedules and Pomodoro timer phases at regular intervals. Users can configure days and times when blocking settings must stay enforced and cannot be relaxed, and can optionally run plan-owned Pomodoro work/rest timing. The alarm lets the background worker evaluate whether a locked schedule is currently active, preserve the correct protection state, and advance Pomodoro phases reliably. Without this permission, time-based locked schedule enforcement and timer phase changes would not work reliably.

permission.downloads:
The extension uses downloads only for user-triggered export features. Users can export their own extension settings as a local file so they can back up or restore their configuration, and can export local intent-coherence diagnostics and local usage stats as JSON snapshots for debugging or self-analysis. Without this permission, the extension cannot create these exported files for the user.

permission.activeTab:
The extension uses activeTab when the user interacts with the popup on the currently active tab. The popup can start the UI element picker and send commands to the active page so the user can select and preview page elements to hide or clean up with bounded actions such as click-once, clear-field, or pause-media rules. This access is initiated by the user from the extension popup and is needed to apply the picker to the tab the user is currently viewing.

permission.idle:
Defense Against Distractions uses idle only to detect whether the device is active, idle, or locked for local plan-owned Pomodoro timing. When the device is locked or idle during a work phase, the extension can credit that away time toward the required rest period while keeping the work-session anchor fixed. This lets the timer avoid treating real away time as screen work. The idle state is processed locally and is not sent to a server. Without this permission, the extension cannot reliably distinguish active browser use from away or locked time and cannot calculate rest credit correctly.

permission.webNavigation:
Defense Against Distractions uses webNavigation to observe top-frame navigation events and transition types locally, such as link clicks, typed navigation, reloads, history-state changes, and redirects. These bounded transition signals support the intent-coherence system, drift detection, recovery prompts, and diagnostics that explain why a browsing chain appears connected or detached. The extension does not send navigation data to a server. Without this permission, it cannot reliably evaluate navigation ancestry or distinguish deliberate navigation from redirect or loop behavior.

host_permission:
The extension needs host access for pages the user may want to protect. Content scripts scan page text for configured keywords, summarize local page signals, record coarse local activity pings for Pomodoro timing, apply page blocking when the configured score is reached, stop or mute media on blocked pages, and apply user-created UI element hiding rules. Because users can configure any website as a protected site, the extension needs broad host access instead of a fixed website list. Without this access, the extension cannot detect distracting content, maintain page-local timing context, or show the blocking overlay on the pages users configure.

remote_code:
no

privacy_policy_url:
https://github.com/molodchyk/Defense_against_Distractions/blob/main/PRIVACY.md

data_usage.personally_identifiable_information:
no

data_usage.health_information:
no

data_usage.financial_payment_information:
no

data_usage.authentication_information:
no

data_usage.personal_communications:
no

data_usage.location:
no

data_usage.web_history:
no

data_usage.user_activity:
no

data_usage.website_content:
no

certification.no_sell_or_transfer:
yes

certification.no_unrelated_use:
yes

certification.no_creditworthiness:
yes

## Data Use Notes

StorePilot keys above use the Chrome Web Store disclosure meaning of "collect": data that leaves local-only browser/device processing and becomes available to the developer, a backend, analytics, support, or a third party.

DaD processes website content, optional extension password data, and local activity summaries on the user's device for blocking, UI cleanup, Pomodoro timing, usage stats, and intent-coherence diagnostics. Those values are not sent to the developer or a third party, so the canonical `data_usage.*` dashboard answers are `no`.

Current privacy position:

- User data is not sold.
- User data is not transferred to third parties except user-initiated export/import.
- User data is not used for unrelated purposes.
- User data is not used for creditworthiness or lending.
- The extension does not use remote JavaScript or WebAssembly code; all executable code is included in the packaged extension.
- The dormant billing entitlement layer does not currently collect or process payment data. If billing is activated later, the Chrome Web Store privacy fields and privacy policy must be updated before release.
