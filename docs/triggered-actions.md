# Triggered Action Chains

Triggered action chains are a future generalization of keyword blocking and UI element cleanup.

DaD can already detect configured page content and block the page. DaD can also already hide elements, hide images, disable controls, click once, clear a field, or pause media through user-configured UI element rules. The missing product layer is to let a triggered block run one or more bounded page actions before, after, or instead of full-page blocking.

## Product Intent

Sometimes the best defense is not only blocking the page. If the source of the trigger is a removable object, DaD should be able to remove or neutralize that object and then optionally block the page as a fallback.

Examples:

- detect a name in Gmail and click the trash button for the received email;
- detect the same name while composing an email and discard the draft instead;
- detect a repeating feed term and click a local "not interested" or dismiss button;
- detect a keyword inside a modal and click a close button before blocking the page;
- detect media or a noisy UI region and pause/hide it before escalating.

The point is not arbitrary scripting. The point is user-configured, bounded remediation tied to the same local trigger system that already powers blocking.

## Raw Requirement Preserved

The original note is preserved verbatim in [potential-functionality.md](potential-functionality.md#original-wording-not-to-be-edited). The clarified feature name is:

> Make a block perform one or more ordered bounded actions on trigger.

## Core Model

A triggered action chain has five parts:

1. `trigger`: what activates the chain.
2. `scenario`: which page situation this trigger appears in.
3. `steps`: ordered actions to run.
4. `fallback`: what to do if the scenario or a step is not safely recognized.
5. `run policy`: how often the chain may run and when it must stop.

Conceptual shape:

```json
{
  "id": "gmail-delete-received-trigger",
  "name": "Delete received matching mail",
  "enabled": true,
  "hostPattern": "mail.google.com",
  "trigger": {
    "type": "keywordBlock",
    "keywordIds": ["person-name"],
    "scope": "pageOrContainer",
    "minimumScore": 100
  },
  "scenarios": [
    {
      "id": "received-message",
      "guards": ["gmail-message-row-present", "compose-editor-absent"],
      "triggerLocation": "messageListOrThread",
      "steps": [
        { "type": "clickOnce", "targetRuleId": "gmail-trash-button" },
        { "type": "blockPage", "reason": "keyword-trigger-action-complete" }
      ],
      "fallback": { "type": "blockPage" }
    },
    {
      "id": "compose-draft",
      "guards": ["gmail-compose-editor-present"],
      "triggerLocation": "editableField",
      "steps": [
        { "type": "clickOnce", "targetRuleId": "gmail-discard-draft-button" },
        { "type": "blockPage", "reason": "draft-trigger-action-complete" }
      ],
      "fallback": { "type": "blockPage" }
    }
  ],
  "runPolicy": {
    "oncePerPageVisit": true,
    "cooldownSeconds": 30,
    "stopOnFirstFailure": true
  }
}
```

This is a design shape, not a final storage schema.

## Trigger Types

First-class trigger candidates:

- keyword or phrase matched by an existing plan entry;
- block score threshold reached;
- structural trigger such as `has:audio`, `has:video`, `has:recommendations`, or `has:comments`;
- intent intervention state such as hard quarantine or drift descendant;
- user-owned focus state such as Strained or Vulnerable.

The first implementation should start with keyword/block-score triggers only.

## Scenario Guards

The Gmail example shows why a trigger alone is not enough. The same keyword can appear in different situations with different correct actions.

Scenario guards answer: "What kind of page state is this?"

Possible guards:

- current host or URL pattern;
- required element rule is present;
- forbidden element rule is absent;
- trigger text appears inside a specific container fingerprint;
- trigger text appears inside an editable field;
- trigger text appears outside editable fields;
- one of several named UI targets is currently actionable;
- page has an active block overlay;
- page is in a known app mode such as list, thread, compose, modal, or settings.

For Gmail:

- Received email scenario: message row/thread exists, trash button exists, compose editor absent, trigger text appears outside editable fields.
- Draft scenario: compose editor exists, discard draft button exists, trigger text appears inside an editable field or compose container.

If guards are ambiguous, DaD should not click. It should fall back to block, prompt, or outline diagnostics.

## Step Types

Safe first-step types can reuse existing bounded UI element actions:

- `clickOnce`: click one matched enabled element once.
- `clearField`: clear one matched editable field once.
- `pauseMedia`: pause matched media once.
- `hideElement`: hide matched elements.
- `hideImages`: hide image-like elements inside a bounded action scope.
- `disableControls`: make matched interactive controls inert while the action is active.
- `blockPage`: show the normal block overlay.
- `waitForElement`: wait briefly for an expected target before the next step.
- `stop`: end the chain without blocking.

Later step types may be considered only after a safety model exists:

- `fillField` with user-provided static text;
- `selectOption`;
- `navigateToUrlPattern`;
- `confirmPrompt`.

Avoid for the first version:

- arbitrary JavaScript;
- repeated clicking loops;
- unlimited multi-page automation;
- stored dynamic message content;
- server-side actions;
- automatic permanent deletion without an explicit destructive-action safety model.

## Action Ordering

Users should be able to order steps because different defensive tactics have different meanings:

- `click -> block`: remove source, then prevent further engagement.
- `block -> click`: freeze interaction first, then allow a controlled cleanup action from the overlay.
- `hide -> continue`: remove the trigger source while preserving the page.
- `click -> wait -> click -> block`: possible later, but risky because multi-step destructive workflows can break easily.

The safe default is `action -> block fallback`, with stop-on-failure.

## Execution Contract

The first implementation should be current-page only. A chain may inspect the current top-frame document, match picker-created targets in that document, and run bounded actions there. It must not continue across top-frame navigation, follow a workflow into another mailbox folder, or run a second page's actions from the previous page's state. If an action causes navigation or unload, the chain stops; the next page must be evaluated from fresh trigger and scenario state.

This resolves the first-version boundary: v1 is current-page only. Multi-page chains are a future product, not a hidden extension of this model. If they are ever reconsidered, they need a separate design, permission/privacy review, destructive-action safety model, and tests before they can be treated as part of DaD's bounded action-chain system.

Scenario selection must be deterministic:

- evaluate all enabled scenarios for the active trigger;
- if exactly one scenario matches, run that scenario's ordered steps;
- if zero scenarios match, use the configured fallback;
- if multiple scenarios match, treat the run as ambiguous;
- ambiguous runs must not click, clear, fill, submit, delete, or otherwise mutate the page;
- after the first failed step, stop the chain and use the configured fallback.

Every run should produce a bounded local outcome event for diagnostics and future local validation. The event may include chain ID, scenario ID, trigger type, step type, step index, result enum, fallback type, coarse hostname, and timestamp bucket. It must not include raw trigger text, surrounding page text, form contents, full URLs, page screenshots, or remote telemetry.

Useful result enums:

- `notMatched`: trigger fired, but no scenario matched.
- `ambiguous`: more than one scenario matched, so no action ran.
- `ran`: at least one step completed.
- `failed`: a selected scenario step could not be safely run.
- `fallbackBlocked`: fallback block was shown after no match, ambiguity, or failure.
- `blocked`: the chain intentionally reached a `blockPage` step.

## Safety Rules

Triggered action chains must be narrower than arbitrary browser automation.

Required safety rules:

- user creates targets with the picker;
- rules are host-scoped by default;
- destructive actions show explicit labels in options;
- action steps run once per page visit or once per trigger fingerprint;
- mutation observers cannot cause repeat clicking;
- a failed or ambiguous step stops the chain;
- fallback behavior is explicit;
- preview/outline mode exists before enabling;
- local diagnostics record only action outcome, not raw page text;
- locked schedules treat disabling a triggered action chain as relaxing protection.

For email-like products, destructive multi-step actions such as "delete forever from bin" should require a stronger explicit confirmation than a normal click-once rule.

## UI Implications

Triggered actions should not be hidden inside the existing keyword textarea. They need their own editor because order, targets, scenarios, and fallbacks matter.

Possible UI:

- In a plan entry, add `On trigger` with choices:
  - `Block page`;
  - `Run action chain`;
  - `Run action chain, then block`;
  - `Block unless action chain succeeds`.
- Chain editor:
  - trigger source;
  - scenario guard cards;
  - ordered step list;
  - fallback;
  - test on current page;
  - diagnostics preview.
- Reuse the existing UI picker to select each target element.

The action list should stay compact. Advanced actions should be behind an expand/edit control so this does not turn plan editing into a general scripting IDE.

DaD Select quick add is a related creation shortcut: selected page text can become a keyword with an editable score estimate and optional safe action presets, while ordered steps, scenario guards, and fallbacks still belong in this triggered-action editor. See [DaD Select quick add](selected-text-quick-add.md).

## Implementation Phases

1. **Design and storage model**
   - Define triggered action schema.
   - Define scenario guards.
   - Define run outcome events.
   - Add tests for strictness classification during locked schedules.

   Implementation state: the pure core model now lives in `src/features/triggered-actions/core/`. It normalizes bounded current-page action chains, trigger metadata, scenario guards, ordered steps, explicit fallbacks, run policy, deterministic scenario selection, bounded local outcome events, and conservative protected-schedule strictness classification. It is not yet wired into live keyword blocking or page mutation.

2. **Reuse UI element rule targets**
   - Let action chains reference existing element rule fingerprints as targets.
   - Keep click/clear/pause once-per-page safeguards.

3. **Keyword-trigger integration**
   - When a plan keyword reaches the block threshold, evaluate enabled chains before rendering the block overlay.
   - Respect chain order and fallback.

4. **Scenario recognition**
   - Add guards for editable-field versus non-editable trigger location.
   - Add required-target-present and forbidden-target-absent guards.

5. **UI editor**
   - Add an `On trigger` editor to plan entries.
   - Add test-run/outline diagnostics before enabling.

6. **Gmail-style examples**
   - Do not hard-code Gmail as the core feature.
   - Use Gmail as a test target for general guard/action behavior.

## Open Questions

- Should action chains belong to plan entries, keyword entries, UI element rules, or a separate "automations" section?
- Should `fillField` exist at all, or should the first version only support clearing?
- Should a destructive click require a confirmation state, a cooldown, or a locked-plan flag?
- Post-v1 only: if multi-page chains are ever considered, what separate permission/privacy/safety model would make them acceptable?
- Should action chains run before the block overlay, from inside the overlay, or both depending on order?
- How should DaD display "action succeeded, then block happened" on the blocked page?
