# Chrome Web Store Privacy Form

StorePilot can scan this document for Chrome Web Store privacy fields. Keep the `[privacy]` block and canonical keys intact.

[privacy]

single_purpose:
Defense Against Distractions helps users stay focused by blocking distracting web pages and selected page interface elements according to rules they configure. Users define website groups, keywords or phrases, scores, schedules, whitelists, UI mode, and optional UI element hiding rules. The extension scans matching pages locally, blocks pages when configured distraction rules are triggered, and supports locked schedules so protection cannot be relaxed during chosen focus periods.

permission.storage:
The extension needs storage to save and load the user's configuration: website groups, keywords, keyword scores, schedules, whitelist entries, UI mode, UI element blocking rules, export/import state, and optional extension password data. Without storage, the extension cannot remember the user's rules, cannot apply them on pages, cannot keep locked schedules, and cannot provide reliable blocking behavior.

permission.alarms:
The extension uses alarms to check locked schedules at regular intervals. Users can configure days and times when blocking settings must stay enforced and cannot be relaxed. The alarm lets the background worker evaluate whether a locked schedule is currently active and preserve the correct protection state. Without this permission, time-based locked schedule enforcement would not work reliably.

permission.downloads:
The extension uses downloads only for the export feature. Users can export their own extension settings as a local file so they can back up or restore their configuration. Without this permission, the extension cannot create the exported settings file for the user.

permission.activeTab:
The extension uses activeTab when the user interacts with the popup on the currently active tab. The popup can start the UI element picker and send commands to the active page so the user can select and preview page elements to hide. This access is initiated by the user from the extension popup and is needed to apply the picker to the tab the user is currently viewing.

host_permission:
The extension needs host access for pages the user may want to protect. Content scripts scan page text for configured keywords, apply page blocking when the configured score is reached, stop or mute media on blocked pages, and apply user-created UI element hiding rules. Because users can configure any website as a protected site, the extension needs broad host access instead of a fixed website list. Without this access, the extension cannot detect distracting content or show the blocking overlay on the pages users configure.

remote_code:
No. Defense Against Distractions does not use remote JavaScript or WebAssembly code. All extension code is included in the packaged extension.

privacy_policy_url:
https://github.com/molodchyk/Defense_against_Distractions/blob/main/PRIVACY.md

## Data Use Disclosure

Recommended selections:

- Websitecontent
- Authentifizierungsdaten

Reasoning:

- Websitecontent: the extension processes page text, URLs, media presence, and page UI structure locally to detect configured keywords, block pages, and hide selected UI elements.
- Authentifizierungsdaten: the extension can store an optional password for access to the options page. This is user-configured extension password data, not a website account password.

Do not select these unless future features change the data model:

- Personenidentifizierbare Informationen
- Gesundheitsinformationen
- Finanzdaten und Zahlungsinformationen
- Persönliche Kommunikation
- Ort
- Webprotokoll
- Nutzeraktivität

Current privacy position:

- User data is not sold.
- User data is not transferred to third parties except user-initiated export/import.
- User data is not used for unrelated purposes.
- User data is not used for creditworthiness or lending.
