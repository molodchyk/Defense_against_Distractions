// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  TRIGGERED_ACTION_STEP_TYPES,
  TRIGGERED_ACTION_TRIGGER_TYPES,
  triggeredActionStepStrictnessRank
} from './constants.js';
import {
  normalizeTriggeredActionChain,
  normalizeTriggeredActionChains
} from './model.js';

export function areTriggeredActionChainsAtLeastAsStrict(originalChains = [], nextChains = []) {
  const original = normalizeTriggeredActionChains(originalChains);
  const next = normalizeTriggeredActionChains(nextChains);
  const nextById = new Map(next.map(chain => [chain.id, chain]));
  const originalEnabledIds = new Set(original.filter(chain => chain.enabled).map(chain => chain.id));

  for (const originalChain of original) {
    if (!originalChain.enabled) {
      continue;
    }

    const nextChain = nextById.get(originalChain.id);
    if (!nextChain || !isTriggeredActionChainAtLeastAsStrict(originalChain, nextChain)) {
      return false;
    }
  }

  return next.every(nextChain => (
    originalEnabledIds.has(nextChain.id)
      || !nextChain.enabled
      || isNewChainAtLeastAsStrict(nextChain)
  ));
}

export function isTriggeredActionChainAtLeastAsStrict(originalChain = {}, nextChain = {}) {
  const original = normalizeTriggeredActionChain(originalChain);
  const next = normalizeTriggeredActionChain(nextChain);

  if (original.enabled && !next.enabled) {
    return false;
  }

  if (!isTriggerAtLeastAsStrict(original.trigger, next.trigger)) {
    return false;
  }

  if (!isFallbackAtLeastAsStrict(original.fallback, next.fallback)) {
    return false;
  }

  if (!isRunPolicyAtLeastAsStrict(original.runPolicy, next.runPolicy)) {
    return false;
  }

  const nextScenarios = new Map(next.scenarios.map(scenario => [scenario.id, scenario]));
  for (const originalScenario of original.scenarios) {
    const nextScenario = nextScenarios.get(originalScenario.id);
    if (!nextScenario || !isScenarioAtLeastAsStrict(originalScenario, nextScenario)) {
      return false;
    }
  }

  return true;
}

function isTriggerAtLeastAsStrict(originalTrigger, nextTrigger) {
  if (nextTrigger.minimumScore > originalTrigger.minimumScore) {
    return false;
  }

  if (nextTrigger.type === TRIGGERED_ACTION_TRIGGER_TYPES.BLOCK_SCORE) {
    return true;
  }

  if (originalTrigger.type === TRIGGERED_ACTION_TRIGGER_TYPES.BLOCK_SCORE) {
    return false;
  }

  if (nextTrigger.type !== originalTrigger.type) {
    return false;
  }

  const originalIds = originalTrigger.type === TRIGGERED_ACTION_TRIGGER_TYPES.STRUCTURAL
    ? originalTrigger.structuralIds
    : originalTrigger.keywordIds;
  const nextIds = nextTrigger.type === TRIGGERED_ACTION_TRIGGER_TYPES.STRUCTURAL
    ? nextTrigger.structuralIds
    : nextTrigger.keywordIds;

  return isTriggerIdSetAtLeastAsStrict(originalIds, nextIds);
}

function isTriggerIdSetAtLeastAsStrict(originalIds, nextIds) {
  if (originalIds.length === 0) {
    return nextIds.length === 0;
  }

  if (nextIds.length === 0) {
    return true;
  }

  const nextSet = new Set(nextIds);
  return originalIds.every(id => nextSet.has(id));
}

function isScenarioAtLeastAsStrict(originalScenario, nextScenario) {
  if (!haveSameGuardSet(originalScenario.guards, nextScenario.guards)) {
    return false;
  }

  if (originalScenario.triggerLocation !== nextScenario.triggerLocation) {
    return false;
  }

  if (!isFallbackAtLeastAsStrict(originalScenario.fallback, nextScenario.fallback)) {
    return false;
  }

  if (nextScenario.steps.length < originalScenario.steps.length) {
    return false;
  }

  return originalScenario.steps.every((originalStep, index) => (
    isStepAtLeastAsStrict(originalStep, nextScenario.steps[index])
  ));
}

function isStepAtLeastAsStrict(originalStep, nextStep) {
  if (!nextStep) {
    return false;
  }

  if (nextStep.targetRuleId !== originalStep.targetRuleId) {
    return false;
  }

  return getStepStrictnessRank(nextStep.type) >= getStepStrictnessRank(originalStep.type);
}

function isFallbackAtLeastAsStrict(originalFallback, nextFallback) {
  return getStepStrictnessRank(nextFallback.type) >= getStepStrictnessRank(originalFallback.type);
}

function isRunPolicyAtLeastAsStrict(originalPolicy, nextPolicy) {
  if (originalPolicy.oncePerPageVisit !== nextPolicy.oncePerPageVisit) {
    return false;
  }

  if (originalPolicy.stopOnFirstFailure !== nextPolicy.stopOnFirstFailure) {
    return false;
  }

  return nextPolicy.cooldownSeconds <= originalPolicy.cooldownSeconds;
}

function isNewChainAtLeastAsStrict(chain) {
  return chain.scenarios.length === 0
    || chain.scenarios.every(scenario => (
      scenario.steps.some(step => step.type === TRIGGERED_ACTION_STEP_TYPES.BLOCK_PAGE)
    ));
}

function haveSameGuardSet(originalGuards, nextGuards) {
  const originalKeys = originalGuards.map(getGuardKey).sort();
  const nextKeys = nextGuards.map(getGuardKey).sort();
  return JSON.stringify(originalKeys) === JSON.stringify(nextKeys);
}

function getGuardKey(guard) {
  return `${guard.invert ? 'not:' : ''}${guard.type}:${guard.id}`;
}

function getStepStrictnessRank(type) {
  return triggeredActionStepStrictnessRank[type] ?? 0;
}
