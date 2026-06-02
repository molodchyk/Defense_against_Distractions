# Release Readiness

This document tracks what must be true before publishing the current update.

## Automated Gates

Run these from the project root:

- `npm test`
- `npm run package`
- `npm run verify:release`

The release verifier checks:

- `package.json` and `manifest.json` versions match.
- Manifest icon, popup, options, background, content-script, and web-accessible resource paths exist.
- The extension archive contains runtime files required by the manifest.
- The extension archive excludes docs, tests, scripts, screenshots, promo images, store listing text, and source-only icon files.
- The source archive contains docs, tests, scripts, source files, store assets, README, license, about file, and changelog.
- The changelog in the source archive matches the root `CHANGELOG.md`.
- The store listing remains plain text instead of Markdown.
- The default locale includes `description.message`.

## Manual Gates

Manual QA still matters because the extension interacts with live websites and browser extension APIs.

Before release, verify:

- Options page loads and saves groups, websites, keywords, schedules, whitelist, password, UI mode, and UI element rules.
- Popup loads, uses the selected UI mode, opens options, and starts the UI picker.
- Blocking overlay appears on a known keyword match, displays diagnostic text, and allows the text to be selected.
- Blocked pages stop or mute video and audio instead of only covering the page visually.
- UI picker can pick, preview, outline, hide, adjust settings, save, save-and-continue, cancel, and delete rules.
- UI picker can temporarily allow page clicks without breaking its draggable panel.
- Options page updates stored UI blocked rules without requiring reload.
- Export and import work after the new storage and UI-rule changes.

## Release Bias

For this update, prefer reliability over new capability.

Do not add features during release prep unless they remove a release blocker. If a new idea appears, put it into `docs/potential-functionality.md` or the relevant architecture doc.

## Current Release Risks

- UI element blocking is powerful but sensitive to page structure. Manual QA should include both narrow and broader ancestor settings.
- Page blocking changed from navigation-first behavior to overlay-first behavior. Manual QA should confirm media is stopped and diagnostics remain visible.
- Store assets moved to `src/store-assets/`. Packaging and manifest path checks should catch broken references, but manual inspection of the generated ZIP is still useful.
