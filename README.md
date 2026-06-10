# Defense Against Distractions

Defense Against Distractions is a browser extension that helps you avoid procrastination by blocking pages when distracting words or phrases appear in their text.

Instead of only blocking entire domains, you can define plan entries with websites and keywords. When a matching page reaches the configured distraction score, the extension redirects it to a block page.

## Features

- Block pages based on keywords, phrases, and weighted keyword scores.
- Organize websites and keywords inside enableable plans.
- Give plans their own allowed websites, schedules, and optional UI cleanup assignments.
- Use locked schedules to make focus rules harder to relax during chosen time windows.
- Allow websites inside a plan so that plan does not scan them.
- Protect the options page with a password.
- Hide distracting UI elements with a popup-based element picker. See [UI Element Blocking](docs/ui-element-blocking.md).
- Export and import extension settings.
- Localized UI through Chrome extension locales.

## How It Works

Create a plan, add one or more entries with websites and keywords, then decide when that plan should be active. Different protection contexts can be enabled, disabled, scheduled, and adjusted independently.

Keywords can be entered in three formats:

- `video games` blocks as soon as the phrase is detected.
- `news, 50` adds 50 points each time the keyword is found.
- `news, *, 10` multiplies the current page score when the keyword is found.

Pages are blocked when their score reaches `1000`.

## Locked Schedules

Locked schedules let you define times when the extension should resist being weakened. During an active locked schedule, the extension prevents changes such as deleting active schedules, weakening plan entries, relaxing schedule constraints, adding allowed websites, or changing password protection.

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

Run `npm run verify:release` after packaging to check that generated archives match the expected release shape. See [Release Readiness](docs/release-readiness.md) for the full automated and manual release gates.

The `dist/` directory is generated output and is not the source of truth. If a file in `dist/source/` looks stale, rerun `npm run package` instead of editing the generated copy directly.

Chrome Web Store API release helpers are documented in [Chrome Web Store API](docs/chrome-web-store-api.md). They use environment variables for OAuth credentials and never store CWS secrets in the repository.

## Project Structure

- `_locales/` contains translated extension messages.
- `src/options.html` contains the options page.
- `src/instructions.html` contains the in-extension guide.
- `src/blocked.html` contains the block page.
- `src/js/background.js` contains the service worker entry point.
- `src/js/content.js` scans pages and triggers blocking.
- `src/js/shared/` contains shared parsing, URL, storage, and schedule helpers.
- `src/css/` contains extension styles.

Runtime extension files are the files that must ship inside the extension ZIP. Source-only project files such as docs, tests, scripts, screenshots, promotional images, and store listing text are kept in the repository and source ZIP, but are intentionally excluded from the runtime extension package.

Store-facing assets live together:

- `src/store-assets/icons/` contains extension icons referenced by the manifest.
- `src/store-assets/promo/` contains Chrome Web Store promotional images.
- `src/store-assets/screenshots/` contains Chrome Web Store screenshots.
- `src/store-assets/store-listing/` contains plain text Chrome Web Store listing copy.

Architecture and release notes live in `docs/`. The current future-facing product model is documented in [Protection Model](docs/protection-model.md), the planned user-facing plan structure is documented in [Plans Architecture](docs/plans-architecture.md), and release gates are documented in [Release Readiness](docs/release-readiness.md).

## Contributing

Bug reports, ideas, and pull requests are welcome. If you find an issue, please open a GitHub issue with the browser version, extension version, steps to reproduce, and what you expected to happen.

For code changes, keep the extension behavior focused: improve clarity, reliability, and maintainability without expanding permissions unless there is a strong reason.

## Support

If this extension saves you time and you want to support its development:

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support-FFDD00?logo=buymeacoffee&logoColor=000)](https://buymeacoffee.com/molodchyk)
[![Patreon](https://img.shields.io/badge/Patreon-support-F96854?logo=patreon&logoColor=fff)](https://www.patreon.com/OMolodchyk)

## License

Licensed under GPL-3.0-or-later. See [LICENSE.txt](LICENSE.txt).
