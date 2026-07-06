# DaD Select Quick Add

DaD Select is a configuration shortcut for turning something the user sees on a page into a protection rule without leaving the current browsing context.

The raw original wording is preserved in [potential-functionality.md](potential-functionality.md#original-wording-not-to-be-edited):

> DaD select (right select) word, add with popup, estimate score, able to disable buttons + block images

## Product Intent

The current popup can expose current-page keyword ideas, but saving a rule still requires manual transfer into the options page. DaD Select should close that loop:

1. The user selects a word or phrase on the page.
2. The user either opens the popup with the selection still active or chooses the selection-only DaD Select right-click menu item.
3. The popup shows `Add to DaD` controls for the selected text.
4. DaD estimates a reasonable keyword score on the 0-100 authoring scale.
5. The user chooses the plan/entry and optional actions.
6. DaD saves the rule locally and re-evaluates the current page.

The feature should feel like picking up a piece of the page and turning it into defense. It should not feel like a general automation IDE.

## Implemented Boundary

The current version has two entry points:

- User selects visible text on a page.
- Popup path: the user opens the extension popup; the popup asks the content script for the active selection; the content script returns a bounded active-selection candidate through the existing `getPageSignalSnapshot` message.
- Right-click path: the user chooses the selection-only DaD Select context-menu item; the background stores a bounded pending candidate in local storage and asks Chrome to open the popup; the popup consumes that pending candidate and removes it.
- The popup shows a compact selected-text candidate when a bounded selection exists.
- Saving adds a keyword line to an existing plan entry using the current 0-100 authoring syntax.
- Optional action presets can be attached only if they map to existing or explicitly designed bounded actions.

Implemented keyword-first version: the content script can produce the bounded active-selection candidate for the popup snapshot; the right-click `contextMenus` path can hand selected text to the popup as a bounded pending candidate; the popup Page Signals card can show and copy the active-selection candidate as a keyword-editor line; and the popup can save the selected text into an existing plan entry or a new current-site entry with an editable 1-100 positive keyword score. The popup exposes `Keyword only`, `Block page`, `Hide images`, `Disable controls`, and `Action chain` action presets. Cleanup presets save the selected keyword first, then start the UI picker with the chosen cleanup action preselected so the user must still choose a concrete page scope before the UI rule is saved. The action-chain preset saves or confirms the selected keyword, then opens the selected plan's Actions editor so ordered steps, guards, fallback behavior, and the live draft outline remain in the normal triggered-action workflow.

## Selection Candidate

The content script should return a bounded candidate, not raw page context:

```json
{
  "text": "selected phrase",
  "normalizedText": "selected phrase",
  "tokens": ["selected", "phrase"],
  "host": "example.com",
  "source": "userSelection",
  "insideEditable": false,
  "selectionLength": 15,
  "estimatedScore100": 25,
  "wouldBlockCurrentPage": false
}
```

Rules:

- Trim whitespace and collapse repeated spaces.
- Reject empty, huge, or purely punctuation selections.
- Cap stored candidate text before it reaches the popup.
- Prefer exact phrase creation for short selections and tokenized suggestions for longer selections.
- Mark whether the selection came from an editable field, because selected text inside composition has different meaning than selected text in received content.

The selected text becomes persistent only if the user saves it as a keyword. Unsaved candidates should remain ephemeral.

Implementation state: popup-path unsaved candidates are computed on demand from the active page selection and included in the popup snapshot response. Right-click-path unsaved candidates are written only as short-lived local pending state so the popup can receive the explicit context-menu selection; the pending state is removed when consumed and expires if it is not consumed. The popup can copy the candidate as a keyword-editor line such as `selected phrase, 25/100`, or save it only after the user chooses `Add rule`. Unsaved candidates are never written to sync storage and never become rules without popup confirmation.

## Score Estimate

The score estimate is a helper, not an authority. It should answer: "If this selected text matters, what score is a reasonable starting point?"

Inputs that can be used locally:

- selection length;
- phrase specificity;
- whether the text appears repeatedly on the current page;
- whether the current page is already near the block threshold;
- whether the selection came from a title, heading, link, button, editable field, or body text when that can be determined safely;
- existing page-signal counts such as media, images, links, recommendation regions, and active input pressure.

Conservative first defaults:

- one generic word: do not auto-suggest saving, or suggest a low score;
- specific phrase or name: suggest medium score;
- phrase that already appears in a blocked diagnostic trail: suggest higher score;
- structural action presets such as image blocking or button disabling should not silently raise the keyword score unless the user chooses that preset.

The UI should show the estimate as editable, for example `25 / 100`, and show whether that score would block the current page under the selected plan.

## Popup UI

The popup quick-add panel should be small and operational:

- selected text preview;
- plan selector;
- entry selector or `Create entry`;
- editable score field on the 0-100 scale;
- optional action preset selector;
- `Add rule` button;
- current-page simulation line such as `Current page: would add 25 / 100`.

Implementation state: the popup exposes plan selection, entry selection or current-site entry creation, `Keyword only`, `Block page`, `Hide images`, `Disable controls`, and `Action chain` action selection, editable positive keyword score for non-block-page rules, Add rule, and a current-page simulation. `Block page` forces the saved selected-text score to `100/100` and locks the score input. `Hide images` and `Disable controls` keep the edited score, save the selected-text keyword, then open the page picker with the cleanup action preselected and assign the saved UI rule to the selected plan. `Action chain` keeps the edited score, saves or confirms the selected-text keyword, then opens Options on the selected plan's `Actions` tab.

Avoid long explanatory copy. The panel should be useful in a high-friction moment, not educational.

## Action Presets

DaD Select should support simple presets that compile into normal DaD configuration. It should not create an unreviewable hidden action.

Initial preset candidates:

- `Keyword only`: add the keyword and use normal page blocking behavior.
- `Keyword + block page`: add the keyword with a score high enough to block under the chosen entry threshold.
- `Keyword + hide images`: add the keyword and attach a bounded image-hiding action for matching pages or matching containers.
- `Keyword + disable controls`: add the keyword and attach a bounded control-disabling action for matching pages or matching containers.
- `Keyword + action chain`: open the plan Actions editor so the user can attach ordered bounded actions to the keyword trigger.

Implementation state: `Keyword only` preserves the edited score; `Keyword + block page` compiles by raising the saved keyword to `100/100`; `Keyword + hide images` and `Keyword + disable controls` are exposed through a picker-backed two-step flow; `Keyword + action chain` saves the keyword and deep-links to the plan Actions editor. The popup saves the selected keyword, then opens the page picker with `hideImages` or `disableControls` preselected for cleanup presets, or opens `Options -> Plans -> selected plan -> Actions` for the action-chain preset. The picker creates a normal enabled UI cleanup rule only after the user chooses a concrete scope, then adds that rule ID to the selected plan's `uiRuleIds`. The lower-level compiler still makes cleanup presets return `needsElementScope` and do not mutate plans or create UI rules when a caller requests a cleanup preset without a picker-produced scope.

### Picker-Backed Cleanup Gate

Do not expose `Keyword + hide images` or `Keyword + disable controls` as selectable popup controls unless the picker can attach a concrete action scope in the same flow. Selected text is a trigger candidate, not an element scope.

If no picker-produced scope exists, compiling these presets must return a typed non-mutating result and leave plans and UI rules untouched. Whole-page fallback is not an acceptable implicit scope for these presets.

Implementation state: the popup controls are exposed because the same flow launches the existing UI picker, preselects the cleanup action, and assigns the saved UI rule to the selected plan. If the user cancels the picker, the keyword remains saved but no UI cleanup rule is created.

## Hide Images

`hideImages` should be a reversible page action. It should not download, inspect, classify, or store image content.

Implemented UI-rule behavior:

- hide `img`, `picture`, visible image-like `svg`, `canvas`, role-image elements, and inline background-image elements inside the chosen action scope;
- hide matched image-like elements directly without downloading, classifying, or storing image content;
- restore images when the rule is disabled, the intervention clears, or the page unloads;
- cap the number of elements modified per run;
- keep diagnostics to the normal user-created UI rule fingerprint, not image URLs or image content.

Scope matters:

- whole-page image hiding is strong and should be explicit;
- container-scoped image hiding is safer when the selected keyword appears inside a repeated card, message, or feed item;
- image hiding should not be presented as making a page safe, only quieter.

## Disable Controls

`disableControls` should mean "make matched interactive controls inert while the rule is active." It should not click, submit, delete, or permanently mutate site data.

Implemented UI-rule behavior:

- target `button`, link-like controls, form controls, summary controls, contenteditable controls, and common interactive ARIA roles;
- prevent ordinary pointer and keyboard activation through temporary disabled, `aria-disabled`, `tabindex`, `pointer-events`, and `contenteditable` state where applicable;
- keep the target visible instead of hiding it completely;
- restore original state when the rule is disabled, the intervention clears, or the page unloads;
- cap the number of controls modified per run.

This action should be attached to a selected target, container, or action chain. A global "disable all buttons on this website" preset is too blunt for the first version.

## Relationship To Triggered Action Chains

DaD Select is a creation shortcut. Triggered action chains are the execution model.

For example:

1. Select a phrase in Gmail.
2. Add it as a keyword with score `50 / 100`.
3. Attach a chain: `if received message container -> click trash -> block page fallback`.
4. Attach another chain: `if compose editor -> disable send/discard draft prompt -> block page fallback`.

The quick-add popup should only expose safe presets. Advanced order, scenario guards, destructive actions, and fallback behavior belong in the triggered-action editor described in [triggered-actions.md](triggered-actions.md).

## Locked Schedule Strictness

During a protected active schedule:

- adding a selected keyword is stricter and should be allowed;
- increasing the estimated score is stricter and should be allowed;
- adding image-hiding or control-disabling actions is stricter and should be allowed;
- lowering a score, deleting a selected keyword, removing an attached action, or disabling an active action is relaxing and should be blocked until the lock ends.

This should use the same protected-plan strictness comparator as the existing plan, keyword, Pomodoro, intent, and UI cleanup edits.

## Privacy And Storage

The feature should stay local-first:

- no remote lookup;
- no analytics event;
- no durable selected-text storage unless the user saves the keyword;
- right-click DaD Select may store a bounded pending local candidate only until the popup consumes it or it expires;
- no raw surrounding page text in diagnostics;
- no image URLs, captions, or media metadata;
- no full-page screenshots;
- no selector storage beyond normal user-created UI rule fingerprints.

The right-click context-menu variant uses `contextMenus`; manifest permission docs, the permission audit, StorePilot privacy form, release notes, and Chrome Web Store permission justification must stay synchronized in the same release.

## Acceptance Criteria

- Implemented: with valid selected text, the content script returns a bounded quick-add candidate in the current page-signal snapshot.
- Implemented: collapsed, punctuation-only, oversized, or token-empty selections return no candidate.
- Implemented: with text selected on a supported page, opening the popup can show a bounded selected-text candidate in Page Signals.
- Implemented: with selected text on a supported page, the DaD Select right-click context menu can pass a bounded pending candidate to the popup quick-add controls without saving a rule first.
- Implemented: with no valid selection, the popup selected-text row stays empty and the copy button stays disabled.
- Implemented: saving a keyword through quick add produces the same normalized rule format as manual entry editing.
- Implemented: the score estimate is editable and uses the positive 1-100 keyword-authoring range, because `0/100` is a no-op rather than a valid saved strengthening rule.
- Implemented: the popup can simulate whether the new score would block the current page by this keyword alone before saving.
- Implemented: saved quick-add rules use the same protected-schedule strictness comparator as plan editing before storage writes.
- Implemented model: `hideImages` and `disableControls` presets compile to the existing reversible, capped, scoped UI cleanup actions only when a picker-produced scope rule is supplied; otherwise they are rejected as needing an element scope.
- Implemented UI slice: the popup exposes `Hide images` and `Disable controls` quick-add presets by saving the selected keyword and launching the UI picker with the selected cleanup action preselected; the picker saves the scoped UI rule and appends its ID to the selected plan without normalizing away other plan-owned fields.
- Implemented UI slice: the popup exposes an `Action chain` quick-add preset by saving or confirming the selected keyword and opening the selected plan's Actions editor through a plan deep link.
- Partly implemented tests: candidate normalization, editable-field flagging, score estimation, invalid-selection rejection, text caps, snapshot inclusion, popup display formatting, keyword-editor copy formatting, quick-add keyword-line formatting, right-click pending-candidate handoff, default target selection, selected-plan current-site entry selection, current-host entry creation, duplicate/raise behavior, block-page preset scoring, action-chain preset routing model, cleanup-preset scope requirement, scoped UI-rule compilation, picker launch options, picker-backed plan assignment, protected-schedule strictness compatibility, options plan deep-link parsing, and popup markup are covered.

## Open Questions

- Should quick add create a new entry automatically or require choosing an existing entry?
- Should the default score depend on the selected plan's current threshold or stay globally consistent?
- Should selected text inside editable fields default to a lower score because it may be user-authored?
- Should image hiding and control disabling be plan-wide interventions, action-chain steps, UI cleanup rule actions, or all three with the same underlying engine?
