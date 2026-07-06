# Release Notes

This document is the release-facing index for the current Chrome Web Store package. The canonical full changelog remains [CHANGELOG.md](../CHANGELOG.md); the source archive includes that file, and release verification checks that the archived copy matches the root copy.

## 1.6.1

Release focus:

- Current plan-based protection model: plans, schedules, allowed websites, keywords, locked-schedule rules, Pomodoro, intent coherence, and optional UI cleanup.
- UI cleanup actions now include scoped `Hide images` and `Disable controls` presets in addition to hide, click-once, clear-field, and pause-media rules.
- Triggered action chains now have a first live current-page runtime: active plan-owned chains can reuse existing picker-created UI rule targets when a keyword or structural score reaches the block threshold, with deterministic scenario selection and fallback blocking.
- Plans now expose an `Actions` tab for the first compact triggered-action authoring flow: attach one or two existing UI cleanup rules as ordered bounded actions, optionally require another selected UI rule to be absent, optionally filter to a keyword or structural trigger, optionally constrain editable-field trigger location, and decide whether the action sequence should be followed by normal blocking.
- Triggered action chains now have a non-mutating current-page preview message that reports bounded scenario, target, selected-step, trigger-diagnostics, and would-block status without running actions or exposing page text.
- Popup Block Diagnostics and the blocked-page overlay now show the latest triggered-action outcomes as bounded action/result pairs, so action cleanup and fallback blocking are visible without exposing page text, selectors, or full URLs.
- Blocked-page score diagnostics now use the same 0-100 user-facing scale as popup keyword diagnostics, while the stored compatibility threshold remains unchanged.
- DaD Select quick add: current-page snapshots can include a bounded active selected-text candidate, and the new selection-only right-click menu item can hand selected text to the popup as a short-lived local pending candidate. The popup can show/copy or save that candidate as a keyword rule in an existing or new current-site plan entry, with editable score and optional bounded cleanup presets.
- Store-ready media: five 1280x800 screenshots, a 440x280 small promo, and a 1400x560 marquee promo verified by the package checks and documented in [Store Media Review](store-media-review.md).
- StorePilot preparation: localized listing text, privacy form answers, category selection, additional fields, and permission justifications for the current manifest.
- Privacy and package posture: local-first behavior, no analytics, no remote executable code, and no unexpected remote network access in the runtime package.
- Release automation: unit tests, manifest, import, locale, playbook, research-quality, package, source archive, file-size, and folder-density checks are part of the automated release gate; browser-load remains a required isolated target-browser smoke check before publishing.

Release gates:

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

Required isolated browser smoke check:

- `npm run verify:browser-load`

Run this only in an isolated browser environment where launching Chrome, Edge, or Chromium cannot close active browser windows or unsaved work. If that environment is not available, keep the release marked as not fully browser-verified rather than running it on an active workstation.

The runtime extension archive intentionally excludes docs, research, tests, scripts, screenshots, promo images, store listing text, and source-only icon files. Those files remain available in the source archive for reviewers and future maintenance.
