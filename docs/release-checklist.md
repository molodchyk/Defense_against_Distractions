# Release Checklist

Use this checklist before publishing a new extension release.

## Preflight

- Confirm `manifest.json` has the intended version.
- Run `npm test`.
- Run `npm run verify:manifest`.
- Run `npm run verify:imports`.
- Run `npm run verify:locales`.
- Run `npm run verify:static-localization`.
- Run `npm run verify:playbook`.
- Run `npm run audit:file-sizes`.
- Run `npm run audit:folder-density`.
- Run `npm run package`.
- Run `npm run verify:package`.
- Run `npm run verify:release`.
- Run `npm run verify:browser-load` only in an isolated browser environment where launching Chrome, Edge, or Chromium cannot close active user windows or unsaved work.
- Confirm `dist/Defense_against_Distractions-vX.Y.Z-extension.zip` exists.
- Confirm `dist/Defense_against_Distractions-vX.Y.Z-source.zip` exists.
- Confirm `dist/` does not contain package zips for older versions or staging directories.

## Extension Package

- Inspect the extension zip contents.
- Confirm it includes `manifest.json`, `_locales/`, `src/blocked.html`, `src/instructions.html`, `src/options.html`, `src/app/`, `src/css/`, `src/features/`, `src/js/`, `src/platform/`, and `assets/icons/`.
- Confirm it excludes docs, tests, scripts, screenshots, promotional images, store listing text, source-only files, and `src/img`.

## Manual QA

- Load the extension zip or unpacked project in a Chromium-based browser.
- Open the options page from the extension action.
- With an existing pre-update configuration, confirm the one-time backup notice appears, exports settings, and does not appear again after export or dismissal.
- With a fresh/default install, confirm the backup notice does not appear.
- Export settings, inspect that the JSON uses `dad.settings.v1`, then import it into another profile and confirm only configuration is restored. Runtime diagnostics, usage stats, billing identity/entitlement, release-notice stamps, and encrypted password data should not be imported.
- Export ruleset, inspect that the JSON uses `dad.ruleset.v1`, and confirm it includes plans, groups/schedules/allowed sites, and UI cleanup rules while excluding UI language/theme, blocked-page note, passwords, billing state, runtime state, usage stats, and diagnostics. Import it into a profile with different local UI settings and confirm those local settings are preserved while the rule subset is replaced.
- Export settings, then use Settings -> Reset extension data and confirm sync configuration, local diagnostics, timers, and runtime state are cleared after confirmation. During an active protected schedule, confirm Reset extension data is disabled or refused.
- Confirm the popup opens, matches the selected UI mode, and opens options from the compact top-right control.
- Set UI Language to Arabic and confirm popup, options including the plan schedule board, blocked page, intent prompt, UI picker, Pomodoro mini panel, and instruction guide render right-to-left without changing the underlying website direction.
- Confirm the popup Control/Inspect switcher works with click, Arrow keys, Home, and End, and that only the selected pane is visible.
- Confirm the popup Page Signals panel shows current-tab image, video, audio, audible media, GIF, emoji, link, and passive-region counts.
- Use a local test page with recommendation, comment, and shorts/reels-like containers and confirm popup Page Signals and Options Intent diagnostics show only compact passive-region counts, not selectors or page text.
- Confirm popup Intent Diagnostics shows compact origin, passive, agency, and navigation score signals before score reasons.
- Trigger an active intent intervention and confirm popup Session coherence shows the active Intervention row separately from the Policy row; for hard chain quarantine, confirm the row shows auto-return or auto-close cooldown state.
- Trigger a multi-step intent trajectory and confirm popup Session coherence shows a compact session path with origin, current page, and first-drift marker when drift exists.
- Trigger coherent visits and drift descendants across multiple hosts and confirm Options Intent diagnostics shows capped coherent-host and drift-descendant host counts without paths, queries, titles, or page text.
- Trigger a prompt-style intent intervention and confirm popup Session coherence shows a Continue reason field, keeps Continue disabled until a reason is entered, dismisses the current content prompt after Continue, and does not offer Continue for hard chain quarantine.
- Trigger an on-page intent intervention and confirm the prompt shows Origin, Last coherent, First drift when known, Current, coherence score, and recovery actions before choosing Return or Isolate. For hard chain quarantine, confirm it also shows the count of other known same-chain drift tabs before Return chain, Move, Suspend, or Close actions.
- Trigger a Continue followed by more drift, then confirm Options Intent diagnostics shows Continue outcomes and drift-after-Continue without URLs, titles, page text, or topic tokens.
- On a local test page with repeated thumbnail/card results, click one card and confirm feed/recommender interaction diagnostics increase; repeat on a plain navigation-link list and confirm it is not counted as a feed click.
- Scroll down/up/down on a local long page and confirm Intent diagnostics show scroll movement as reversals and screen-distance while not exposing scroll positions.
- Focus and type in a local editable text field, then confirm Intent diagnostics show active input duration and key/input counts without exposing typed values, field labels, selectors, or focused element identity.
- Run a long passive feed/media session and confirm Options Intent diagnostics shows Long-session load; repeat with long focused reading/input and confirm the load stays low, without storing URLs, titles, page text, or typed values.
- On a local infinite-scroll-style page, append cards after scrolling and confirm Intent diagnostics show dynamic scroll appends without exposing added text, selectors, or scroll positions.
- Confirm the popup Page Signals panel shows current-page keyword ideas when bounded page tokens exist, and that `Copy keyword ideas` copies keyword-editor lines without saving them automatically.
- Confirm the popup Inspect pane exposes Copy Diagnostics as a pane-level action, and that Block Diagnostics keeps block-specific refresh/status controls.
- Switch UI mode between light, dark, and system; confirm popup, options, blocked page, and UI picker follow it.
- Open popup Inspect, close and reopen the popup, and confirm it restores Inspect; set it back to Control and confirm Control restores.
- With an existing configuration, confirm legacy groups, locked schedules, and whitelisted websites are migrated into plans on options-page load.
- Confirm standalone Groups, Locked Schedules, and Whitelist sections are not visible as primary editing surfaces.
- Open a plan's Entries page, then add, edit, save, and delete a website/keyword entry.
- Add and delete plan allowed websites from the plan Entries page.
- Open a plan's Schedule page and confirm the weekly schedule board opens as a wide graph by default, can be closed compact, and can be reopened with `Open wide graph`.
- Add, select, drag, resize, save, and delete a plan schedule in the weekly schedule board.
- Select an existing schedule block and drag above or below it in the grid to confirm the selected block expands from the opposite edge.
- Use the plan schedule day shortcuts to apply workdays, weekend, every day, and clear days.
- Confirm active plan schedules disable restricted controls and remain protected during storage pressure.
- Confirm plan schedules preserve mission-critical protection while storage-heavy UI blocked rules still save or fail gracefully.
- Set and delete an options-page password.
- Confirm the password overlay appears when a password is set.
- Visit a configured site and confirm matching keywords trigger blocking.
- Add a test keyword such as `has:activeSeconds>=5, +, 100/100`, wait on a visible matching page, and confirm the page blocks after the active-time threshold with a structural diagnostic.
- Add a test keyword such as `has:audible, +, 100/100`, play unmuted page media, and confirm the page blocks with an audible-media structural diagnostic.
- Add test keywords such as `has:recommendations, +, 100/100`, `has:comments, +, 100/100`, and `has:shorts, +, 100/100` on local matching containers and confirm each blocks with a structural diagnostic rather than exposing selectors or page text.
- Play a local media element, swap its source, and let it end; confirm Intent diagnostics show media play/change/end counts without exposing media URLs, source strings, captions, or titles.
- Confirm the blocked overlay stops or mutes page media and shows selectable diagnostic text.
- During an active locked schedule, confirm Pomodoro can be enabled, started, or resumed, while pause, reset, disable, and rest-shortening changes remain blocked.
- Confirm a strict Pomodoro break stops media, then restores tab mute state and media playback after the break is paused or ends.
- Confirm resetting Pomodoro during a paused strict break removes the Pomodoro-only blocked overlay, including while a plan schedule is active, and does not immediately auto-start a new work session. If the page is keyword-blocked, regular blocking should re-apply.
- Lock or idle long enough to satisfy the upcoming Pomodoro break during work, then confirm popup, Options Pomodoro runtime, and mini panel show Rest satisfied with return behavior rather than an ordinary work timer.
- Confirm plan allowed websites are not blocked by that plan.
- Use a static page and a dynamic page to confirm page blocking still renders an overlay after navigation or reload warnings, including pages that register `beforeunload` / unsaved-change handlers.
- Use the UI element picker to hide one repeated control, outline matched controls, test bounded click-once, clear-field, and pause-media actions on harmless targets, adjust match settings, save a rule, and delete it from options.
- During an active locked schedule, confirm enabling a disabled UI element rule still works, while disabling or deleting an enabled UI element rule is rejected.
- Confirm UI element rules sync live between popup/content picker/options without reloading the options page.
- With an active plan intent policy that uses `block`, trigger a hard chain quarantine, confirm the on-page prompt shows count-only drift-tab scope, wait for the cooldown, and confirm the current tab plus known same-chain drift descendants return to the last coherent page without closing the current tab when auto-close is off.
- Enable the plan's stricter auto-close current-tab setting, trigger a hard chain quarantine, wait for the cooldown, and confirm only the current quarantined tab closes while Return remains available during the cooldown.
- Test export and import.

