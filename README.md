# Defense Against Distractions

Defense Against Distractions is a local-first browser extension for creating protection plans that block distracting pages by keywords, schedules, Pomodoro state, intent coherence, and optional UI cleanup.

Instead of only blocking entire domains, you can define plan entries with websites and keywords. When a matching page reaches the configured distraction score, the extension blocks it with an extension-owned overlay and local diagnostics.

## Features

- Block pages based on keywords, phrases, and weighted keyword scores.
- Organize websites and keywords inside enableable plans.
- Give plans their own allowed websites, schedules, Pomodoro rules, intent-coherence settings, and optional UI cleanup assignments.
- Use locked schedules to make focus rules harder to relax during chosen time windows.
- Allow websites inside a plan so that plan does not scan them.
- Use Pomodoro work/rest timing that can credit idle or locked time as rest.
- Detect possible browsing-chain drift locally and show recovery choices.
- Protect the options page with a password.
- Hide distracting UI elements with a popup-based element picker. See [UI Element Blocking](docs/ui-element-blocking.md).
- Export and import extension settings.
- Reset extension data from Settings before uninstalling or starting over.
- Localized UI through Chrome extension locales.

## How It Works

Create a plan, add one or more entries with websites and keywords, then decide when that plan should be active. Different protection contexts can be enabled, disabled, scheduled, and adjusted independently.

Keywords can be entered in three formats:

- `video games` blocks as soon as the phrase is detected.
- `news, 50` adds 50 points each time the keyword is found.
- `news, *, 10` multiplies the current page score when the keyword is found.

Pages are blocked when their score reaches `1000`.

## Locked Schedules

Locked schedules let you define times when the extension should resist being weakened. During an active locked schedule, the extension prevents changes such as deleting active schedules, weakening plan entries, relaxing schedule constraints, adding allowed websites, or changing password protection. Stricter changes are still allowed, including adding blocked entries, tightening Pomodoro or intent settings, and starting or resuming Pomodoro instead of pausing or resetting it.

Each scheduled day must keep at least one hour unlocked.

## Installation For Development

1. Clone this repository.
2. Open your Chromium-based browser's extensions page.
3. Enable developer mode.
4. Choose "Load unpacked".
5. Select this repository folder.

The extension uses Manifest V3 and does not require a build step.

## Packaging

Run `npm run package` to generate release archives in `dist/`:

- `Defense_against_Distractions-vX.Y.Z-extension.zip` contains only the runtime extension files for loading or store upload.
- `Defense_against_Distractions-vX.Y.Z-source.zip` contains the source tree, tests, docs, scripts, screenshots, and promotional assets.

Run `npm run verify:playbook` to check README, privacy, license, package metadata, and store-listing alignment against the shared browser-extension playbook. Run `npm run verify:package` after packaging to check the generated runtime archive for manifest/import consistency, source-map policy, and remote executable code. Run `npm run verify:release` to check the generated archives and the package gate together. `npm run verify:browser-load` is a required isolated target-browser smoke check before publishing, but it is not part of the automated package or release gates. Run it only in an isolated browser environment where launching a browser cannot close active user windows or unsaved work. See [Release Readiness](docs/release-readiness.md) for the full automated and manual release gates.

The `dist/` directory is generated output and is not the source of truth. It should contain only the current extension and source archive zips after packaging.

Chrome Web Store API release helpers are documented in [Chrome Web Store API](docs/chrome-web-store-api.md). They use environment variables for OAuth credentials and never store CWS secrets in the repository.

## Project Structure

- `_locales/` contains translated extension messages.
- `src/options.html` contains the options page.
- `src/instructions.html` contains the in-extension guide.
- `src/blocked.html` contains the extension-owned blocked page surface.
- `src/app/` contains runtime entry points such as the MV3 background service worker.
- `src/features/` contains feature-owned source modules that can be imported by runtime entries.
- `src/platform/` contains browser API wrappers and platform adapters.
- `src/app/background/index.js` contains the service worker entry point.
- `src/app/popup/index.js` contains the popup entry point.
- `src/app/options/index.js` contains the options page entry point.
- `src/app/instructions/index.js` contains the instructions page entry point.
- `src/app/blocked/index.js` contains the blocked page entry point.
- `src/app/content/index.js` contains the classic content-script entry point.
- `src/js/shared/` contains shared parsing, URL, UI helpers, and compatibility barrels for migrated callers; feature-owned models live under `src/features/`, and Chrome API wrappers live under `src/platform/`.
- `src/css/` contains thin stylesheet entry points and focused surface files during migration; new styling should move to the narrowest feature or surface file documented in [Code Structure](docs/code-structure.md).

Runtime extension files are the files that must ship inside the extension ZIP. Source-only project files such as docs, tests, scripts, screenshots, promotional images, and store listing text are kept in the repository and source ZIP, but are intentionally excluded from the runtime extension package. The runtime package also excludes the repository research workspace.

Release-facing assets use the shared browser-extension playbook shape:

- `assets/icons/` contains packaged extension icons referenced by the manifest.
- `store/promo/` contains Chrome Web Store promotional images.
- `store/screenshots/` contains Chrome Web Store screenshots.
- `store/store-listing/` contains plain text Chrome Web Store listing copy.

Architecture and release notes live in `docs/`. The current future-facing product model is documented in [Protection Model](docs/protection-model.md), the planned user-facing plan structure is documented in [Plans Architecture](docs/plans-architecture.md), durable project choices are indexed in [Decision Records](docs/decision-records.md), manifest permissions are mapped in [Permission Audit](docs/permission-audit.md), classic content-script manifest order is documented in [Content Script Load Order](docs/content-script-load-order.md), localization workflow is documented in [Localization](docs/localization.md), reviewer-facing browser limitations are documented in [Reviewer Notes](docs/reviewer-notes.md), store screenshots and promo assets are reviewed in [Store Media Review](docs/store-media-review.md), current release notes are documented in [Release Notes](docs/release-notes.md), release gates are documented in [Release Readiness](docs/release-readiness.md), current verification state is recorded in [Release Verification Record](docs/release-verification-record.md), and shared playbook evidence is indexed in [Browser Extension Playbook Compliance](docs/browser-extension-playbook-compliance.md).

Current code ownership and the reusable architecture target are documented in [Code Structure](docs/code-structure.md) and [Extension Modularization Playbook](docs/extension-modularization-playbook.md).

## Privacy

Defense Against Distractions is local-first. It stores configuration and bounded diagnostics in Chrome extension storage, does not use analytics, ads, tracking pixels, telemetry, remote executable code, or remote network requests, and does not require a server for core blocking behavior. See [PRIVACY.md](PRIVACY.md).

## Contributing

Bug reports, ideas, and pull requests are welcome. If you find an issue, please open a GitHub issue with the browser version, extension version, steps to reproduce, and what you expected to happen.

For code changes, keep the extension behavior focused: improve clarity, reliability, and maintainability without expanding permissions unless there is a strong reason.

## License

Licensed under GPL-3.0-only. See [LICENSE](LICENSE).

Source: https://github.com/molodchyk/Defense_against_Distractions

## Support

If this extension saves you time and you want to support its development:

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support-FFDD00?logo=buymeacoffee&logoColor=000)](https://buymeacoffee.com/molodchyk)
[![Patreon](https://img.shields.io/badge/Patreon-support-F96854?logo=patreon&logoColor=fff)](https://www.patreon.com/OMolodchyk)
