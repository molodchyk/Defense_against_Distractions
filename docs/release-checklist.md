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
- Add, edit, save, and delete a group.
- Add websites and keywords to a group.
- Add, edit, save, and delete a locked schedule.
- Confirm active locked schedules disable restricted controls.
- Add and delete a whitelisted website.
- Set and delete an options-page password.
- Confirm the password overlay appears when a password is set.
- Visit a configured site and confirm matching keywords trigger blocking.
- Confirm whitelisted sites are not blocked.
- Test export and import.

## Store Assets

- Use the English store listing from `src/store-assets/store-listing/en.txt`.
- Use screenshots from `src/store-assets/screenshots/`.
- Use promotional images from `src/store-assets/promo/`.
- Use extension icons from `src/store-assets/icons/`.

## Publish

- Upload `dist/Defense_against_Distractions-vX.Y.Z-extension.zip` as the extension package.
- Use `dist/Defense_against_Distractions-vX.Y.Z-source.zip` when a source archive is needed.
- Tag the release with the same version as `manifest.json`.
