// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  TRIGGERED_ACTION_CHAIN_VERSION,
  TRIGGERED_ACTION_RESULTS,
  TRIGGERED_ACTION_STEP_TYPES,
  TRIGGERED_ACTION_TRIGGER_TYPES,
  allowedTriggeredActionResults,
  allowedTriggeredActionStepTypes,
  allowedTriggeredActionTriggerTypes,
  destructiveTriggeredActionStepTypes
} from './constants.js';

export function normalizeTriggeredActionChain(chain = {}) {
  const id = normalizeId(chain.id, createStableId(chain.name, 'triggered-action-chain'));
  const trigger = normalizeTriggeredActionTrigger(chain.trigger);

  return {
    id,
    version: normalizeInteger(chain.version, TRIGGERED_ACTION_CHAIN_VERSION, 1, TRIGGERED_ACTION_CHAIN_VERSION),
    name: normalizeDisplayText(chain.name, 'Triggered action chain'),
    enabled: chain.enabled !== false,
    hostPattern: normalizeHost(chain.hostPattern || chain.host || ''),
    trigger,
    scenarios: normalizeTriggeredActionScenarios(chain.scenarios),
    fallback: normalizeTriggeredActionFallback(chain.fallback),
    runPolicy: normalizeTriggeredActionRunPolicy(chain.runPolicy)
  };
}

export function normalizeTriggeredActionChains(chains = []) {
  return Array.isArray(chains)
    ? chains.map(normalizeTriggeredActionChain)
    : [];
}

export function selectTriggeredActionScenario(chain = {}, context = {}) {
  const normalizedChain = normalizeTriggeredActionChain(chain);
  const host = normalizeHost(context.host || context.url || '');

  if (!normalizedChain.enabled) {
    return createSelectionResult(TRIGGERED_ACTION_RESULTS.DISABLED, normalizedChain, null, host);
  }

  if (normalizedChain.hostPattern && !hostMatches(normalizedChain.hostPattern, host)) {
    return createSelectionResult(TRIGGERED_ACTION_RESULTS.HOST_MISMATCH, normalizedChain, null, host);
  }

  const matchingScenarios = normalizedChain.scenarios.filter(scenario => (
    scenarioMatchesContext(scenario, context)
  ));

  if (matchingScenarios.length === 0) {
    return createSelectionResult(TRIGGERED_ACTION_RESULTS.NOT_MATCHED, normalizedChain, null, host);
  }

  if (matchingScenarios.length > 1) {
    return {
      ...createSelectionResult(TRIGGERED_ACTION_RESULTS.AMBIGUOUS, normalizedChain, null, host),
      matchingScenarioIds: matchingScenarios.map(scenario => scenario.id)
    };
  }

  return createSelectionResult(TRIGGERED_ACTION_RESULTS.MATCHED, normalizedChain, matchingScenarios[0], host);
}

export function createTriggeredActionOutcomeEvent(options = {}) {
  const chain = normalizeTriggeredActionChain(options.chain || {});
  const scenario = options.scenario ? normalizeTriggeredActionScenario(options.scenario, 0) : null;
  const step = options.step ? normalizeTriggeredActionStep(options.step, options.stepIndex || 0) : null;
  const result = allowedTriggeredActionResults.has(options.result) ? options.result : TRIGGERED_ACTION_RESULTS.FAILED;
  const fallback = normalizeTriggeredActionFallback(options.fallback || scenario?.fallback || chain.fallback);

  return {
    chainId: chain.id,
    scenarioId: scenario?.id || '',
    triggerType: chain.trigger.type,
    stepType: step?.type || '',
    stepIndex: normalizeInteger(options.stepIndex, -1, -1, 100),
    result,
    fallbackType: fallback.type,
    host: normalizeHost(options.host || options.url || ''),
    timestampBucket: getTimestampBucket(options.timestamp)
  };
}

function normalizeTriggeredActionTrigger(trigger = {}) {
  const type = allowedTriggeredActionTriggerTypes.has(trigger.type)
    ? trigger.type
    : TRIGGERED_ACTION_TRIGGER_TYPES.KEYWORD_BLOCK;

  return {
    type,
    keywordIds: normalizeStringList(trigger.keywordIds),
    structuralIds: normalizeStringList(trigger.structuralIds),
    minimumScore: normalizeInteger(trigger.minimumScore, 100, 1, 100)
  };
}

function normalizeTriggeredActionScenarios(scenarios = []) {
  return Array.isArray(scenarios)
    ? scenarios.map(normalizeTriggeredActionScenario).filter(Boolean)
    : [];
}

function normalizeTriggeredActionScenario(scenario = {}, index = 0) {
  const steps = Array.isArray(scenario.steps)
    ? scenario.steps.map(normalizeTriggeredActionStep).filter(Boolean)
    : [];

  return {
    id: normalizeId(scenario.id, `scenario_${index + 1}`),
    guards: normalizeScenarioGuards(scenario.guards),
    triggerLocation: normalizeDisplayText(scenario.triggerLocation, ''),
    steps,
    fallback: normalizeTriggeredActionFallback(scenario.fallback)
  };
}

