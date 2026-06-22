# Reviewer Notes

Defense Against Distractions is a local-first Manifest V3 browser extension. It blocks pages, hides selected page interface elements, runs local Pomodoro timing, and shows local intent-coherence diagnostics according to user-configured plans.

## File URL Behavior

The extension requests content-script access through `matches: ["<all_urls>"]`, but Chromium browsers keep `file://` access under browser control. Local files are affected only when the user explicitly enables "Allow access to file URLs" for the extension on the browser extensions page.

The extension cannot enable file URL access by itself. If file URL access is disabled by the browser, local files are outside normal page scanning, page blocking, UI cleanup, and page-signal collection.

## Incognito Behavior

Incognito use is controlled by the browser. The extension does not enable itself in incognito windows. A user must explicitly allow the extension in incognito from the browser extensions page before DaD can run there.

When incognito access is not enabled, DaD does not scan, block, hide UI elements, run page diagnostics, or collect page signals in incognito windows.

## Browser-Controlled Behavior

Some behavior depends on browser APIs and browser version details:

- Manifest V3 service workers can sleep and restart; DaD stores timer and protection state locally and uses alarms to reconcile timing after wakeup.
- Tab mute, media suspension, navigation transition qualifiers, idle state, and extension page loading are Chrome-controlled APIs. DaD requests those APIs only for local protection behavior and cannot guarantee behavior that Chrome itself withholds.
- Host page structure changes can affect user-created UI cleanup rules. DaD stores bounded matching rules and lets users adjust or delete them from the extension UI.
- The browser controls extension installation, permissions, incognito access, file URL access, and uninstallation.

## Store Review Claims

Claims in README, privacy policy, store listing text, and release packages should stay aligned with the checked source:

- no analytics, ads, tracking pixels, telemetry, or remote executable code;
- local Usage and Intent diagnostic surfaces are user-facing self-inspection tools, not developer analytics, telemetry, advertising measurement, or tracking dashboards;
- no sale or third-party transfer of user data;
- local Chrome extension storage for configuration, runtime state, and bounded diagnostics;
- manifest permissions and broad content-script access are mapped in [Permission Audit](permission-audit.md);
- open source under GPL-3.0-only with source at `https://github.com/molodchyk/Defense_against_Distractions`;
- runtime package excludes docs, the repository research workspace, tests, scripts, screenshots, promo images, store listing text, and source-only icon files.
