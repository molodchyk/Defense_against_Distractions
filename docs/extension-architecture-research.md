# Extension Architecture Research

This note records external best-practice constraints for DaD as it grows. Sources are official Chrome extension / Chrome Web Store documentation unless noted otherwise.

## Sources Consulted

- Chrome extension service worker lifecycle: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
- Chrome extension service worker basics: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/basics
- Chrome content scripts: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- Chrome message passing: https://developer.chrome.com/docs/extensions/develop/concepts/messaging
- Chrome storage API: https://developer.chrome.com/docs/extensions/reference/api/storage
- Chrome permissions: https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions
- Chrome `activeTab`: https://developer.chrome.com/docs/extensions/develop/concepts/activeTab
- Chrome Web Store program policies: https://developer.chrome.com/docs/webstore/program-policies/policies
- Chrome remote hosted code guidance: https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code
- Chrome extension end-to-end testing: https://developer.chrome.com/docs/extensions/how-to/test/end-to-end-testing
- Chrome i18n guidance: https://developer.chrome.com/docs/extensions/develop/ui/i18n
- Chrome options-page guidance: https://developer.chrome.com/docs/extensions/develop/ui/options-page

## 2026-06-10 Research Refresh

The official Chrome documentation still supports the current DaD modularization direction. There is no Chrome-specific line-count rule for extension files; the line budgets in [DaD Modularization Roadmap](modularization-roadmap.md) are local maintainability guardrails, not browser requirements.

Current implications:

- Continue incremental responsibility extraction instead of a giant folder rename. This matches the risk profile of a growing MV3 extension with storage migrations, content-script load order, and user data compatibility.
- Keep the service worker modular with static imports. Chrome supports module service workers but not dynamic `import()` in extension service workers.
- Keep content scripts as an explicit adapter boundary while they are manifest-loaded classic scripts. Moving pure logic into shared modules is good; changing manifest order or adding a bundler should be justified separately.
- Treat content-script messages as untrusted inputs. Any future background message router should validate action names, sender context, tab identity, and payload shape.
- Keep sync storage for compact mission-critical configuration. Diagnostics, history, picker state, usage signals, and other noisy data should remain local, bounded, exportable, and clearable.
- Do not add a bundler just to make the tree look modern. A bundler becomes justified when it reduces content-script load-order fragility, enables safer package verification, or solves real duplication.
- Add browser E2E coverage before larger schedule/picker/UI rewrites. Unit tests prove model behavior; they do not prove extension-page, popup, service-worker, and content-script behavior.

## Findings And DaD Decisions

### 1. Background Code Must Be Termination-Safe

Chrome can terminate an extension service worker after inactivity, long requests, or slow network responses. Chrome explicitly advises extension developers to persist data instead of relying on service-worker global variables.

DaD decision:

- Background modules must treat in-memory state as a cache only.
- Pomodoro runtime, intent trajectory, tab mute restoration state, release notices, and schedule monitors must persist any state needed after worker restart.
- Background startup must be idempotent. Re-running initialization after service-worker restart must not duplicate alarms, listeners, or migrations.

Architecture rule:

- `src/js/background*.js` should become thin bootstraps.
- Persistent state helpers belong in feature runtime modules or platform storage modules.
- Any new background feature needs a restart test or at minimum a unit test that reconstructs runtime state from storage.

### 2. Use ES Modules Where Chrome Supports Them; Do Not Assume Dynamic Imports

Chrome supports service-worker module imports when the manifest background worker uses `"type": "module"`. The same docs state that dynamic `import()` is not supported in extension service workers.

DaD decision:

- Keep the background service worker as an ES-module entry point.
- Use static imports for background modules.
- Do not design lazy background module loading around dynamic imports unless a build step compiles it away.

Architecture rule:

- Background feature modules should be statically imported by a small `background/index.js` style entry point.
- If the number of static imports becomes unwieldy, introduce a local build step rather than runtime dynamic imports.

### 3. Content Scripts Are A Separate Trust And Module Boundary

Chrome documents content scripts as isolated-world scripts that can read/change page DOM and pass information to the extension. They can use only a limited set of extension APIs directly, and other privileged operations must go through messaging. Static content scripts run in manifest order.

