# Release Checklist

Use this checklist before publishing a new extension release.

## Preflight

- Confirm `manifest.json` has the intended version.
- Run `npm test`.
- Run `npm run package`.
- Run `npm run verify:release`.
- Confirm `dist/Defense_against_Distractions-vX.Y.Z-extension.zip` exists.
- Confirm `dist/Defense_against_Distractions-vX.Y.Z-source.zip` exists.

## Extension Package

- Inspect the extension zip contents.
- Confirm it includes `manifest.json`, `_locales/`, `src/blocked.html`, `src/instructions.html`, `src/options.html`, `src/css/`, `src/js/`, and `src/store-assets/icons/`.
- Confirm it excludes docs, tests, scripts, screenshots, promotional images, store listing text, source-only files, and `src/img`.

## Manual QA

- Load the extension zip or unpacked project in a Chromium-based browser.
- Open the options page from the extension action.
- With an existing pre-update configuration, confirm the one-time backup notice appears, exports settings, and does not appear again after export or dismissal.
- With a fresh/default install, confirm the backup notice does not appear.
- Confirm the popup opens, matches the selected UI mode, and opens options from the compact top-right control.
- Confirm the popup Page Signals panel shows current-tab image, video, audio, GIF, emoji, and link counts.
- Switch UI mode between light, dark, and system; confirm popup, options, blocked page, and UI picker follow it.
- With an existing configuration, confirm legacy groups, locked schedules, and whitelisted websites are migrated into plans on options-page load.
- Confirm standalone Groups, Locked Schedules, and Whitelist sections are not visible as primary editing surfaces.
- Open a plan's Entries page, then add, edit, save, and delete a website/keyword entry.
- Add and delete plan allowed websites from the plan Entries page.
- Open a plan's Schedule page, then add, select, drag, resize, save, and delete a plan schedule in the weekly schedule board.
- Select an existing schedule block and drag above or below it in the grid to confirm the selected block expands from the opposite edge.
- Use the plan schedule day shortcuts to apply workdays, weekend, every day, and clear days.
- Confirm active plan schedules disable restricted controls and remain protected during storage pressure.
- Confirm plan schedules preserve mission-critical protection while storage-heavy UI blocked rules still save or fail gracefully.
- Set and delete an options-page password.
- Confirm the password overlay appears when a password is set.
- Visit a configured site and confirm matching keywords trigger blocking.
- Confirm the blocked overlay stops or mutes page media and shows selectable diagnostic text.
- Confirm a strict Pomodoro break stops media, then restores tab mute state and media playback after the break is paused or ends.
- Confirm resetting Pomodoro during a paused strict break removes the Pomodoro-only blocked overlay, including while a plan schedule is active, and does not immediately auto-start a new work session. If the page is keyword-blocked, regular blocking should re-apply.
- Confirm plan allowed websites are not blocked by that plan.
- Use a static page and a dynamic page to confirm page blocking still renders an overlay after navigation or reload warnings.
- Use the UI element picker to hide one repeated control, outline matched controls, adjust match settings, save a rule, and delete it from options.
- Confirm UI element rules sync live between popup/content picker/options without reloading the options page.
- Test export and import.

## Regression Targets

- Google custom search pages with a blocked keyword should show the block overlay, not only freeze the page.
- Gmail compose recipient blocking should remain resilient after reload/leave-page warnings and should not become Gmail-specific logic.
- ChatGPT repeated controls should be hideable without hiding unrelated message text or whole panels unless the chosen target/ancestor settings say so.
- The blocked overlay text should be selectable for copying diagnostics.
- The generated extension zip must not include screenshots, promotional images, store listing text, docs, tests, or scripts.

## Store Assets

- Use the English store listing from `src/store-assets/store-listing/en.txt`.
- Confirm every `_locales` language has a matching plain-text store listing in `src/store-assets/store-listing/`.
- Review `docs/localization.md` before changing locale folders or store listing locale files.
- Use screenshots from `src/store-assets/screenshots/`.
- Confirm screenshots do not expose personal accounts, private conversations, real rules, real domains, or other user-specific configuration.
- Use promotional images from `src/store-assets/promo/`.
- Use extension icons from `src/store-assets/icons/`.

## Publish

- Upload `dist/Defense_against_Distractions-vX.Y.Z-extension.zip` as the extension package.
- Use `dist/Defense_against_Distractions-vX.Y.Z-source.zip` when a source archive is needed.
- Optionally use `npm run cws:status`, `npm run cws:upload`, and `npm run cws:publish` after setting the CWS API environment variables documented in `docs/chrome-web-store-api.md`.
- Tag the release with the same version as `manifest.json`.
