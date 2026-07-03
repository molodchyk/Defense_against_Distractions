# Release Readiness

This document tracks what must be true before publishing the current update.

Use [Release Verification Record](release-verification-record.md) as the short evidence log for the current package. Keep browser-load and manual browser QA marked as pending until they are verified in an isolated browser environment.

## Current Verification State

- Automated static and archive gates are covered by `npm run verify:release` after `npm run package`.
- Browser-load status: not fully browser-verified until `npm run verify:browser-load` is run in an isolated Chromium-based browser/profile.
- Do not run browser-load on an active workstation where launching Chrome, Edge, or Chromium could close active user windows or unsaved work.
- The browser-load script refuses to launch when browser-management or blocker software such as Cold Turkey is running, unless explicitly overridden in a safe disposable environment.

## Release Archive Policy

The `dist/` folder is disposable release output. `npm run package` resets it before packaging.

For this project, `dist/` must contain only these two current-version ZIP files:

- `Defense_against_Distractions-vX.Y.Z-extension.zip`: the Chrome Web Store upload package.
- `Defense_against_Distractions-vX.Y.Z-source.zip`: the matching source archive for reviewer or source-distribution needs.

No staging folders, unpacked extension folders, stale version ZIPs, screenshots, promotional images, store listing text, or source-only icon files should remain in `dist/` after packaging.

## Automated Gates

Run these from the project root:

- `npm test`
- `npm run verify:manifest`
- `npm run verify:imports`
- `npm run verify:locales`
- `npm run verify:static-localization`
- `npm run verify:playbook`
- `npm run verify:research`
- `npm run audit:file-sizes`
- `npm run audit:folder-density`
- `npm run package`
- `npm run verify:package`
- `npm run verify:release`

These automated gates are static repository and archive checks. They must not invoke `npm run verify:browser-load`, `scripts/check-unpacked-extension-load.ps1`, or any browser-launch smoke test.

Reviewer-facing browser limitations are documented in [Reviewer Notes](reviewer-notes.md). Recheck that file before publishing if file URL, incognito, permissions, package contents, or browser-controlled behavior changes.

Manifest permission rationale and broad host-access boundaries are documented in [Permission Audit](permission-audit.md). Recheck that file before publishing if any permission, content-script match, or web-accessible resource match changes.

Store screenshots and promotional assets are documented in [Store Media Review](store-media-review.md). Recheck that file before publishing if any screenshot or promo image changes.

The package verifier checks:

- The generated runtime output has a valid MV3 manifest.
- Manifest-referenced popup, options, background, content-script, icon, and web-accessible resource paths exist inside the package output.
- Relative JavaScript imports inside the generated package resolve to files inside the package output.
- The background service worker is emitted as a module service worker.
- The runtime output does not contain source maps unless explicitly allowed.
- The runtime output does not contain remote executable JavaScript, remote script tags, remote worker scripts, or remote WebAssembly streaming loads.
- The runtime output does not contain unexpected remote network access such as remote fetches, beacon/WebSocket/EventSource calls, remote HTML passive requests, or remote CSS URLs.
- The runtime output does not contain recognized analytics, tracking pixel, or telemetry SDK signatures.
- The runtime output excludes source-only folders such as docs, research, tests, scripts, screenshots, promo images, and store listing text.
- The generated manifest version and name match the project manifest and package version.

The release verifier checks:

- `package.json` and `manifest.json` versions match.
- Unit tests, manifest-reference, relative-import, playbook, research-quality, file-size, folder-density, locale-coverage, static-localization, and package-output gates pass.
- Manifest icon, popup, options, background, content-script, and web-accessible resource paths exist.
- Manifest permissions are present in the permission audit, privacy policy, and StorePilot privacy form.
- Static extension HTML surfaces have a localization path for visible text and accessible labels.
- The extension archive contains runtime files required by the manifest.
- The extension archive excludes docs, the repository research workspace, tests, scripts, screenshots, promo images, store listing text, and source-only icon files.
- The `dist/` folder contains only current manifest-version package zips, with no stale zips or staging directories.
- The source archive contains docs, research workspace, tests, scripts, source files, store assets, README, privacy policy, license, about file, and changelog.
- The source archive contains the store media review for screenshots and promotional images.
- The source archive contains StorePilot privacy, category, additional-field, and automation-index documents.
- The changelog in the source archive matches the root `CHANGELOG.md`.
- The store listing remains plain text instead of Markdown.
- StorePilot direct listing files do not start with a title, field label, or extension name.
- The default locale includes `description.message`.

The package verifier extracts the current extension archive into a temporary folder when needed.

`npm run verify:browser-load` is not an automated gate, but an isolated target-browser smoke check is required before publishing. Run it only in an isolated browser environment where launching Chrome, Edge, or Chromium cannot close active user windows or unsaved work. The script refuses to launch when browser-management or blocker software such as Cold Turkey is running, unless the operator passes `-AllowBrowserManagementTools` or sets `DAD_ALLOW_BROWSER_LOAD_WITH_BROWSER_MANAGEMENT=1` in a safe disposable environment. If that safe environment is not available, leave the release marked as not fully browser-verified instead of running the smoke check on an active workstation. If it is safe to run and a browser is not discoverable, set `DAD_CHROME_PATH` or pass `-BrowserPath` to `scripts/check-unpacked-extension-load.ps1`.

## Manual Gates

Manual QA still matters because the extension interacts with live websites and browser extension APIs.

Before release, verify:

- Options page loads and saves plans, plan entries, websites, keywords, schedules, allowed websites, Pomodoro settings, intent settings, password, UI mode, and UI element rules.
- Popup loads, uses the selected UI mode, opens options, and starts the UI picker.
- Blocking overlay appears on a known keyword match, displays diagnostic text, and allows the text to be selected.
- Blocked pages stop or mute video and audio instead of only covering the page visually.
- UI picker can pick, preview, outline, hide, adjust settings, save, save-and-continue, cancel, and delete rules.
- UI picker can temporarily allow page clicks without breaking its draggable panel.
- Options page updates stored UI blocked rules without requiring reload.
- Export and import work after the new storage and UI-rule changes.
- Existing users who were updated into this release see the one-time configuration backup notice on the options page.
- Fresh/default installs do not see the configuration backup notice, and dismissed/exported notices do not repeat.

## Release Bias

For this update, prefer reliability over new capability.

Do not add features during release prep unless they remove a release blocker. If a new idea appears, put it into `docs/potential-functionality.md` or the relevant architecture doc.

## Current Release Risks

- UI element blocking is powerful but sensitive to page structure. Manual QA should include both narrow and broader ancestor settings.
- Page blocking changed from navigation-first behavior to overlay-first behavior. Manual QA should confirm media is stopped and diagnostics remain visible.
- Store assets are split between packaged icons in `assets/icons/` and source-only Chrome Web Store material in `store/`. Packaging and manifest path checks should catch broken references, but manual inspection of the generated ZIP is still useful.