DaD decision:

- Content scripts should stay as a deliberate adapter boundary.
- `window.DAD` globals are acceptable only as a compatibility API between ordered classic content scripts.
- Core logic should not depend on `window.DAD`; it should live in tested shared modules where possible.
- Content scripts should send minimal privileged requests to background code and should not be allowed to trigger broad privileged actions without validation.

Architecture rule:

- Split content features into:
  - pure core logic where possible,
  - classic `.global.js` adapters for manifest-loaded scripts,
  - a documented manifest load-order list.
- Keep content-script public APIs small and named.

### 4. Treat Messages From Content Scripts As Untrusted

Chrome's messaging security guidance says content scripts are less trustworthy than the extension service worker. Messages from content scripts may be attacker-crafted and should be validated and sanitized. Data sent to content scripts may leak to the web page.

DaD decision:

- Background message handlers must validate action names, tab identity, sender frame, and payload shape.
- Privileged actions such as muting tabs, resetting Pomodoro, clearing diagnostics, exporting data, or changing plan state should not trust content-script input by default.
- Content scripts should receive only the state they need to render or enforce the current page behavior.

Architecture rule:

- Introduce a background message router with per-action validators.
- Prefer typed/normalized command objects over ad hoc message checks scattered through runtime files.

### 5. Storage Must Be Split By Criticality And Sync Cost

Chrome storage has performance costs and quotas. `storage.local` is larger and local-only. `storage.sync` is approximately 100 KB total and 8 KB per item. `storage.session` is in-memory and cleared on extension reload/update/browser restart.

DaD decision:

- Mission-critical user configuration should stay compact and syncable:
  - plans,
  - plan schedules,
  - website/keyword entries,
  - allowed sites,
  - essential UI rule definitions.
- Large or noisy data should stay local:
  - usage stats,
  - intent trajectory diagnostics,
  - Pomodoro history,
  - UI picker diagnostics,
  - mini-panel UI position/size.
- Short-lived runtime caches can use session/in-memory where loss is acceptable.

Architecture rule:

- Storage ownership should be explicit per feature.
- Every new storage key must document:
  - storage area,
  - sync/local rationale,
  - quota risk,
  - retention/pruning rule,
  - migration behavior.

### 6. Permissions Must Be Narrow, Current, And Explainable

Chrome and Chrome Web Store docs emphasize using the narrowest permissions necessary. Store policy explicitly says not to request permissions for future-proofing.

DaD decision:

- Do not add permissions until a shipped feature requires them.
- Keep the privacy automation document aligned with the manifest.
- Revisit whether `activeTab`, `webNavigation`, `idle`, `downloads`, and broad content-script matches are still justified as the product model changes.

Architecture rule:

- Add a release check that compares manifest permissions against the privacy/store-listing justification document.
- Feature proposals that require new permissions must include a permission rationale before implementation.

### 7. `activeTab` Is Useful But Not A Replacement For Continuous Protection

Chrome describes `activeTab` as temporary access granted after user invocation and revoked on navigation or tab close. It can reduce install warnings for user-triggered actions.

DaD decision:

- Keep `activeTab` useful for popup-triggered actions like UI picking.
- Do not rely on `activeTab` for continuous protection, because keyword scanning, Pomodoro strict breaks, and UI cleanup need persistent content-script behavior.

Architecture rule:

- User-triggered tools can use `activeTab` semantics.
- Always-on protection must be modeled separately and justified through content script matches and privacy disclosures.

### 8. Store Policy Shapes Product Architecture

Chrome Web Store policy requires a narrow, understandable single purpose, accurate metadata, testing for broken features, correct data disclosures, privacy policy availability, and limitation of browsing-activity collection to user-facing features described in the listing and UI.

DaD decision:

- The product purpose should be framed as user-controlled distraction defense / focus protection.
- Future research, ML, usage stats, and problematic-usage detection must remain clearly inside that single purpose.
- Data collection must default local unless there is explicit opt-in and a concrete user-facing reason.
- Remote analytics or payment entitlement checks must be isolated and disclosed.

Architecture rule:

