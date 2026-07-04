// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { hasAll } from '../../playbook-utils.mjs';

export const triggeredActionSpecFailure = 'Triggered action specs must preserve bounded, picker-scoped, scenario-guarded action chains rather than arbitrary browser automation.';
export const selectedTextQuickAddSpecFailure = 'DaD Select specs must keep quick-add presets separate from the full triggered-action execution model.';
export const potentialFunctionalityTraceFailure = 'Potential functionality must preserve the raw triggered-action wording and link it to the structured triggered-action spec.';
export const selectedTextQuickAddTraceFailure = 'Potential functionality must preserve the raw DaD Select wording and link it to the structured quick-add spec.';

export function getProductSpecFailures({ potentialFunctionality, selectedTextQuickAdd, triggeredActions }) {
  const failures = [];

  if (!hasAll(triggeredActions, [
    /# Triggered Action Chains/,
    /future generalization of keyword blocking and UI element cleanup/i,
    /one or more bounded page actions/i,
    /## Raw Requirement Preserved/,
    /potential-functionality\.md#original-wording-not-to-be-edited/,
    /Make a block perform one or more ordered bounded actions on trigger/,
    /## Core Model/,
    /`trigger`: what activates the chain/,
    /`scenario`: which page situation this trigger appears in/,
    /`steps`: ordered actions to run/,
    /`fallback`: what to do if the scenario or a step is not safely recognized/,
    /`run policy`: how often the chain may run and when it must stop/,
    /keyword\/block-score triggers only/i,
    /## Scenario Guards/,
    /trigger text appears inside an editable field/i,
    /trigger text appears outside editable fields/i,
    /If guards are ambiguous, DaD should not click/i,
    /## Step Types/,
    /`clickOnce`: click one matched enabled element once/,
    /`clearField`: clear one matched editable field once/,
    /`pauseMedia`: pause matched media once/,
    /`hideImages`: hide image-like elements inside a bounded action scope/,
    /`disableControls`: make matched interactive controls inert while the action is active/,
    /`blockPage`: show the normal block overlay/,
    /Avoid for the first version:[\s\S]*arbitrary JavaScript[\s\S]*repeated clicking loops[\s\S]*unlimited multi-page automation[\s\S]*stored dynamic message content[\s\S]*server-side actions[\s\S]*automatic permanent deletion without an explicit destructive-action safety model/,
    /## Execution Contract/,
    /first implementation should be current-page only/i,
    /must not continue across top-frame navigation/i,
    /exactly one scenario matches/i,
    /if zero scenarios match, use the configured fallback/i,
    /if multiple scenarios match, treat the run as ambiguous/i,
    /ambiguous runs must not click, clear, fill, submit, delete, or otherwise mutate the page/i,
    /after the first failed step, stop the chain and use the configured fallback/i,
    /bounded local outcome event/i,
    /chain ID, scenario ID, trigger type, step type, step index, result enum, fallback type, coarse hostname, and timestamp bucket/i,
    /must not include raw trigger text, surrounding page text, form contents, full URLs, page screenshots, or remote telemetry/i,
    /`notMatched`[\s\S]*`ambiguous`[\s\S]*`ran`[\s\S]*`failed`[\s\S]*`fallbackBlocked`[\s\S]*`blocked`/,
    /## Safety Rules/,
    /Triggered action chains must be narrower than arbitrary browser automation/i,
    /user creates targets with the picker/i,
    /rules are host-scoped by default/i,
    /action steps run once per page visit or once per trigger fingerprint/i,
    /mutation observers cannot cause repeat clicking/i,
    /fallback behavior is explicit/i,
    /preview\/outline mode exists before enabling/i,
    /local diagnostics record only action outcome, not raw page text/i,
    /locked schedules treat disabling a triggered action chain as relaxing protection/i,
    /destructive multi-step actions such as "delete forever from bin" should require a stronger explicit confirmation/i,
    /DaD Select quick add is a related creation shortcut/i,
    /ordered steps, scenario guards, and fallbacks still belong in this triggered-action editor/i
  ])) {
    failures.push(triggeredActionSpecFailure);
  }

  if (!hasAll(selectedTextQuickAdd, [
    /## Action Presets/,
    /DaD Select should support simple presets that compile into normal DaD configuration/i,
    /It should not create an unreviewable hidden action/i,
    /`Keyword \+ block page`/,
    /`Keyword \+ hide images`/,
    /`Keyword \+ disable controls`/,
    /###+ Picker-Backed Cleanup Gate/,
    /Do not expose `Keyword \+ hide images` or `Keyword \+ disable controls` as selectable popup controls until the picker can attach a concrete action scope/i,
    /Selected text is a trigger candidate, not an element scope/i,
    /cleanup presets return `needsElementScope` and do not mutate plans or create UI rules/i,
    /typed non-mutating result and leave plans and UI rules untouched/i,
    /Whole-page fallback is not an acceptable implicit scope/i,
    /first version should avoid adding a new permission/i,
    /right-click context menu is a later variant because it requires adding `contextMenus` to the manifest/i,
    /works without adding `contextMenus` unless the right-click variant is explicitly chosen/i,
    /If the later right-click context-menu variant adds `contextMenus`, update the manifest, permission audit, StorePilot privacy form, release notes, and Chrome Web Store permission justification in the same release/i,
    /## Relationship To Triggered Action Chains/,
    /DaD Select is a creation shortcut\. Triggered action chains are the execution model\./,
    /Advanced order, scenario guards, destructive actions, and fallback behavior belong in the triggered-action editor/i,
    /## Locked Schedule Strictness/,
    /strictness comparator/i
  ])) {
    failures.push(selectedTextQuickAddSpecFailure);
  }

  if (!hasAll(potentialFunctionality, [
    /## Original Wording \(not to be edited\)/,
    /now what generalizable feature I want/i,
    /Make a block perform an action \(or several\) on trigger/i,
    /how do we differentiate against those two scenarios/i,
    /\[Triggered action chains\]\(triggered-actions\.md\) generalize keyword blocking and UI cleanup/,
    /one or more bounded ordered actions/i,
    /scenario guards that distinguish received content from content the user is composing/i,
    /reuse the existing picker and bounded action model rather than introducing arbitrary JavaScript automation/i
  ])) {
    failures.push(potentialFunctionalityTraceFailure);
  }

  if (!hasAll(potentialFunctionality, [
    /DaD select \(right select\) word, add with popup, estimate score, able to disable buttons \+ block images/,
    /\[DaD Select quick add\]\(selected-text-quick-add\.md\)/,
    /user-selected page text into a popup-based keyword creation flow/i,
    /editable score estimate/i,
    /optional bounded action presets such as hide images or disable controls/i,
    /without adding a right-click `contextMenus` permission/i,
    /true context-menu variant should be a deliberate release decision with store permission documentation/i
  ])) {
    failures.push(selectedTextQuickAddTraceFailure);
  }

  return failures;
}
