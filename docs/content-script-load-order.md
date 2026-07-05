# Content Script Load Order

This document makes the classic content-script order in `manifest.json` auditable. These scripts are loaded through `content_scripts[0].js` in the listed order, share the `window.DAD` compatibility namespace, and are not ES modules in the current runtime package.

Preserve this order when moving content-script files. A move must update `manifest.json`, this document, and the relevant ownership docs in the same change, then run `npm run verify:manifest`, `npm run verify:imports`, and `npm run verify:playbook`.

## Order Contract

- `src/platform/chrome/contentBridge.js` must load first. It owns the classic content-script Chrome runtime, storage, extension URL, and i18n bridge.
- Feature adapters may attach only small named public APIs to `window.DAD`.
- `src/app/content/index.js` must load last. It is the bootstrap that wires the already-loaded adapters.

## Ordered Scripts

- `src/platform/chrome/contentBridge.js`
- `src/js/content/state.js`
- `src/js/content/uiLanguage.js`
- `src/js/content/pomodoro/activity.js`
- `src/js/content/pomodoro/miniPanelState.js`
- `src/js/content/pomodoro/miniPanelStyleConstants.js`
- `src/js/content/pomodoro/miniPanelStyleCss.js`
- `src/js/content/pomodoro/miniPanelStyle.js`
- `src/js/content/pomodoro/miniPanelTheme.js`
- `src/js/content/pomodoro/miniPanelLayout.js`
- `src/js/content/pomodoro/miniPanelRender.js`
- `src/js/content/pomodoro/miniPanel.js`
- `src/js/content/page-signals/contextTokens.js`
- `src/js/content/page-signals/selectionCandidate.js`
- `src/js/content/page-signals/recommenderZones.js`
- `src/js/content/page-signals/activityScroll.js`
- `src/js/content/page-signals/activityInput.js`
- `src/js/content/page-signals/activityMedia.js`
- `src/js/content/page-signals/activity.js`
- `src/js/content/page-signals/collector.js`
- `src/js/content/page-signals/reporter.js`
- `src/js/content/pageSignals.js`
- `src/js/content/intent/constants.js`
- `src/js/content/intent/messages.js`
- `src/js/content/intent/style.js`
- `src/js/content/intent/theme.js`
- `src/js/content/intent/prompt.js`
- `src/js/content/intent/elementReduction.js`
- `src/js/content/intent/newTabFreeze.js`
- `src/js/content/intent/effects.js`
- `src/js/content/intent/media.js`
- `src/js/content/intent/continueMessage.js`
- `src/js/content/intentIntervention.js`
- `src/js/content/url.js`
- `src/js/content/keywords.js`
- `src/js/content/ui-blocking/constants.js`
- `src/js/content/ui-blocking/fingerprint.js`
- `src/js/content/ui-blocking/matcher.js`
- `src/js/content/ui-blocking/storage.js`
- `src/js/content/ui-blocking/elementState.js`
- `src/js/content/ui-blocking/scopedActions.js`
- `src/js/content/ui-blocking/actions.js`
- `src/js/content/ui-blocking/dom.js`
- `src/js/content/ui-blocking/builtInRules.js`
- `src/js/content/ui-blocking/pickerStyle.js`
- `src/js/content/ui-blocking/pickerPanel.js`
- `src/js/content/ui-blocking/pickerPreview.js`
- `src/js/content/plans.js`
- `src/js/content/ui-blocking/controller.js`
- `src/js/content/content-blocking/constants.js`
- `src/js/content/content-blocking/overlayMessages.js`
- `src/js/content/content-blocking/overlayStyle.js`
- `src/js/content/content-blocking/overlayTheme.js`
- `src/js/content/content-blocking/overlayDiagnostics.js`
- `src/js/content/content-blocking/overlayPomodoro.js`
- `src/js/content/content-blocking/overlayEvents.js`
- `src/js/content/content-blocking/overlayCustomization.js`
- `src/js/content/content-blocking/overlay.js`
- `src/js/content/content-blocking/navigationGuards.js`
- `src/js/content/content-blocking/media.js`
- `src/js/content/content-blocking/blocker.js`
- `src/js/content/triggered-actions/constants.js`
- `src/js/content/triggered-actions/utils.js`
- `src/js/content/triggered-actions/model.js`
- `src/js/content/triggered-actions/runner.js`
- `src/js/content/content-blocking/structuralTriggers.js`
- `src/js/content/content-blocking/keywords.js`
- `src/js/content/content-blocking/siteCheck.js`
- `src/app/content/index.js`
