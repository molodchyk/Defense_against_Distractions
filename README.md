# Defense Against Distractions

Defense Against Distractions is a browser extension that helps you avoid procrastination by blocking pages when distracting words or phrases appear in their text.

Instead of only blocking entire domains, you can define groups of websites and keywords. When a matching page reaches the configured distraction score, the extension redirects it to a block page.

## Features

- Block pages based on keywords, phrases, and weighted keyword scores.
- Organize websites and keywords into separate groups.
- Apply multiple groups to the same website.
- Use locked schedules to make focus rules harder to relax during chosen time windows.
- Whitelist websites that should never be scanned.
- Protect the options page with a password.
- Hide distracting UI elements with a popup-based element picker. See [UI Element Blocking](docs/ui-element-blocking.md).
- Export and import extension settings.
- Localized UI through Chrome extension locales.

## How It Works

Create a group, add one or more websites to that group, then add keywords that should be detected on those websites.

Keywords can be entered in three formats:

- `video games` blocks as soon as the phrase is detected.
- `news, 50` adds 50 points each time the keyword is found.
- `news, *, 10` multiplies the current page score when the keyword is found.

Pages are blocked when their score reaches `1000`.

## Locked Schedules

Locked schedules let you define times when the extension should resist being weakened. During an active locked schedule, the extension prevents changes such as deleting active schedules, removing existing websites or keywords from groups, relaxing schedule constraints, adding whitelisted websites, or changing password protection.

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

## Project Structure

- `_locales/` contains translated extension messages.
- `src/options.html` contains the options page.
- `src/instructions.html` contains the in-extension guide.
- `src/blocked.html` contains the block page.
- `src/js/background.js` contains the service worker entry point.
- `src/js/content.js` scans pages and triggers blocking.
- `src/js/shared/` contains shared parsing, URL, storage, and schedule helpers.
- `src/css/` contains extension styles.
- `src/assets/icons/` contains extension icons referenced by the manifest.
- `src/assets/promo/` contains Chrome Web Store promotional images.
- `src/assets/screenshots/` contains Chrome Web Store screenshots.

## Contributing

Bug reports, ideas, and pull requests are welcome. If you find an issue, please open a GitHub issue with the browser version, extension version, steps to reproduce, and what you expected to happen.

For code changes, keep the extension behavior focused: improve clarity, reliability, and maintainability without expanding permissions unless there is a strong reason.

## Support

If this extension saves you time and you want to support its development:

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support-FFDD00?logo=buymeacoffee&logoColor=000)](https://buymeacoffee.com/molodchyk)
[![Patreon](https://img.shields.io/badge/Patreon-support-F96854?logo=patreon&logoColor=fff)](https://www.patreon.com/OMolodchyk)

## License

Licensed under GPL-3.0-or-later. See [LICENSE.txt](LICENSE.txt).
