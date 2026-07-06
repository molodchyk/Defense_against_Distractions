// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  SIMPLE_CHAIN_TRIGGER_LOCATIONS,
  SIMPLE_CHAIN_TRIGGER_TYPES,
  TRIGGERED_ACTION_STEP_TYPES,
  TRIGGERED_ACTION_TRIGGER_TYPES,
  createSimpleTriggeredActionChain
} from '../../../features/triggered-actions/core/index.js';
import {
  confirmDestructiveAction,
  createButton,
  createCheckboxInput,
  createCheckboxRow,
  createLabeledControl,
  createNumberInput,
  createPlanSubsection,
  createSelectInput
} from './dom.js';
import { getPlanMessage } from './messages.js';

const STEP_OPTIONS = [
  [TRIGGERED_ACTION_STEP_TYPES.HIDE_ELEMENT, 'planActionStepHideElementLabel'],
  [TRIGGERED_ACTION_STEP_TYPES.CLICK_ONCE, 'planActionStepClickOnceLabel'],
  [TRIGGERED_ACTION_STEP_TYPES.CLEAR_FIELD, 'planActionStepClearFieldLabel'],
  [TRIGGERED_ACTION_STEP_TYPES.PAUSE_MEDIA, 'planActionStepPauseMediaLabel'],
  [TRIGGERED_ACTION_STEP_TYPES.HIDE_IMAGES, 'planActionStepHideImagesLabel'],
  [TRIGGERED_ACTION_STEP_TYPES.DISABLE_CONTROLS, 'planActionStepDisableControlsLabel']
];

const SECOND_STEP_OPTIONS = [
  ['', 'planActionSecondStepNoneLabel'],
  ...STEP_OPTIONS
];

const LOCATION_OPTIONS = [
  ['', 'planActionLocationAnyLabel'],
  ['outsideEditable', 'planActionLocationOutsideEditableLabel'],
  ['editableField', 'planActionLocationEditableLabel']
];

const TRIGGER_OPTIONS = [
  [TRIGGERED_ACTION_TRIGGER_TYPES.BLOCK_SCORE, 'planActionTriggerAnyScoreLabel'],
  [TRIGGERED_ACTION_TRIGGER_TYPES.KEYWORD_BLOCK, 'planActionTriggerKeywordLabel'],
  [TRIGGERED_ACTION_TRIGGER_TYPES.STRUCTURAL, 'planActionTriggerStructuralLabel']
];

export function createPlanActionEditor({
  plan,
  elementRules,
  isLocked,
  onUpdateTriggeredActionChains
}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'plan-details';

  wrapper.appendChild(createChainAddSection({ plan, elementRules, isLocked, onUpdateTriggeredActionChains }));
  wrapper.appendChild(createChainListSection({ plan, elementRules, isLocked, onUpdateTriggeredActionChains }));
  return wrapper;
}

