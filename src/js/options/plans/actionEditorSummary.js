// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  SIMPLE_CHAIN_TRIGGER_LOCATIONS,
  SIMPLE_CHAIN_TRIGGER_TYPES,
  TRIGGERED_ACTION_STEP_TYPES,
  TRIGGERED_ACTION_TRIGGER_TYPES
} from '../../../features/triggered-actions/core/index.js';
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

export function createStepOptions() {
  return STEP_OPTIONS.map(([value, key]) => [value, getPlanMessage(key)]);
}

export function createSecondStepOptions() {
  return SECOND_STEP_OPTIONS.map(([value, key]) => [value, getPlanMessage(key)]);
}

export function createAbsentTargetOptions(elementRules) {
  return [
    ['', getPlanMessage('planActionAbsentTargetNoneLabel')],
    ...elementRules.map(rule => [rule.id, rule.name || rule.id])
  ];
}

export function createLocationOptions() {
  return LOCATION_OPTIONS.map(([value, key]) => [value, getPlanMessage(key)]);
}

export function createTriggerOptions() {
  return TRIGGER_OPTIONS.map(([value, key]) => [value, getPlanMessage(key)]);
}

export function formatChainSummary(chain, elementRules) {
  const scenarioSummary = formatScenarioSequence(chain.scenarios, elementRules);
  const parts = [
    chain.enabled ? getPlanMessage('planEnabledLabel') : getPlanMessage('planDisabledLabel'),
    chain.hostPattern || getPlanMessage('planActionAnyHostLabel'),
    getTriggerSummary(chain.trigger),
    scenarioSummary
  ];
  return parts.filter(Boolean).join(' · ');
}

export function chainBlocksAfterAction(chain) {
  return Array.isArray(chain.scenarios)
    && chain.scenarios.length > 0
    && chain.scenarios.every(hasBlockStep);
}

function formatScenarioSequence(scenarios = [], elementRules) {
  const summaries = (Array.isArray(scenarios) ? scenarios : [])
    .map(scenario => formatScenarioSummary(scenario, elementRules))
    .filter(Boolean);
  return summaries.join(' / ');
}

function formatScenarioSummary(scenario, elementRules) {
  const actionSteps = getTargetActionSteps(scenario);
  const parts = [
    formatActionStepSequence(actionSteps, elementRules),
    formatAbsentTargetSummary(scenario, elementRules),
    getLocationLabel(scenario?.triggerLocation || ''),
    hasBlockStep(scenario)
      ? getPlanMessage('planActionBlocksAfterSummary')
      : getPlanMessage('planActionOnlySummary')
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

function formatAbsentTargetSummary(scenario, elementRules) {
  const absentGuards = Array.isArray(scenario?.guards)
    ? scenario.guards.filter(guard => guard?.type === 'target' && guard.invert)
    : [];

  if (absentGuards.length === 0) {
    return '';
  }

  const guardLabels = absentGuards.map(guard => {
    const targetRule = elementRules.find(rule => rule.id === guard.id);
    return targetRule?.name || guard.id;
  });

  return getPlanMessage('planActionAbsentTargetSummary', [guardLabels.join(', ')]);
}

function hasBlockStep(scenario) {
  return Array.isArray(scenario?.steps) && scenario.steps.some(step => step.type === TRIGGERED_ACTION_STEP_TYPES.BLOCK_PAGE);
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