function normalizeTriggeredActionStep(step = {}, index = 0) {
  const type = allowedTriggeredActionStepTypes.has(step.type) ? step.type : '';
  if (!type) {
    return null;
  }

  return {
    type,
    targetRuleId: normalizeDisplayText(step.targetRuleId, ''),
    waitMs: normalizeInteger(step.waitMs, 0, 0, 3000),
    reason: normalizeDisplayText(step.reason, ''),
    destructive: Boolean(step.destructive || destructiveTriggeredActionStepTypes.has(type)),
    index
  };
}

function normalizeTriggeredActionFallback(fallback = {}) {
  const type = allowedTriggeredActionStepTypes.has(fallback.type)
    ? fallback.type
    : TRIGGERED_ACTION_STEP_TYPES.BLOCK_PAGE;

  return {
    type,
    reason: normalizeDisplayText(fallback.reason, '')
  };
}

function normalizeTriggeredActionRunPolicy(runPolicy = {}) {
  return {
    oncePerPageVisit: runPolicy.oncePerPageVisit !== false,
    cooldownSeconds: normalizeInteger(runPolicy.cooldownSeconds, 30, 0, 3600),
    stopOnFirstFailure: runPolicy.stopOnFirstFailure !== false
  };
}

function normalizeScenarioGuards(guards = []) {
  if (!Array.isArray(guards)) {
    return [];
  }

  const normalizedGuards = [];
  const seen = new Set();
  for (const guard of guards) {
    const normalized = normalizeScenarioGuard(guard);
    if (!normalized) {
      continue;
    }

    const key = getGuardKey(normalized);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalizedGuards.push(normalized);
  }

  return normalizedGuards;
}

function normalizeScenarioGuard(guard) {
  if (typeof guard === 'string') {
    const id = normalizeDisplayText(guard, '');
    return id ? { type: 'named', id, invert: false } : null;
  }

  if (!guard || typeof guard !== 'object') {
    return null;
  }

  const id = normalizeDisplayText(guard.id || guard.name || '', '');
  const type = normalizeDisplayText(guard.type || 'named', 'named');
  if (!id) {
    return null;
  }

  return {
    type,
    id,
    invert: Boolean(guard.invert)
  };
}

function scenarioMatchesContext(scenario, context) {
  if (scenario.triggerLocation && context.triggerLocation && scenario.triggerLocation !== context.triggerLocation) {
    return false;
  }

  return scenario.guards.every(guard => isGuardSatisfied(guard, context));
}

function isGuardSatisfied(guard, context = {}) {
  const guardSet = getContextGuardSet(context);
  const guardKey = getGuardKey(guard);
  const isPresent = guardSet.has(guardKey) || guardSet.has(guard.id);
  return guard.invert ? !isPresent : isPresent;
}

function getContextGuardSet(context = {}) {
  const guards = context.guards;
  if (guards instanceof Set) {
    return new Set([...guards].map(value => String(value || '').trim()).filter(Boolean));
  }

  if (Array.isArray(guards)) {
    return new Set(guards.map(value => String(value || '').trim()).filter(Boolean));
  }

  if (guards && typeof guards === 'object') {
    return new Set(Object.entries(guards)
      .filter(([, value]) => Boolean(value))
      .map(([key]) => key));
  }

  return new Set();
}

function createSelectionResult(status, chain, scenario, host) {
  return {
    status,
    chainId: chain.id,
    scenarioId: scenario?.id || '',
    steps: scenario?.steps || [],
    fallback: scenario?.fallback || chain.fallback,
    host
  };
}

function getGuardKey(guard) {
  return `${guard.invert ? 'not:' : ''}${guard.type}:${guard.id}`;
}

function hostMatches(pattern, host) {
  if (!pattern) {
    return true;
  }

  return host === pattern || host.endsWith(`.${pattern}`);
}

function normalizeHost(value = '') {
  const rawValue = String(value || '').trim().toLowerCase();
  if (!rawValue) {
    return '';
  }

  try {
    const parsed = rawValue.includes('://') ? new URL(rawValue) : new URL(`https://${rawValue}`);
    return stripWww(parsed.hostname);
  } catch (error) {
    return stripWww(rawValue.split(/[/?#]/)[0]);
  }
}

function stripWww(value) {
  return String(value || '').replace(/^www\./, '');
}

function normalizeInteger(value, fallback, min, max) {
  const number = Number.parseInt(value, 10);
  const normalized = Number.isFinite(number) ? number : fallback;
  return Math.min(Math.max(normalized, min), max);
}

function normalizeStringList(value = []) {
  return Array.isArray(value)
    ? [...new Set(value.map(item => normalizeDisplayText(item, '')).filter(Boolean))]
    : [];
}

function normalizeDisplayText(value, fallback = '') {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  return normalized || fallback;
}

function normalizeId(value, fallback) {
  const normalized = String(value || '')
    .trim()
    .replace(/[^a-z0-9_-]+/gi, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || fallback;
}

function createStableId(value, fallback) {
  return normalizeId(String(value || '').toLowerCase(), fallback);
}

function getTimestampBucket(timestamp = new Date()) {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (!Number.isFinite(date.getTime())) {
    return '';
  }

  date.setUTCMinutes(0, 0, 0);
  return date.toISOString();
}