function createChainAddSection({ plan, elementRules, isLocked, onUpdateTriggeredActionChains }) {
  const section = createPlanSubsection('planActionsLabel');

  if (elementRules.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'muted-text';
    empty.textContent = getPlanMessage('planActionNoUiRulesLabel');
    section.appendChild(empty);
    return section;
  }

  const grid = document.createElement('div');
  grid.className = 'plan-action-form-grid';

  const initialRule = elementRules[0];
  const nameInput = createTextInput(getPlanMessage('planActionDefaultName'));
  const hostInput = createTextInput(initialRule?.urlPattern || '');
  const targetSelect = createSelectInput(
    elementRules.map(rule => [rule.id, rule.name || rule.id]),
    initialRule?.id || '',
    false
  );
  const triggerTypeSelect = createSelectInput(createTriggerOptions(), TRIGGERED_ACTION_TRIGGER_TYPES.BLOCK_SCORE, false);
  const triggerFilterInput = createTextInput('', getPlanMessage('planActionTriggerFilterPlaceholder'));
  const stepSelect = createSelectInput(createStepOptions(), TRIGGERED_ACTION_STEP_TYPES.HIDE_ELEMENT, false);
  const secondStepSelect = createSelectInput(createSecondStepOptions(), '', false);
  const secondTargetSelect = createSelectInput(
    elementRules.map(rule => [rule.id, rule.name || rule.id]),
    initialRule?.id || '',
    false
  );
  const scoreInput = createNumberInput(100, 1, 100, false);
  const locationSelect = createSelectInput(createLocationOptions(), '', false);
  const blockAfterInput = createCheckboxInput(true, isLocked);
  const enabledInput = createCheckboxInput(true, false);

  targetSelect.addEventListener('change', () => {
    const selectedRule = elementRules.find(rule => rule.id === targetSelect.value);
    if (!hostInput.value.trim() && selectedRule?.urlPattern) {
      hostInput.value = selectedRule.urlPattern;
    }
  });
  triggerTypeSelect.addEventListener('change', () => {
    syncTriggerFilterState(triggerTypeSelect, triggerFilterInput);
  });
  secondStepSelect.addEventListener('change', () => {
    syncSecondActionState(secondStepSelect, secondTargetSelect);
  });
  syncTriggerFilterState(triggerTypeSelect, triggerFilterInput);
  syncSecondActionState(secondStepSelect, secondTargetSelect);

  grid.appendChild(createLabeledControl(getPlanMessage('planActionNameLabel'), nameInput));
  grid.appendChild(createLabeledControl(getPlanMessage('planActionHostLabel'), hostInput));
  grid.appendChild(createLabeledControl(getPlanMessage('planActionTargetLabel'), targetSelect));
  grid.appendChild(createLabeledControl(getPlanMessage('planActionTriggerTypeLabel'), triggerTypeSelect));
  grid.appendChild(createLabeledControl(getPlanMessage('planActionTriggerFilterLabel'), triggerFilterInput));
  grid.appendChild(createLabeledControl(getPlanMessage('planActionStepLabel'), stepSelect));
  grid.appendChild(createLabeledControl(getPlanMessage('planActionSecondStepLabel'), secondStepSelect));
  grid.appendChild(createLabeledControl(getPlanMessage('planActionSecondTargetLabel'), secondTargetSelect));
  grid.appendChild(createLabeledControl(getPlanMessage('planActionMinimumScoreLabel'), scoreInput));
  grid.appendChild(createLabeledControl(getPlanMessage('planActionLocationLabel'), locationSelect));
  section.appendChild(grid);

  const toggles = document.createElement('div');
  toggles.className = 'plan-checkbox-grid';
  toggles.appendChild(createCheckboxLabel(getPlanMessage('planActionBlockAfterLabel'), blockAfterInput));
  toggles.appendChild(createCheckboxLabel(getPlanMessage('planActionEnabledLabel'), enabledInput));
  section.appendChild(toggles);

  const actions = document.createElement('div');
  actions.className = 'plan-entry-actions';
  const addButton = createButton(getPlanMessage('addPlanActionButton'), () => {
    if (isLocked && !blockAfterInput.checked) {
      alert(getPlanMessage('lockedScheduleErrorMessage'));
      return;
    }

    const chain = createSimpleTriggeredActionChain({
      planId: plan.id,
      idSeed: Date.now().toString(36),
      name: nameInput.value,
      hostPattern: hostInput.value,
      targetRuleId: targetSelect.value,
      triggerType: triggerTypeSelect.value,
      triggerFilter: triggerFilterInput.value,
      stepType: stepSelect.value,
      additionalSteps: secondStepSelect.value ? [{
        targetRuleId: secondTargetSelect.value,
        stepType: secondStepSelect.value
      }] : [],
      minimumScore: scoreInput.value,
      triggerLocation: locationSelect.value,
      blockAfterAction: blockAfterInput.checked,
      enabled: enabledInput.checked
    }, plan.triggeredActionChains);

    if (!chain) {
      alert(getPlanMessage('planActionInvalidDraft'));
      return;
    }

    onUpdateTriggeredActionChains(plan.id, [...plan.triggeredActionChains, chain]);
  }, 'secondary-button');
  actions.appendChild(addButton);
  section.appendChild(actions);
  return section;
}

