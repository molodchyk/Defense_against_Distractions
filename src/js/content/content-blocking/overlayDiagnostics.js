// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const contentBlocking = global.DAD.ContentBlocking = global.DAD.ContentBlocking || {};
  const getLocalizedMessage = contentBlocking.overlayMessages?.getLocalizedMessage || ((key, fallback) => fallback);

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
      finalScore: diagnostics.finalScore || global.pageScore || latestTrigger.scoreAfter
    };
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
    const triggerStrong = document.createElement('strong');
    triggerStrong.dataset.dadBlockTriggerLabel = 'true';
    triggerStrong.style.color = 'var(--dad-block-text)';
    triggerStrong.textContent = getLocalizedMessage('blockedTriggeredByLabel', 'Triggered by:');
    trigger.appendChild(triggerStrong);
    trigger.appendChild(document.createTextNode(' '));
    trigger.appendChild(document.createTextNode(diagnostics.keyword || 'unknown'));

    const score = document.createElement('div');
    const scoreStrong = document.createElement('strong');
    scoreStrong.dataset.dadBlockScoreLabel = 'true';
    scoreStrong.style.color = 'var(--dad-block-text)';
    scoreStrong.textContent = getLocalizedMessage('blockedScoreLabel', 'Score:');
    score.appendChild(scoreStrong);
    score.appendChild(document.createTextNode(' '));
    score.appendChild(document.createTextNode(`${Math.round(diagnostics.finalScore)} (${diagnostics.operation}${diagnostics.value})`));

    const context = document.createElement('div');
    context.dataset.dadBlockContext = 'true';
    context.style.cssText = 'margin-top:8px;color:var(--dad-block-diagnostics);overflow-wrap:anywhere';
    if (diagnostics.contextText) {
      const contextStrong = document.createElement('strong');
      contextStrong.dataset.dadBlockContextLabel = 'true';
      contextStrong.style.color = 'var(--dad-block-text)';
      contextStrong.textContent = getLocalizedMessage('blockedContextLabel', 'Context:');
      context.appendChild(contextStrong);
      context.appendChild(document.createTextNode(` ${diagnostics.contextText}`));
    }

    wrapper.appendChild(trigger);
    wrapper.appendChild(score);
    wrapper.appendChild(context);
    return wrapper;
  }

  contentBlocking.overlayDiagnostics = {
    createElement,
    getBlockedPageDiagnostics
  };
})(window);
