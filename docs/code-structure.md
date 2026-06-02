# Code Structure

DaD is moving toward small modules grouped by runtime surface and product responsibility.

## Runtime Areas

`src/js/background` contains extension background/service-worker behavior.

`src/js/content` contains page-injected content scripts. These files are loaded by `manifest.json` in order and are not ES modules, so shared content-script APIs attach to `window.DAD`.

`src/js/options` contains options-page-only UI helpers and page behavior.

`src/js/shared` contains ES modules used by option/background code and tests.

## UI Element Blocking

UI element blocking is split into ordered content-script modules:

- `elementBlockingConstants.js`: storage keys, attributes, defaults, and shared constants.
- `elementBlockingFingerprint.js`: element fingerprints, labels, roles, target selection, and picker hit testing.
- `elementBlockingMatcher.js`: structural matching and match scoring.
- `elementBlockingStorage.js`: sync storage migration, split-rule storage, quota reserve checks, and rule persistence.
- `elementBlockingDom.js`: applying saved rules, previewing candidate rules, hiding/restoring elements, and mutation observation.
- `elementBlocking.js`: public entry points, picker lifecycle, rule creation, and content-script event wiring.

The public content-script API remains:

- `window.DAD.createElementBlockRule`
- `window.DAD.applyElementBlockRules`
- `window.DAD.startElementPicker`

Future work should keep new UI blocking behavior inside the narrowest module that owns it. For example, selector or diagnostic changes belong near fingerprint/matcher code, while preview display changes belong in `elementBlockingDom.js`.

## Future Protection Model

The emerging product model lives in `docs/protection-model.md`.

New protection features should avoid becoming one large content script again. Prefer dedicated modules for:

- Signals.
- Risk scoring.
- Interventions.
- Diagnostics.
- Plans.
- Trust windows.

The first local signal collector is `src/js/shared/pageSignals.js`. It is intentionally not wired into enforcement yet.
