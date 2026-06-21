# Store Media Review

This document records the Chrome Web Store media review for the current release assets.

Review date: 2026-06-21.

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

## Release Rule

If any screenshot or promotional image is replaced, repeat this review before release. The replacement must keep the same privacy boundary: no personal accounts, no private conversations, no real rules, no real domains, and no user-specific configuration.

Run `npm run verify:playbook`, `npm run package`, and `npm run verify:release` after changing these assets.
