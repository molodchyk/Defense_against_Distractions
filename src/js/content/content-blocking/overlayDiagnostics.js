// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const contentBlocking = global.DAD.ContentBlocking = global.DAD.ContentBlocking || {};
  const getLocalizedMessage = contentBlocking.overlayMessages?.getLocalizedMessage || ((key, fallback) => fallback);
  const MAX_VISIBLE_ACTION_OUTCOMES = 3;

  const TRIGGERED_ACTION_STEP_LABEL_KEYS = {
    blockPage: 'popupTriggeredActionStepBlockPage',
    clearField: 'popupTriggeredActionStepClearField',
    clickOnce: 'popupTriggeredActionStepClickOnce',
    disableControls: 'popupTriggeredActionStepDisableControls',
    hideElement: 'popupTriggeredActionStepHideElement',
    hideImages: 'popupTriggeredActionStepHideImages',
    pauseMedia: 'popupTriggeredActionStepPauseMedia',
    stop: 'popupTriggeredActionStepStop',
    waitForElement: 'popupTriggeredActionStepWaitForElement'
  };

  const TRIGGERED_ACTION_RESULT_LABEL_KEYS = {
    ambiguous: 'popupTriggeredActionResultAmbiguous',
    blocked: 'popupTriggeredActionResultBlocked',
    disabled: 'popupTriggeredActionResultDisabled',
    failed: 'popupTriggeredActionResultFailed',
    fallbackBlocked: 'popupTriggeredActionResultFallbackBlocked',
    hostMismatch: 'popupTriggeredActionResultHostMismatch',
    matched: 'popupTriggeredActionResultMatched',
    notMatched: 'popupTriggeredActionResultNotMatched',
    ran: 'popupTriggeredActionResultRan'
  };

  function getBlockedPageDiagnostics() {
    const diagnostics = global.blockDiagnostics;
    const triggers = Array.isArray(diagnostics?.triggers) ? diagnostics.triggers : [];
    const latestTrigger = triggers[triggers.length - 1];

    if (!latestTrigger) {
      return null;
    }

    return {
      keyword: latestTrigger.keyword,
      operation: latestTrigger.operation,
      value: latestTrigger.value,
      contextText: latestTrigger.contextText,
      finalScore: diagnostics.finalScore || global.pageScore || latestTrigger.scoreAfter,
      triggeredActionOutcomes: getRecentTriggeredActionOutcomes(diagnostics)
    };
  }

  function getRecentTriggeredActionOutcomes(diagnostics = {}) {
    return Array.isArray(diagnostics.triggeredActionOutcomes)
      ? diagnostics.triggeredActionOutcomes.slice(-MAX_VISIBLE_ACTION_OUTCOMES)
      : [];
  }

  function getOutcomeStepType(outcome = {}) {
    const result = String(outcome.result || '').trim();
    return String(outcome.stepType || (result === 'fallbackBlocked' ? outcome.fallbackType : '') || '').trim();
  }

  function formatTriggeredActionOutcome(outcome = {}) {
    const result = String(outcome.result || '').trim();
    const stepType = getOutcomeStepType(outcome);
    const stepLabelKey = TRIGGERED_ACTION_STEP_LABEL_KEYS[stepType] || null;
    const resultLabelKey = TRIGGERED_ACTION_RESULT_LABEL_KEYS[result] || null;
    const stepLabel = stepLabelKey
      ? getLocalizedMessage(stepLabelKey, stepType)
      : (stepType || getLocalizedMessage('popupTriggeredActionStepFallback', 'fallback'));
    const resultLabel = resultLabelKey
      ? getLocalizedMessage(resultLabelKey, result)
      : (result || getLocalizedMessage('popupUnknownLabel', 'unknown'));

    return getLocalizedMessage('popupTriggeredActionOutcomeEntry', '$1: $2', [stepLabel, resultLabel]);
  }

  function formatTriggeredActionOutcomeTrail(outcomes = []) {
    const visibleOutcomes = Array.isArray(outcomes) ? outcomes.slice(-MAX_VISIBLE_ACTION_OUTCOMES) : [];
    return visibleOutcomes
      .reverse()
      .map(formatTriggeredActionOutcome)
      .join('; ');
  }

  function createStrongLabel(datasetKey, messageKey, fallback) {
    const strong = document.createElement('strong');
    strong.dataset[datasetKey] = 'true';
    strong.style.color = 'var(--dad-block-text)';
    strong.textContent = getLocalizedMessage(messageKey, fallback);
    return strong;
  }

  function createElement(diagnostics) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = [
      'margin-top:18px',
      'padding-top:14px',
      'border-top:1px solid var(--dad-block-border)',
      'color:var(--dad-block-diagnostics)',
      'font:15px/1.45 Arial,sans-serif',
      'text-align:left'
    ].join(';');

    if (!diagnostics) {
      wrapper.hidden = true;
      return wrapper;
    }

    const trigger = document.createElement('div');
    const triggerStrong = createStrongLabel('dadBlockTriggerLabel', 'blockedTriggeredByLabel', 'Triggered by:');
    trigger.appendChild(triggerStrong);
    trigger.appendChild(document.createTextNode(' '));
    trigger.appendChild(document.createTextNode(diagnostics.keyword || 'unknown'));

    const score = document.createElement('div');
    const scoreStrong = createStrongLabel('dadBlockScoreLabel', 'blockedScoreLabel', 'Score:');
    score.appendChild(scoreStrong);
    score.appendChild(document.createTextNode(' '));
    score.appendChild(document.createTextNode(`${Math.round(diagnostics.finalScore)} (${diagnostics.operation}${diagnostics.value})`));

    const context = document.createElement('div');
    context.dataset.dadBlockContext = 'true';
    context.style.cssText = 'margin-top:8px;color:var(--dad-block-diagnostics);overflow-wrap:anywhere';
    if (diagnostics.contextText) {
      const contextStrong = createStrongLabel('dadBlockContextLabel', 'blockedContextLabel', 'Context:');
      context.appendChild(contextStrong);
      context.appendChild(document.createTextNode(` ${diagnostics.contextText}`));
    }

    const actionTrail = formatTriggeredActionOutcomeTrail(diagnostics.triggeredActionOutcomes);
    const action = document.createElement('div');
    action.dataset.dadBlockActionOutcome = 'true';
    action.style.cssText = 'margin-top:8px;color:var(--dad-block-diagnostics);overflow-wrap:anywhere';
    action.hidden = !actionTrail;
    if (actionTrail) {
      const actionStrong = createStrongLabel('dadBlockActionLabel', 'blockedActionLabel', 'Action:');
      const actionText = document.createElement('span');
      actionText.dataset.dadBlockActionOutcomes = 'true';
      actionText.textContent = ` ${actionTrail}`;
      action.appendChild(actionStrong);
      action.appendChild(actionText);
    }

    wrapper.appendChild(trigger);
    wrapper.appendChild(score);
    wrapper.appendChild(context);
    wrapper.appendChild(action);
    return wrapper;
  }

  contentBlocking.overlayDiagnostics = {
    createElement,
    formatTriggeredActionOutcome,
    formatTriggeredActionOutcomeTrail,
    getBlockedPageDiagnostics
  };
})(window);
