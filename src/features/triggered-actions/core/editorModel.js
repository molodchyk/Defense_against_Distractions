// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  TRIGGERED_ACTION_STEP_TYPES,
  TRIGGERED_ACTION_TRIGGER_TYPES
} from './constants.js';
import { normalizeTriggeredActionChain } from './model.js';

export const SIMPLE_CHAIN_STEP_TYPES = Object.freeze([
  TRIGGERED_ACTION_STEP_TYPES.HIDE_ELEMENT,
  TRIGGERED_ACTION_STEP_TYPES.CLICK_ONCE,
  TRIGGERED_ACTION_STEP_TYPES.CLEAR_FIELD,
  TRIGGERED_ACTION_STEP_TYPES.PAUSE_MEDIA,
  TRIGGERED_ACTION_STEP_TYPES.HIDE_IMAGES,
  TRIGGERED_ACTION_STEP_TYPES.DISABLE_CONTROLS
]);

export const SIMPLE_CHAIN_TRIGGER_LOCATIONS = Object.freeze([
  '',
  'outsideEditable',
  'editableField'
]);

export const SIMPLE_CHAIN_TRIGGER_TYPES = Object.freeze([
  TRIGGERED_ACTION_TRIGGER_TYPES.BLOCK_SCORE,
  TRIGGERED_ACTION_TRIGGER_TYPES.KEYWORD_BLOCK,
  TRIGGERED_ACTION_TRIGGER_TYPES.STRUCTURAL
]);

export function getSimpleTriggeredActionChainDraftErrors(draft = {}) {
  const errors = [];

  if (!normalizeId(draft.targetRuleId)) {
    errors.push('targetRuleId');
  }

  if (!SIMPLE_CHAIN_STEP_TYPES.includes(draft.stepType)) {
    errors.push('stepType');
  }

  if (!SIMPLE_CHAIN_TRIGGER_LOCATIONS.includes(String(draft.triggerLocation || ''))) {
    errors.push('triggerLocation');
  }

  if (!SIMPLE_CHAIN_TRIGGER_TYPES.includes(draft.triggerType || TRIGGERED_ACTION_TRIGGER_TYPES.BLOCK_SCORE)) {
    errors.push('triggerType');
  }

  return errors;
}

export function createSimpleTriggeredActionChain(draft = {}, existingChains = []) {
  const errors = getSimpleTriggeredActionChainDraftErrors(draft);
  if (errors.length > 0) {
    return null;
  }

  const targetRuleId = normalizeId(draft.targetRuleId);
  const stepType = draft.stepType;
  const blockAfterAction = draft.blockAfterAction !== false;
  const triggerType = normalizeTriggerType(draft.triggerType);
  const triggerIds = normalizeTriggerIds(draft.triggerIds ?? draft.triggerFilter);
  const steps = [
    { type: stepType, targetRuleId }
  ];

  if (blockAfterAction) {
    steps.push({
      type: TRIGGERED_ACTION_STEP_TYPES.BLOCK_PAGE,
      reason: 'triggered-action-complete'
    });
  }

  return normalizeTriggeredActionChain({
    id: getAvailableChainId(draft, existingChains),
    name: normalizeDisplayText(draft.name, 'Triggered action chain'),
    enabled: draft.enabled !== false,
    hostPattern: normalizeDisplayText(draft.hostPattern, ''),
    trigger: {
      type: triggerType,
      keywordIds: triggerType === TRIGGERED_ACTION_TRIGGER_TYPES.KEYWORD_BLOCK ? triggerIds : [],
      structuralIds: triggerType === TRIGGERED_ACTION_TRIGGER_TYPES.STRUCTURAL ? triggerIds : [],
      minimumScore: normalizeInteger(draft.minimumScore, 100, 1, 100)
    },
    scenarios: [{
      id: 'target-present',
      guards: [{ type: 'target', id: targetRuleId }],
      triggerLocation: String(draft.triggerLocation || ''),
      steps,
      fallback: { type: TRIGGERED_ACTION_STEP_TYPES.BLOCK_PAGE }
    }],
    fallback: { type: TRIGGERED_ACTION_STEP_TYPES.BLOCK_PAGE },
    runPolicy: {
      oncePerPageVisit: true,
      cooldownSeconds: normalizeInteger(draft.cooldownSeconds, 30, 0, 3600),
      stopOnFirstFailure: true
    }
  });
}

function normalizeTriggerType(value) {
  return SIMPLE_CHAIN_TRIGGER_TYPES.includes(value)
    ? value
    : TRIGGERED_ACTION_TRIGGER_TYPES.BLOCK_SCORE;
}

function normalizeTriggerIds(value) {
  const rawValues = Array.isArray(value)
    ? value
    : String(value || '').split(/[\n,;]+/);

  const seen = new Set();
  const ids = [];
  rawValues.forEach(rawValue => {
    const normalized = normalizeDisplayText(rawValue, '');
    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    ids.push(normalized);
  });
  return ids;
}

function getAvailableChainId(draft, existingChains) {
  const existingIds = new Set(
    (Array.isArray(existingChains) ? existingChains : [])
      .map(chain => normalizeId(chain?.id))
      .filter(Boolean)
  );
  const requestedId = normalizeId(draft.id);
  const seed = normalizeId(draft.idSeed, Date.now().toString(36));
  const baseId = requestedId || normalizeId(`${draft.planId || 'plan'}_action_${seed}`, 'triggered_action_chain');

  if (!existingIds.has(baseId)) {
    return baseId;
  }

  let suffix = 2;
  while (existingIds.has(`${baseId}_${suffix}`)) {
    suffix += 1;
  }
  return `${baseId}_${suffix}`;
}

function normalizeDisplayText(value, fallback = '') {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  return normalized || fallback;
}

function normalizeId(value, fallback = '') {
  const normalized = String(value || '')
    .trim()
    .replace(/[^a-z0-9_-]+/gi, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || fallback;
}

function normalizeInteger(value, fallback, min, max) {
  const number = Number.parseInt(value, 10);
  const normalized = Number.isFinite(number) ? number : fallback;
  return Math.min(Math.max(normalized, min), max);
}