function createChainListSection({ plan, elementRules, isLocked, onUpdateTriggeredActionChains }) {
  const section = createPlanSubsection('planActionChainsLabel');

  if (plan.triggeredActionChains.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'muted-text';
    empty.textContent = getPlanMessage('planActionNoChainsLabel');
    section.appendChild(empty);
    return section;
  }

  const list = document.createElement('div');
  list.className = 'plan-action-chain-list';
  plan.triggeredActionChains.forEach(chain => {
    list.appendChild(createChainItem({ plan, chain, elementRules, isLocked, onUpdateTriggeredActionChains }));
  });
  section.appendChild(list);
  return section;
}

function createChainItem({ plan, chain, elementRules, isLocked, onUpdateTriggeredActionChains }) {
  const item = document.createElement('article');
  item.className = 'plan-action-chain-item';

  const title = document.createElement('strong');
  title.textContent = chain.name;

  const summary = document.createElement('p');
  summary.className = 'muted-text';
  summary.textContent = formatChainSummary(chain, elementRules);

  const controls = document.createElement('div');
  controls.className = 'plan-entry-actions';
  controls.appendChild(createCheckboxRow(
    getPlanMessage('planActionEnabledLabel'),
    chain.enabled,
    checked => {
      onUpdateTriggeredActionChains(plan.id, plan.triggeredActionChains.map(candidate => (
        candidate.id === chain.id ? { ...candidate, enabled: checked } : candidate
      )));
    },
    isLocked && (chain.enabled || !chainBlocksAfterAction(chain))
  ));

  const deleteButton = createButton(getPlanMessage('deleteButtonLabel'), async () => {
    const confirmed = await confirmDestructiveAction({
      message: getPlanMessage('confirmDeleteActionChain')
    });
    if (!confirmed) {
      return;
    }

    onUpdateTriggeredActionChains(
      plan.id,
      plan.triggeredActionChains.filter(candidate => candidate.id !== chain.id)
    );
  }, 'delete-button');
  deleteButton.disabled = isLocked && chain.enabled;

  controls.appendChild(deleteButton);
  item.appendChild(title);
  item.appendChild(summary);
  item.appendChild(controls);
  return item;
}

function formatChainSummary(chain, elementRules) {
  const scenario = chain.scenarios[0];
  const actionSteps = getTargetActionSteps(scenario);
  const actionSummary = formatActionStepSequence(actionSteps, elementRules);
  const parts = [
    chain.enabled ? getPlanMessage('planEnabledLabel') : getPlanMessage('planDisabledLabel'),
    chain.hostPattern || getPlanMessage('planActionAnyHostLabel'),
    getTriggerSummary(chain.trigger),
    actionSummary,
    getLocationLabel(scenario?.triggerLocation || ''),
    hasBlockStep(scenario) ? getPlanMessage('planActionBlocksAfterSummary') : getPlanMessage('planActionOnlySummary')
  ];
  return parts.filter(Boolean).join(' · ');
}

function getTargetActionSteps(scenario) {
  return Array.isArray(scenario?.steps)
    ? scenario.steps.filter(step => step.targetRuleId)
    : [];
}

function formatActionStepSequence(actionSteps, elementRules) {
  if (actionSteps.length === 0) {
    return getPlanMessage('planActionNoTargetLabel');
  }

  return actionSteps
    .map(step => formatActionStepSummary(step, elementRules))
    .reduce((summary, stepSummary) => (
      summary
        ? getPlanMessage('planActionStepSequenceSummary', [summary, stepSummary])
        : stepSummary
    ), '');
}

