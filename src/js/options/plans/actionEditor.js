// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  SIMPLE_CHAIN_TRIGGER_LOCATIONS,
  TRIGGERED_ACTION_STEP_TYPES,
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

const LOCATION_OPTIONS = [
  ['', 'planActionLocationAnyLabel'],
  ['outsideEditable', 'planActionLocationOutsideEditableLabel'],
  ['editableField', 'planActionLocationEditableLabel']
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
  const stepSelect = createSelectInput(createStepOptions(), TRIGGERED_ACTION_STEP_TYPES.HIDE_ELEMENT, false);
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

  grid.appendChild(createLabeledControl(getPlanMessage('planActionNameLabel'), nameInput));
  grid.appendChild(createLabeledControl(getPlanMessage('planActionHostLabel'), hostInput));
  grid.appendChild(createLabeledControl(getPlanMessage('planActionTargetLabel'), targetSelect));
  grid.appendChild(createLabeledControl(getPlanMessage('planActionStepLabel'), stepSelect));
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
      stepType: stepSelect.value,
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
  const actionStep = scenario?.steps?.find(step => step.targetRuleId);
  const targetRule = elementRules.find(rule => rule.id === actionStep?.targetRuleId);
  const parts = [
    chain.enabled ? getPlanMessage('planEnabledLabel') : getPlanMessage('planDisabledLabel'),
    chain.hostPattern || getPlanMessage('planActionAnyHostLabel'),
    getStepLabel(actionStep?.type),
    targetRule?.name || actionStep?.targetRuleId || getPlanMessage('planActionNoTargetLabel'),
    getLocationLabel(scenario?.triggerLocation || ''),
    hasBlockStep(scenario) ? getPlanMessage('planActionBlocksAfterSummary') : getPlanMessage('planActionOnlySummary')
  ];
  return parts.filter(Boolean).join(' · ');
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

function createLocationOptions() {
  return LOCATION_OPTIONS.map(([value, key]) => [value, getPlanMessage(key)]);
}

function getStepLabel(type) {
  const option = STEP_OPTIONS.find(([value]) => value === type);
  return option ? getPlanMessage(option[1]) : String(type || '');
}

function getLocationLabel(location) {
  const normalizedLocation = SIMPLE_CHAIN_TRIGGER_LOCATIONS.includes(location) ? location : '';
  const option = LOCATION_OPTIONS.find(([value]) => value === normalizedLocation);
  return option ? getPlanMessage(option[1]) : '';
}

function createTextInput(value) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = value || '';
  return input;
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