## Regression Targets

- Google custom search pages with a blocked keyword should show the block overlay, not only freeze the page.
- Gmail compose recipient blocking should remain resilient after reload/leave-page warnings and should not become Gmail-specific logic.
- ChatGPT repeated message action controls should be hidden by the built-in cleanup on supported ChatGPT hosts, and manual UI rules should still be able to hide broader repeated controls without hiding unrelated message text or whole panels unless the chosen target/ancestor settings say so.
- The blocked overlay text should be selectable for copying diagnostics.
- The generated extension zip must not include screenshots, promotional images, store listing text, docs, tests, or scripts.

## Store Assets

- Use the English store listing from `store/store-listing/en.txt`.
- Confirm every `_locales` language has a matching plain-text store listing in `store/store-listing/`.
- Confirm store listing files are direct body text and do not start with a title, field label, or extension name.
- Confirm every locale `messages.json` has the same keys and placeholders as `_locales/en/messages.json`.
- Review `docs/localization.md` before changing locale folders or store listing locale files.
- Use screenshots from `store/screenshots/`.
- Confirm screenshots do not expose personal accounts, private conversations, real rules, real domains, or other user-specific configuration.
- Use promotional images from `store/promo/`.
- Review `docs/store-media-review.md` after changing any screenshot or promotional image.
- Use extension icons from `assets/icons/`.

## Publish

- Upload `dist/Defense_against_Distractions-vX.Y.Z-extension.zip` as the extension package.
- Use `dist/Defense_against_Distractions-vX.Y.Z-source.zip` when a source archive is needed.
- Optionally use `npm run cws:status`, `npm run cws:upload`, and `npm run cws:publish` after setting the CWS API environment variables documented in `docs/chrome-web-store-api.md`.
- Tag the release with the same version as `manifest.json`.
