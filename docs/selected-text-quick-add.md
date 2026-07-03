# DaD Select Quick Add

DaD Select is a proposed configuration shortcut for turning something the user sees on a page into a protection rule without leaving the current browsing context.

The raw original wording is preserved in [potential-functionality.md](potential-functionality.md#original-wording-not-to-be-edited):

> DaD select (right select) word, add with popup, estimate score, able to disable buttons + block images

## Product Intent

The current popup can expose current-page keyword ideas, but saving a rule still requires manual transfer into the options page. DaD Select should close that loop:

1. The user selects a word or phrase on the page.
2. The popup detects the current selection and offers `Add to DaD`.
3. DaD estimates a reasonable keyword score on the 0-100 authoring scale.
4. The user chooses the plan/entry and optional actions.
5. DaD saves the rule locally and re-evaluates the current page.

The feature should feel like picking up a piece of the page and turning it into defense. It should not feel like a general automation IDE.

## First Version Boundary

The first version should avoid adding a new permission if the popup path is enough.

Recommended first slice:

- User selects visible text on a page.
- User opens the extension popup.
- The popup asks the content script for the active selection.
- The content script returns a bounded active-selection candidate through the existing `getPageSignalSnapshot` message.
- The popup shows a compact selected-text candidate when a bounded selection exists.
- Saving adds a keyword line to an existing plan entry using the current 0-100 authoring syntax.
- Optional action presets can be attached only if they map to existing or explicitly designed bounded actions.

Implemented foundation: the content script can now produce the bounded active-selection candidate for the popup snapshot, and the popup Page Signals card can show and copy that candidate as a keyword-editor line. The direct save path is still pending.

A true browser right-click context menu is a later variant because it requires adding `contextMenus` to the manifest and store privacy/permission documentation. That may still be worth doing, but it should be a deliberate release decision rather than a hidden side effect of the popup feature.

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

Implementation state: unsaved candidates are computed on demand from the active page selection and included in the popup snapshot response. The popup can copy the candidate as a keyword-editor line such as `selected phrase, 25/100`. Unsaved candidates are not written to sync or local storage.

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

Avoid long explanatory copy. The panel should be useful in a high-friction moment, not educational.

## Action Presets

DaD Select should support simple presets that compile into normal DaD configuration. It should not create an unreviewable hidden action.

Initial preset candidates:

- `Keyword only`: add the keyword and use normal page blocking behavior.
- `Keyword + block page`: add the keyword with a score high enough to block under the chosen entry threshold.
- `Keyword + hide images`: add the keyword and attach a bounded image-hiding action for matching pages or matching containers.
- `Keyword + disable controls`: add the keyword and attach a bounded control-disabling action for matching pages or matching containers.
- `Keyword + action chain`: open the fuller triggered-action editor when that exists.

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
- no selected-text storage unless the user saves the keyword;
- no raw surrounding page text in diagnostics;
- no image URLs, captions, or media metadata;
- no full-page screenshots;
- no selector storage beyond normal user-created UI rule fingerprints.

If the later right-click context-menu variant adds `contextMenus`, update the manifest, permission audit, StorePilot privacy form, release notes, and Chrome Web Store permission justification in the same release.

## Acceptance Criteria

- Implemented: with valid selected text, the content script returns a bounded quick-add candidate in the current page-signal snapshot.
- Implemented: collapsed, punctuation-only, oversized, or token-empty selections return no candidate.
- Implemented: with text selected on a supported page, opening the popup can show a bounded selected-text candidate in Page Signals.
- Implemented: with no valid selection, the popup selected-text row stays empty and the copy button stays disabled.
- Saving a keyword through quick add produces the same normalized rule format as manual entry editing.
- The score estimate is editable and uses the 0-100 authoring scale.
- The popup can simulate whether the new score would block the current page before saving.
- Saved quick-add rules participate in locked-schedule strictness checks.
- `hideImages` and `disableControls` presets compile to the existing reversible, capped, scoped UI cleanup actions.
- The feature works without adding `contextMenus` unless the right-click variant is explicitly chosen.
- Partly implemented tests: candidate normalization, editable-field flagging, score estimation, invalid-selection rejection, text caps, snapshot inclusion, popup display formatting, and keyword-editor copy formatting are covered. Protected-plan strictness and action preset compilation remain for the save/action UI slice.

## Open Questions

- Should quick add create a new entry automatically or require choosing an existing entry?
- Should the default score depend on the selected plan's current threshold or stay globally consistent?
- Should selected text inside editable fields default to a lower score because it may be user-authored?
- Should the right-click context-menu variant wait for the action-chain editor so the permission is justified by more than keyword creation?
- Should image hiding and control disabling be plan-wide interventions, action-chain steps, UI cleanup rule actions, or all three with the same underlying engine?