- The product should have a privacy boundary document next to feature specs.
- Any feature using browsing activity, page content, or behavioral signals needs:
  - local-only default,
  - retention rule,
  - UI disclosure,
  - export/clear path,
  - store-listing/privacy-policy update.

### 9. No Remote Hosted Code

Chrome's remote hosted code guidance says MV3 extensions need to bundle all executable code inside the extension. It specifically includes JavaScript and WASM loaded from outside the extension package.

DaD decision:

- Stripe or payment integrations must not inject remote checkout scripts into extension pages.
- Any payment flow should open a normal web checkout page externally, while the extension only checks a local/backend entitlement result.
- Do not add CDN scripts, remote imports, remote WASM, or runtime-loaded executable code.

Architecture rule:

- Package verification should scan built output for remote script/import/eval risks.
- If a build tool is introduced, verify the compiled extension package, not only source.

### 10. Testing Needs A Browser Layer, Not Only Unit Tests

Chrome's testing docs describe end-to-end tests as loading the extension package into a browser and automating user flows. They point to Puppeteer/Playwright, headless Chrome extension support, fixed extension IDs, popup testing, extension-page testing, and service-worker termination testing.

DaD decision:

- Existing unit tests are necessary but not enough.
- DaD needs E2E tests for:
  - options page plan editing,
  - schedule graph editing,
  - popup Pomodoro controls,
  - strict-break blocking,
  - content blocked page,
  - UI picker preview/save/cancel,
  - page reload after extension update/context invalidation.

Architecture rule:

- Add a browser E2E test harness before major UI rewrites.
- Popup code should support a test tab-id override, so it can be opened directly in a test tab.
- Service-worker restart behavior should be tested for Pomodoro, schedules, and tab mute restore.

### 11. Options Page Is The Correct Place For Complex Configuration

Chrome describes the options page as the place where users customize extension functionality. This fits DaD's plans, schedules, Pomodoro, intent, and settings model.

DaD decision:

- Keep the popup compact and action-oriented.
- Move complex configuration and diagnostics to options pages or optional on-page panels.
- Avoid turning the popup into the main control center.

Architecture rule:

- Popup modules should summarize and trigger actions.
- Options modules should own durable configuration.
- Content panels should be temporary, contextual, and local-only unless explicitly saved.

### 12. i18n Must Remain A First-Class Architecture Concern

Chrome i18n guidance is based on `_locales/<locale>/messages.json` and `chrome.i18n`. DaD also has a custom UI language selector and store-listing locale files.

DaD decision:

- New UI strings must be added through message keys, not hard-coded only in feature files.
- Store-listing localization and extension UI localization are separate assets and should remain separate.

Architecture rule:

- Feature modules can own fallback English strings, but user-visible strings must map to `_locales` keys before release.
- Locale completeness checks should be part of release verification.

## What This Means For The Current Modularization Roadmap

The roadmap's feature-first structure is still the right direction, with these refinements:

1. Add a `platform/chrome/messageRouter.js` or background-specific router before further privileged background growth.
2. Split popup first because it is already an ES module and is safe to modularize without content-script load-order risk.
3. Split options plans second because it is central and too large.
4. Split content scripts more carefully: keep classic manifest-loaded adapters until a build step is justified.
5. Add E2E infrastructure before deep schedule/picker UI rewrites.
6. Do not introduce a bundler just for taste. Introduce it when it solves content-script module composition, package-size control, remote-code scanning, or CSS bundling.
7. Keep sync storage small and treat forced schedules/plans as highest-priority data.
8. Keep local diagnostics local, bounded, exportable, and clearable.

## Immediate Next Engineering Steps

1. Add a file-size audit script and report threshold breaches.
2. Add a manifest-file reference check for content scripts and web-accessible resources.
3. Split `src/js/popup.js` into modules:
   - bootstrap,
   - Chrome message helpers,
   - protection summary,
   - Pomodoro card,
   - block diagnostics,
   - page signals,
   - intent diagnostics,
   - diagnostics export.
4. Add a basic Playwright or Puppeteer E2E harness that loads the unpacked extension.
5. Continue splitting `src/js/options/plans/controller.js` after the plan-specific files have been moved into `src/js/options/plans/`.
