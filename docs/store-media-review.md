# Store Media Review

This document records the Chrome Web Store media review for the current release assets.

Review date: 2026-06-22.

Store screenshots and promo images must not expose personal accounts, private conversations, real rules, real domains, or other user-specific configuration. Demo browsing context should use reserved example hosts such as `example.test` instead of live sites.

## Current Assets

| Asset | Size | Purpose | Review note |
| --- | --- | --- | --- |
| `store/screenshots/01-popup-protection-status.png` | 1280x800 | Popup protection status | Uses a neutral background and a demo match label. No personal accounts, private conversations, real rules, real domains, or user-specific configuration are visible. |
| `store/screenshots/02-plan-pomodoro-controls.png` | 1280x800 | Plan-owned Pomodoro controls | Shows extension-owned controls and demo/default settings only. No personal accounts, private conversations, real domains, or user-specific configuration are visible. |
| `store/screenshots/03-intent-drift-recovery.png` | 1280x800 | Intent drift recovery prompt | Uses fake search content and reserved demo hosts under `example.test`, including `docs.example.test`, `workspace.example.test`, `research.example.test`, `media.example.test`, and `notes.example.test`. |
| `store/screenshots/04-blocked-page.png` | 1280x800 | Blocked page surface | Uses a demo keyword and demo context string. No live host, account, private conversation, or real rule is visible. |
| `store/screenshots/05-ui-element-picker.png` | 1280x800 | UI element picker | Uses a neutral demo translation page under `example.test` and extension-owned picker UI. No live service content, personal account, private conversation, real domain, or user-specific rule is visible. |
| `store/promo/small-promo-440x280.png` | 440x280 | Small promotional tile | Uses extension branding and product positioning only. It does not show accounts, conversations, rules, domains, or user-specific configuration. |
| `store/promo/marquee-promo-1400x560.png` | 1400x560 | Marquee promotional image | Uses extension branding and product positioning only. It does not show accounts, conversations, rules, domains, or user-specific configuration. |

## Reviewed Asset Hashes

These SHA-256 hashes bind the review above to the exact PNG files inspected for this release. If an image changes, update the review note and hash together.

| Asset | SHA-256 |
| --- | --- |
| `store/screenshots/01-popup-protection-status.png` | `200a3a9e386a6cafe2d1a4cf654777dc932fdb2f80756e33b58ce41138c1e16b` |
| `store/screenshots/02-plan-pomodoro-controls.png` | `cefe638c1d1c954e988cc7e3b564ae70f2185686bd5034247f352f22d4457765` |
| `store/screenshots/03-intent-drift-recovery.png` | `a66b7f5ccb7e7d7784308d63f0fad996b5dcebba5922979c44ba02aaff38d2d2` |
| `store/screenshots/04-blocked-page.png` | `8a8b69cee51ed02ba243734e9ad078d857b075dc68c98943071d9ee975208f6a` |
| `store/screenshots/05-ui-element-picker.png` | `b845229a7b761b72988e251aa25c01ea458d20b92840d3ed6fb822123cd154c5` |
| `store/promo/small-promo-440x280.png` | `dea99889b1e40c49efd5defe03db8fc44d6f1b78495bf1d8d1575ee54bf50da0` |
| `store/promo/marquee-promo-1400x560.png` | `f4d951dc88146fbc81c46b54ff1a69a41235af6973a3861ce14e061531d03baf` |

## Release Rule

If any screenshot or promotional image is replaced, repeat this review before release. The replacement must keep the same privacy boundary: no personal accounts, no private conversations, no real rules, no real domains, and no user-specific configuration.

Run `npm run verify:playbook`, `npm run package`, and `npm run verify:release` after changing these assets.
