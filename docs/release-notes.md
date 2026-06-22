# Release Notes

This document is the release-facing index for the current Chrome Web Store package. The canonical full changelog remains [CHANGELOG.md](../CHANGELOG.md); the source archive includes that file, and release verification checks that the archived copy matches the root copy.

## 1.6.1

Release focus:

- Current plan-based protection model: plans, schedules, allowed websites, keywords, locked-schedule rules, Pomodoro, intent coherence, and optional UI cleanup.
- Store-ready media: five 1280x800 screenshots, a 440x280 small promo, and a 1400x560 marquee promo verified by the package checks and documented in [Store Media Review](store-media-review.md).
- StorePilot preparation: localized listing text, privacy form answers, category selection, additional fields, and permission justifications for the current manifest.
- Privacy and package posture: local-first behavior, no analytics, no remote executable code, and no unexpected remote network access in the runtime package.
- Release automation: manifest, import, locale, playbook, package, source archive, file-size, and folder-density checks are part of the release gate; browser-load remains an isolated-environment smoke check.

Release gates:

- `npm test`
- `npm run verify:manifest`
- `npm run verify:imports`
- `npm run verify:locales`
- `npm run verify:static-localization`
- `npm run verify:playbook`
- `npm run audit:file-sizes`
- `npm run audit:folder-density`
- `npm run package`
- `npm run verify:package`
- `npm run verify:release`

Optional isolated smoke check:

- `npm run verify:browser-load`

The runtime extension archive intentionally excludes docs, tests, scripts, screenshots, promo images, store listing text, and source-only icon files. Those files remain available in the source archive for reviewers and future maintenance.
