// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const intent = global.DAD.IntentIntervention = global.DAD.IntentIntervention || {};
  const {
    PROMPT_ID,
    DISMISS_DURATION_MS,
    CONTINUE_REASON_MAX_LENGTH,
    GRAYSCALE_ACTION,
    REDUCE_NOISE_ACTION
  } = intent.constants || {};
  const { clearVisualInterventions = () => {} } = intent.effects || {};
  const { restoreIntentMedia = () => {} } = intent.media || {};
  const CONTINUE_ACTIONS = new Set(['prompt', GRAYSCALE_ACTION, REDUCE_NOISE_ACTION]);

  function normalizeContinueReason(value) {
    return String(value || '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, CONTINUE_REASON_MAX_LENGTH || 160);
  }

  function getDismissKey(decision) {
    return `dadIntentDismissed:${decision?.interventionId || 'unknown'}`;
  }

  function dismissDecision(decision) {
    try {
      global.sessionStorage.setItem(getDismissKey(decision), String(Date.now() + DISMISS_DURATION_MS));
    } catch {
      // Session storage is optional. Continue should still remove the current prompt.
    }
  }

  function removePrompt() {
    const prompt = global.document.getElementById(PROMPT_ID);
    if (prompt) {
      prompt.remove();
    }
  }

  function canContinueDecision(decision = {}) {
    if (!decision?.shouldIntervene || decision?.chainBlock?.active || decision?.hardBlocked) {
      return false;
    }

    return CONTINUE_ACTIONS.has(String(decision.action || '').trim());
  }

  function createFeedbackPayload(decision, reason) {
    const currentVisit = decision?.currentVisit || {};
    const recoveryVisit = decision?.recoveryVisit || {};
    return {
      action: 'continue',
      reason,
      interventionId: decision?.interventionId,
      sessionId: decision?.sessionId,
      visitId: currentVisit.id,
      riskState: decision?.riskState,
      coherenceScore: decision?.coherenceScore,
      policyAction: decision?.action,
      currentVisit: {
        id: currentVisit.id,
        url: currentVisit.url,
        hostname: currentVisit.hostname
      },
      recoveryVisit: {
        url: recoveryVisit.url,
        hostname: recoveryVisit.hostname
      },
      recoveryUrl: decision?.recoveryUrl
    };
  }

  function requestInterventionState(callback) {
    if (!global.DAD.safeRuntimeSendMessage) {
      callback(null);
      return;
    }

    global.DAD.safeRuntimeSendMessage({ action: 'getIntentInterventionState' }, callback);
  }

  function recordContinueFeedback(decision, reason, callback) {
    if (!global.DAD.safeRuntimeSendMessage) {
      callback();
      return;
    }

    let completed = false;
    const finish = () => {
      if (completed) return;
      completed = true;
      callback();
    };
    const fallbackTimer = global.setTimeout(finish, 150);

    global.DAD.safeRuntimeSendMessage({
      action: 'recordIntentFeedback',
      feedback: createFeedbackPayload(decision, reason)
    }, () => {
      global.clearTimeout(fallbackTimer);
      finish();
    });
  }

  function continueIntentIntervention(message, sendResponse) {
    const reason = normalizeContinueReason(message?.reason);
    if (!reason) {
      sendResponse({ status: 'reasonRequired' });
      return;
    }

    requestInterventionState(payload => {
      const decision = payload?.intervention;
      if (!canContinueDecision(decision)) {
        sendResponse({ status: 'unavailable' });
        return;
      }

      if (message?.interventionId && decision?.interventionId !== message.interventionId) {
        sendResponse({ status: 'stale' });
        return;
      }

      recordContinueFeedback(decision, reason, () => {
        dismissDecision(decision);
        clearVisualInterventions();
        restoreIntentMedia('intentContinued');
        removePrompt();
        sendResponse({ status: 'continued' });
      });
    });
  }

  if (global.chrome?.runtime?.onMessage?.addListener) {
    global.chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message?.action !== 'continueIntentIntervention') {
        return false;
      }

      continueIntentIntervention(message, sendResponse);
      return true;
    });
  }

  intent.continueMessage = {
    canContinueDecision,
    normalizeContinueReason
  };
})(window);
