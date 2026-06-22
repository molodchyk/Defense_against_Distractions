Changelog

Version 1.6.1:

- added Chrome Web Store release assets for the current Defense Panel, plans, intent prompt, blocked page, and UI picker flows
- added Australian English locale and matching store listing text
- updated manifest and English store copy around the current plan-based protection model, including schedules, Pomodoro, intent coherence, and optional UI cleanup
- added StorePilot-compatible privacy justifications for idle and webNavigation permissions
- added a manifest permission audit that maps each permission and host-access surface to its feature owner and removal trigger
- added static extension-surface localization verification for visible HTML text and accessible labels
- moved background schedule and Pomodoro alarm handling behind a Chrome alarms platform wrapper
- moved Pomodoro idle-state detection behind a Chrome idle platform wrapper
- moved background Pomodoro tab notifications behind the Chrome tabs platform wrapper
- moved background and popup runtime lifecycle/helpers behind a Chrome runtime platform wrapper
- moved toolbar, tab lifecycle, webNavigation, and window-focus listener registration behind Chrome platform wrappers
- moved background intent tab/window recovery operations behind Chrome platform wrappers
- moved blocked-page runtime storage, messaging, URL, and i18n access behind Chrome platform wrappers
- moved content-blocking background badge, top-frame block message, and tab mute operations behind Chrome platform wrappers
- moved classic content-script runtime, storage, quota, URL, and i18n access behind a Chrome content bridge
- clarified that the browser-load smoke check is optional and should run only in an isolated browser environment
- moved user-triggered export downloads behind a Chrome platform wrapper and added a playbook guard against raw `chrome.downloads` use in the options export flow
- moved options-page background diagnostic and Pomodoro messages behind a Chrome runtime-message platform wrapper
- moved popup tab query, tab messaging, tab update, and tab creation through a Chrome tabs platform wrapper
- moved options-page password storage and attempt tracking behind the Chrome storage platform wrapper
- routed remaining Options page Chrome i18n calls through the selected UI-language helper and added a static localization guard
- sanitized Chrome Web Store screenshots and added a checked store media review artifact
- synchronized localized store listing version references with the current package version
- aligned README blocking copy with the current overlay-first page blocking behavior
- added package verification for screenshot and promotional image dimensions, runtime archive contents, and unexpected remote network access
- added release and source archive verification for store listing format, localized descriptions, changelog consistency, and browser-load smoke checks

Version 1.6.0:

- added Pomodoro rest-credit behavior so idle and locked time can satisfy required rest
- added Pomodoro runtime diagnostics in the popup and plan Pomodoro page
- improved strict-break blocking so media is stopped during the block and restored when the block ends
- added blocked-page diagnostics for media suspension and extension-owned tab mute state
- fixed Pomodoro reset so strict-break and stale no-diagnostics overlays are cleared immediately, including frame-originated blocks
- fixed Pomodoro reset auto-start suppression so passive tab, window, visibility, and page-visible events do not restart Pomodoro and re-block the page
- fixed Pomodoro reset suppression so activity-driven auto-start stays off until the user explicitly starts or resumes Pomodoro
- fixed Pomodoro reset clearing for stale Pomodoro-only overlays whose DOM remained after page state had already been reset
- fixed Pomodoro reset during active plan schedules so it clears Pomodoro-only strict-break overlays while normal keyword blocking still re-checks immediately
- fixed blocked-overlay Pomodoro status so it is shown only for strict-break blocks instead of unrelated keyword/content blocks
- added current-page media and link signal counts to the popup
- added intent-coherence tab opener lineage so child tabs stay connected to the chain that opened them
- added lineage and drift-descendant diagnostics to the popup and options page
- improved intent isolation so a trusted drift-descendant tab detaches from inherited opener drift lineage
- added grayscale as a reversible intent-coherence intervention between warn-only and return prompts
- added dwell-time and active-page-time signals to intent-coherence scoring and diagnostics
- added scroll, click, key, and input velocity signals to intent-coherence scoring and diagnostics
- added recommendation/feed click attribution to intent-coherence scoring and diagnostics
- added top-frame webNavigation transition ancestry to intent-coherence diagnostics and redirect-chain scoring
- added plan-owned intent diagnostics retention, plan policy provenance, clear controls, and local JSON diagnostics export
- added bounded local intent intervention feedback recording for local calibration diagnostics
- added intent feedback summary diagnostics for return rate, isolate rate, continue rate, dismiss rate, average score, and local auto-calibration signal
- added plan-level local intent auto-calibration so feedback can conservatively adjust the effective intervention threshold without weakening the configured locked threshold
- added hard current-page chain quarantine for intent block actions when a session is locked or the current tab is a drift descendant
- added a stable cooldown on hard intent chain quarantine before isolation is available, while keeping Return available immediately
- added bounded local usage stats with hostname-level aggregates, tab-pressure summaries, retention pruning, an options-page Usage panel, and a user-triggered local JSON export
- improved plan editing with in-page delete confirmations, icon-based destructive actions, and Enter-to-add allowed websites
- improved plan schedules so dragging on empty grid space creates a selected inactive time block, and selected schedules can be extended from a stable grid anchor
- moved global controls into a dedicated Settings panel for UI mode, instructions, password management, import/export, and dormant supporter access
- added options-page section navigation for Plans, Blocked UI, Intent diagnostics, Usage stats, and Settings
- improved Blocked UI management with visible global/plan scope, direct plan assignment controls, and cleanup of stale plan assignments when a rule is deleted

Version 1.5.0:

- added light, dark, and system UI modes
- added a popup-based UI element picker for hiding distracting page controls
- improved blocked-page behavior with overlay blocking, media muting, selectable diagnostics, and UI mode syncing
- added one-time backup notice for existing users before larger future changes
- refreshed store assets, release packaging, and release verification checks
- reorganized project assets and documentation for release readiness

Version 1.4:

- increased storage for the website groups
- improved error handling regarding storage
- bug fix: redirection works as intended

Version 1.3:

-keywords values can be increased during locked schedules
-keywords can be shuffled during locked schedules
-bug fix: keywords can be added again

Version 1.2:

-websites from multiple groups can be applied to a single URL
-the page closes automatically after being blocked, timers were removed

Version 1.1: 

-added export/import functionality
-added missing translations
-bug fix: ChatGPT's stream of text is now properly detected
