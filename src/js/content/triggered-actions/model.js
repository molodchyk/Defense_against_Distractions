// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const triggeredActions = global.DAD.TriggeredActions = global.DAD.TriggeredActions || {};
  const {
    NORMALIZED_SCORE_THRESHOLD,
    RESULTS,
    STEP_TYPES,
    TRIGGER_TYPES,
    supportedStepTypes,
    supportedTriggerTypes
  } = triggeredActions.constants;
  const {
    createStableId,
    getComparableKeys,
    getCurrentHost,
    getTimestampBucket,
    hostMatches,
    normalizeId,
    normalizeHost,
    normalizeInteger,
    normalizeStringList,
    normalizeText
  } = triggeredActions.utils;

  function normalizeChains(chains) {
    return Array.isArray(chains) ? chains.map(normalizeChain) : [];
  }

  function normalizeChain(chain = {}) {
    return {
      id: normalizeId(chain.id, createStableId(chain.name, 'triggered-action-chain')),
      name: normalizeText(chain.name, 'Triggered action chain'),
      enabled: chain.enabled !== false,
      hostPattern: normalizeHost(chain.hostPattern || chain.host || ''),
      trigger: normalizeTrigger(chain.trigger),
      scenarios: Array.isArray(chain.scenarios)
        ? chain.scenarios.map(normalizeScenario).filter(Boolean)
        : [],
      fallback: normalizeFallback(chain.fallback),
      runPolicy: {
        oncePerPageVisit: chain.runPolicy?.oncePerPageVisit !== false,
        cooldownSeconds: normalizeInteger(chain.runPolicy?.cooldownSeconds, 30, 0, 3600),
        stopOnFirstFailure: chain.runPolicy?.stopOnFirstFailure !== false
      }
    };
  }

  function triggerMatchesDiagnostics(chain, diagnostics) {
    if (!chain.enabled) {
      return false;
    }

    if (chain.hostPattern && !hostMatches(chain.hostPattern, getCurrentHost())) {
      return false;
    }

    if (getNormalizedScore(diagnostics?.finalScore) < chain.trigger.minimumScore) {
      return false;
    }

    const triggers = Array.isArray(diagnostics?.triggers) ? diagnostics.triggers : [];
    if (chain.trigger.type === TRIGGER_TYPES.BLOCK_SCORE) {
      return true;
    }

    const source = chain.trigger.type === TRIGGER_TYPES.STRUCTURAL ? 'structural' : 'keyword';
    const matchingSourceTriggers = triggers.filter(trigger => trigger?.source === source);
    if (matchingSourceTriggers.length === 0) {
      return false;
    }

    const ids = chain.trigger.type === TRIGGER_TYPES.STRUCTURAL
      ? chain.trigger.structuralIds
      : chain.trigger.keywordIds;

    if (ids.length === 0) {
      return true;
    }

    const triggerKeys = new Set(matchingSourceTriggers.flatMap(trigger => getComparableKeys(trigger?.keyword || '')));
    return ids.some(id => getComparableKeys(id).some(key => triggerKeys.has(key)));
  }

  function buildScenarioContext(elementRules, diagnostics) {
    const guardSet = new Set(['block-threshold-reached']);
    const triggerLocation = getLatestTriggerLocation(diagnostics);

    if (triggerLocation) {
      guardSet.add(triggerLocation);
      guardSet.add(`trigger:${triggerLocation}`);
      guardSet.add(triggerLocation === 'editableField' ? 'trigger-in-editable' : 'trigger-outside-editable');
    }

    if (hasEditableField()) {
      guardSet.add('editable-field-present');
    }

    elementRules.forEach(rule => {
      const id = normalizeText(rule?.id, '');
      if (!id || !global.DAD.ElementBlocking?.actions?.hasElementRuleTarget?.(rule)) {
        return;
      }

      guardSet.add(id);
      guardSet.add(`${id}-present`);
      guardSet.add(`target:${id}`);
      guardSet.add(`target:${id}-present`);
      guardSet.add(`target-present:${id}`);
    });

    return {
      host: getCurrentHost(),
      triggerLocation,
      guards: guardSet
    };
  }

  function selectScenario(chain, context = {}) {
    if (!chain.enabled) {
      return createSelection(RESULTS.DISABLED, chain, null, context);
    }

    if (chain.hostPattern && !hostMatches(chain.hostPattern, context.host)) {
      return createSelection(RESULTS.HOST_MISMATCH, chain, null, context);
    }

    const matches = chain.scenarios.filter(scenario => scenarioMatchesContext(scenario, context));
    if (matches.length === 0) {
      return createSelection(RESULTS.NOT_MATCHED, chain, null, context);
    }

    if (matches.length > 1) {
      return {
        ...createSelection(RESULTS.AMBIGUOUS, chain, null, context),
        matchingScenarioIds: matches.map(scenario => scenario.id)
      };
    }

    return createSelection(RESULTS.MATCHED, chain, matches[0], context);
  }

  function scenarioMatchesContext(scenario, context) {
    if (scenario.triggerLocation && context.triggerLocation && scenario.triggerLocation !== context.triggerLocation) {
      return false;
    }

    return scenario.guards.every(guard => isGuardSatisfied(guard, context.guards));
  }

  function isGuardSatisfied(guard, guardSet) {
    const key = getPresenceGuardKey(guard);
    const present = guardSet.has(key) || guardSet.has(guard.id);
    return guard.invert ? !present : present;
  }

  function createSelection(status, chain, scenario, context) {
    return {
      status,
      chainId: chain.id,
      scenarioId: scenario?.id || '',
      steps: scenario?.steps || [],
      fallback: scenario?.fallback || chain.fallback,
      host: context.host || ''
    };
  }

  function normalizeTrigger(trigger = {}) {
    const type = supportedTriggerTypes.has(trigger.type) ? trigger.type : TRIGGER_TYPES.KEYWORD_BLOCK;
    return {
      type,
      keywordIds: normalizeStringList(trigger.keywordIds),
      structuralIds: normalizeStringList(trigger.structuralIds),
      minimumScore: normalizeInteger(trigger.minimumScore, 100, 1, 100)
    };
  }

  function normalizeScenario(scenario = {}, index = 0) {
    const steps = Array.isArray(scenario.steps)
      ? scenario.steps.map(normalizeStep).filter(Boolean)
      : [];
    return {
      id: normalizeId(scenario.id, `scenario_${index + 1}`),
      guards: normalizeGuards(scenario.guards),
      triggerLocation: normalizeText(scenario.triggerLocation, ''),
      steps,
      fallback: normalizeFallback(scenario.fallback)
    };
  }

  function normalizeStep(step = {}, index = 0) {
    const type = supportedStepTypes.has(step.type) ? step.type : '';
    if (!type) {
      return null;
    }

    return {
      type,
      targetRuleId: normalizeText(step.targetRuleId, ''),
      waitMs: normalizeInteger(step.waitMs, 0, 0, 3000),
      reason: normalizeText(step.reason, ''),
      index
    };
  }

  function normalizeFallback(fallback = {}) {
    const type = supportedStepTypes.has(fallback.type) ? fallback.type : STEP_TYPES.BLOCK_PAGE;
    return {
      type,
      reason: normalizeText(fallback.reason, '')
    };
  }

  function normalizeGuards(guards = []) {
    if (!Array.isArray(guards)) {
      return [];
    }

    const seen = new Set();
    const normalizedGuards = [];
    guards.forEach(guard => {
      const normalized = normalizeGuard(guard);
      if (!normalized) {
        return;
      }

      const key = getGuardKey(normalized);
      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      normalizedGuards.push(normalized);
    });

    return normalizedGuards;
  }

  function normalizeGuard(guard) {
    if (typeof guard === 'string') {
      const id = normalizeText(guard, '');
      return id ? { type: 'named', id, invert: false } : null;
    }

    if (!guard || typeof guard !== 'object') {
      return null;
    }

    const id = normalizeText(guard.id || guard.name || '', '');
    if (!id) {
      return null;
    }

    return {
      type: normalizeText(guard.type || 'named', 'named'),
      id,
      invert: Boolean(guard.invert)
    };
  }

  function getGuardKey(guard) {
    return `${guard.invert ? 'not:' : ''}${guard.type}:${guard.id}`;
  }

  function getPresenceGuardKey(guard) {
    return `${guard.type}:${guard.id}`;
  }

  function getLatestTriggerLocation(diagnostics) {
    const triggers = Array.isArray(diagnostics?.triggers) ? diagnostics.triggers : [];
    const latest = [...triggers].reverse().find(trigger => trigger?.triggerLocation);
    return normalizeText(latest?.triggerLocation, '');
  }

  function hasEditableField() {
    if (!global.document?.querySelector) {
      return false;
    }

    return Boolean(global.document.querySelector([
      'textarea',
      'input:not([type="hidden"])',
      '[contenteditable=""]',
      '[contenteditable="true"]',
      '[contenteditable="plaintext-only"]'
    ].join(', ')));
  }

  function getNormalizedScore(score) {
    const rawScore = Number(score);
    if (!Number.isFinite(rawScore)) {
      return 0;
    }

    const threshold = Number(global.DAD.ContentBlocking?.constants?.BLOCK_SCORE_THRESHOLD || 1000);
    const normalizedThreshold = Number.isFinite(threshold) && threshold > 0 ? threshold : 1000;
    return Math.round(Math.min(Math.max(rawScore / normalizedThreshold, 0), 1) * NORMALIZED_SCORE_THRESHOLD);
  }

  triggeredActions.model = {
    buildScenarioContext,
    getCurrentHost,
    getTimestampBucket,
    normalizeChains,
    normalizeInteger,
    selectScenario,
    triggerMatchesDiagnostics
  };
})(window);
