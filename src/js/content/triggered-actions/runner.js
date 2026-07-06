// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const triggeredActions = global.DAD.TriggeredActions = global.DAD.TriggeredActions || {};
  const {
    MAX_OUTCOME_EVENTS,
    RESULTS,
    STEP_TO_ELEMENT_ACTION,
    STEP_TYPES
  } = triggeredActions.constants;
  const {
    buildScenarioContext,
    getCurrentHost,
    getTimestampBucket,
    normalizeChains,
    normalizeInteger,
    selectScenario,
    triggerMatchesDiagnostics
  } = triggeredActions.model;

  function runTriggeredActionChainsForBlock({
    chains = global.DAD.activeTriggeredActionChains || [],
    elementRules = global.DAD.activeElementBlockRules || [],
    diagnostics = global.blockDiagnostics || null
  } = {}) {
    const normalizedChains = normalizeChains(chains).filter(chain => triggerMatchesDiagnostics(chain, diagnostics));
    if (normalizedChains.length === 0) {
      return false;
    }

    const activeRules = Array.isArray(elementRules) ? elementRules : [];
    for (const chain of normalizedChains) {
      const outcome = runTriggeredActionChain(chain, activeRules, diagnostics);
      if (outcome.considered) {
        return outcome.handled;
      }
    }

    return false;
  }

  function previewTriggeredActionChain({
    chain = null,
    elementRules = global.DAD.activeElementBlockRules || [],
    diagnostics = global.blockDiagnostics || null
  } = {}) {
    const normalizedChain = chain ? normalizeChains([chain])[0] : null;
    const activeRules = Array.isArray(elementRules) ? elementRules : [];
    if (!normalizedChain) {
      return null;
    }

    const context = buildScenarioContext(activeRules, diagnostics);
    const selection = selectScenario(normalizedChain, context);
    const hasTriggerDiagnostics = Boolean(diagnostics && Array.isArray(diagnostics.triggers));
    const triggerEligible = hasTriggerDiagnostics
      ? triggerMatchesDiagnostics(normalizedChain, diagnostics)
      : null;

    return {
      status: selection.status,
      chainId: normalizedChain.id,
      scenarioId: selection.scenarioId,
      matchingScenarioIds: Array.isArray(selection.matchingScenarioIds) ? selection.matchingScenarioIds : [],
      host: selection.host || context.host || '',
      triggerEligible,
      triggerDiagnosticsAvailable: hasTriggerDiagnostics,
      triggerLocation: context.triggerLocation || '',
      fallbackType: selection.fallback?.type || normalizedChain.fallback.type,
      targetAvailability: getTargetAvailability(normalizedChain, activeRules),
      steps: selection.steps.map(step => getPreviewStep(step, activeRules)),
      wouldRun: selection.status === RESULTS.MATCHED && selection.steps.length > 0,
      wouldMutate: selection.status === RESULTS.MATCHED && selection.steps.some(step => Boolean(STEP_TO_ELEMENT_ACTION[step.type])),
      wouldBlock: wouldPreviewBlock(selection, normalizedChain)
    };
  }

  function runTriggeredActionChain(chain, elementRules, diagnostics) {
    const context = buildScenarioContext(elementRules, diagnostics);
    const selection = selectScenario(chain, context);

    if ([RESULTS.DISABLED, RESULTS.HOST_MISMATCH].includes(selection.status)) {
      return { considered: false, handled: false, blocked: false };
    }

    if (selection.status !== RESULTS.MATCHED || selection.steps.length === 0) {
      return runFallback(chain, selection, null, -1, diagnostics);
    }

    for (const [stepIndex, step] of selection.steps.entries()) {
      const stepOutcome = runTriggeredActionStep(step, elementRules, diagnostics);
      if (!stepOutcome.ok) {
        recordOutcome(chain, selection, step, stepIndex, RESULTS.FAILED, diagnostics);
        return runFallback(chain, selection, step, stepIndex, diagnostics);
      }

      recordOutcome(chain, selection, step, stepIndex, stepOutcome.blocked ? RESULTS.BLOCKED : RESULTS.RAN, diagnostics);
      if (stepOutcome.stop || stepOutcome.blocked) {
        return { considered: true, handled: true, blocked: Boolean(stepOutcome.blocked) };
      }
    }

    return { considered: true, handled: true, blocked: false };
  }

  function getPreviewStep(step, elementRules) {
    return {
      type: step.type,
      targetRuleId: step.targetRuleId || '',
      targetAvailable: step.targetRuleId ? hasTargetRule(step.targetRuleId, elementRules) : null
    };
  }

  function getTargetAvailability(chain, elementRules) {
    const targetIds = new Set();
    chain.scenarios.forEach(scenario => {
      scenario.guards.forEach(guard => {
        if (guard.type === 'target') {
          targetIds.add(guard.id);
        }
      });
      scenario.steps.forEach(step => {
        if (step.targetRuleId) {
          targetIds.add(step.targetRuleId);
        }
      });
    });

    return Array.from(targetIds).map(targetRuleId => ({
      targetRuleId,
      available: hasTargetRule(targetRuleId, elementRules)
    }));
  }

  function wouldPreviewBlock(selection, chain) {
    if ([RESULTS.DISABLED, RESULTS.HOST_MISMATCH].includes(selection.status)) {
      return false;
    }

    if (selection.status === RESULTS.MATCHED) {
      return selection.steps.some(step => step.type === STEP_TYPES.BLOCK_PAGE);
    }

    return (selection.fallback || chain.fallback).type === STEP_TYPES.BLOCK_PAGE;
  }

  function runTriggeredActionStep(step, elementRules, diagnostics) {
    if (step.type === STEP_TYPES.STOP) {
      return { ok: true, stop: true, blocked: false };
    }

    if (step.type === STEP_TYPES.BLOCK_PAGE) {
      blockPageWithDiagnostics(diagnostics);
      return { ok: true, stop: true, blocked: true };
    }

    if (step.type === STEP_TYPES.WAIT_FOR_ELEMENT) {
      return { ok: hasTargetRule(step.targetRuleId, elementRules), stop: false, blocked: false };
    }

    const action = STEP_TO_ELEMENT_ACTION[step.type];
    const rule = action ? getTargetRule(step.targetRuleId, elementRules) : null;
    if (!rule) {
      return { ok: false, stop: false, blocked: false };
    }

    const didApply = global.DAD.ElementBlocking?.actions?.applyElementRule?.({ ...rule, action });
    return { ok: Boolean(didApply), stop: false, blocked: false };
  }

  function runFallback(chain, selection, failedStep, failedStepIndex, diagnostics) {
    const fallback = selection.fallback || chain.fallback;
    if (fallback.type === STEP_TYPES.STOP) {
      recordOutcome(chain, selection, failedStep, failedStepIndex, RESULTS.FAILED, diagnostics);
      return { considered: true, handled: true, blocked: false };
    }

    if (fallback.type === STEP_TYPES.BLOCK_PAGE) {
      recordOutcome(chain, selection, failedStep, failedStepIndex, RESULTS.FALLBACK_BLOCKED, diagnostics);
      blockPageWithDiagnostics(diagnostics);
      return { considered: true, handled: true, blocked: true };
    }

    return { considered: true, handled: false, blocked: false };
  }

  function blockPageWithDiagnostics(diagnostics) {
    if (!global.DAD.ContentBlocking?.blocker?.blockPage) {
      return;
    }

    if (diagnostics && !diagnostics.blockedAt) {
      diagnostics.blockedAt = new Date().toISOString();
    }

    global.DAD.ContentBlocking.blocker.blockPage({ diagnostics });
  }

  function getTargetRule(targetRuleId, elementRules) {
    const normalizedTargetRuleId = String(targetRuleId || '').trim();
    if (!normalizedTargetRuleId) {
      return null;
    }

    return elementRules.find(rule => String(rule?.id || '').trim() === normalizedTargetRuleId) || null;
  }

  function hasTargetRule(targetRuleId, elementRules) {
    const rule = getTargetRule(targetRuleId, elementRules);
    return Boolean(rule && global.DAD.ElementBlocking?.actions?.hasElementRuleTarget?.(rule));
  }

  function recordOutcome(chain, selection, step, stepIndex, result, diagnostics) {
    if (!diagnostics) {
      return;
    }

    const event = {
      chainId: chain.id,
      scenarioId: selection?.scenarioId || '',
      triggerType: chain.trigger.type,
      stepType: step?.type || '',
      stepIndex: normalizeInteger(stepIndex, -1, -1, 100),
      result,
      fallbackType: (selection?.fallback || chain.fallback).type,
      host: getCurrentHost(),
      timestampBucket: getTimestampBucket(new Date())
    };

    const events = Array.isArray(diagnostics.triggeredActionOutcomes)
      ? diagnostics.triggeredActionOutcomes
      : [];
    diagnostics.triggeredActionOutcomes = [...events, event].slice(-MAX_OUTCOME_EVENTS);
    global.blockDiagnostics = diagnostics;
  }

  triggeredActions.runner = {
    previewTriggeredActionChain,
    runTriggeredActionChainsForBlock,
    runTriggeredActionChain
  };
})(window);