function formatActionStepSummary(step, elementRules) {
  const targetRule = elementRules.find(rule => rule.id === step.targetRuleId);
  return getPlanMessage('planActionTargetStepSummary', [
    getStepLabel(step.type),
    targetRule?.name || step.targetRuleId || getPlanMessage('planActionNoTargetLabel')
  ]);
}

function hasBlockStep(scenario) {
  return Array.isArray(scenario?.steps) && scenario.steps.some(step => step.type === TRIGGERED_ACTION_STEP_TYPES.BLOCK_PAGE);
}

function chainBlocksAfterAction(chain) {
  return Array.isArray(chain.scenarios)
    && chain.scenarios.length > 0
    && chain.scenarios.every(hasBlockStep);
}

function createStepOptions() {
  return STEP_OPTIONS.map(([value, key]) => [value, getPlanMessage(key)]);
}

function createSecondStepOptions() {
  return SECOND_STEP_OPTIONS.map(([value, key]) => [value, getPlanMessage(key)]);
}

function createLocationOptions() {
  return LOCATION_OPTIONS.map(([value, key]) => [value, getPlanMessage(key)]);
}

function createTriggerOptions() {
  return TRIGGER_OPTIONS.map(([value, key]) => [value, getPlanMessage(key)]);
}

function getStepLabel(type) {
  const option = STEP_OPTIONS.find(([value]) => value === type);
  return option ? getPlanMessage(option[1]) : String(type || '');
}

function getTriggerSummary(trigger = {}) {
  const type = SIMPLE_CHAIN_TRIGGER_TYPES.includes(trigger.type)
    ? trigger.type
    : TRIGGERED_ACTION_TRIGGER_TYPES.BLOCK_SCORE;

  if (type === TRIGGERED_ACTION_TRIGGER_TYPES.BLOCK_SCORE) {
    return getPlanMessage('planActionTriggerAnyScoreLabel');
  }

  const ids = type === TRIGGERED_ACTION_TRIGGER_TYPES.STRUCTURAL
    ? trigger.structuralIds
    : trigger.keywordIds;

  if (Array.isArray(ids) && ids.length > 0) {
    return type === TRIGGERED_ACTION_TRIGGER_TYPES.STRUCTURAL
      ? getPlanMessage('planActionStructuralFilterSummary', [ids.join(', ')])
      : getPlanMessage('planActionKeywordFilterSummary', [ids.join(', ')]);
  }

  return type === TRIGGERED_ACTION_TRIGGER_TYPES.STRUCTURAL
    ? getPlanMessage('planActionAnyStructuralSummary')
    : getPlanMessage('planActionAnyKeywordSummary');
}

function getLocationLabel(location) {
  const normalizedLocation = SIMPLE_CHAIN_TRIGGER_LOCATIONS.includes(location) ? location : '';
  const option = LOCATION_OPTIONS.find(([value]) => value === normalizedLocation);
  return option ? getPlanMessage(option[1]) : '';
}

function createTextInput(value, placeholder = '') {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = value || '';
  if (placeholder) {
    input.placeholder = placeholder;
  }
  return input;
}

function syncTriggerFilterState(triggerTypeSelect, triggerFilterInput) {
  const needsFilter = triggerTypeSelect.value !== TRIGGERED_ACTION_TRIGGER_TYPES.BLOCK_SCORE;
  triggerFilterInput.disabled = !needsFilter;
  if (!needsFilter) {
    triggerFilterInput.value = '';
  }
}

function syncSecondActionState(secondStepSelect, secondTargetSelect) {
  secondTargetSelect.disabled = !secondStepSelect.value;
}

function createCheckboxLabel(labelText, input) {
  const label = document.createElement('label');
  label.className = 'plan-checkbox-row';
  const text = document.createElement('span');
  text.textContent = labelText;
  label.appendChild(input);
  label.appendChild(text);
  return label;
}
