// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const intent = global.DAD.IntentIntervention;
  const {
    PROMPT_ID,
    CHECK_INTERVAL_MS,
    FIRST_CHECK_DELAY_MS,
    DISMISS_DURATION_MS
  } = intent.constants;
  const {
    getIntentMessage
  } = intent.messages;
  const {
    renderPrompt
  } = intent.prompt;
  const { applyVisualIntervention = () => {}, clearVisualInterventions = () => {} } = intent.effects || {};
  const { restoreIntentMedia = () => {}, suspendIntentMedia = () => {} } = intent.media || {};

  let promptInterval = null;
  let cooldownRefreshTimer = null;

  function isTopFrame() {
    return global.top === global.self;
  }

  function getDismissKey(decision) {
    return `dadIntentDismissed:${decision?.interventionId || 'unknown'}`;
  }

  function getDismissedUntil(decision) {
    try {
      return Number(global.sessionStorage.getItem(getDismissKey(decision)) || 0);
    } catch {
      return 0;
    }
  }

  function isDismissed(decision) {
    return getDismissedUntil(decision) > Date.now();
  }

  function clearCooldownRefreshTimer() {
    if (cooldownRefreshTimer) {
      global.clearTimeout(cooldownRefreshTimer);
      cooldownRefreshTimer = null;
    }
  }

  function scheduleCooldownRefresh(decision) {
    clearCooldownRefreshTimer();
    const remainingMs = Number(decision?.chainBlock?.cooldownRemainingMs || 0);
    if (!decision?.chainBlock?.cooldownActive || remainingMs <= 0) {
      return;
    }

    cooldownRefreshTimer = global.setTimeout(() => {
      cooldownRefreshTimer = null;
      refreshPrompt();
    }, Math.min(Math.max(remainingMs + 100, 250), CHECK_INTERVAL_MS));
  }

  function dismissDecision(decision, durationMs = DISMISS_DURATION_MS) {
    try {
      global.sessionStorage.setItem(getDismissKey(decision), String(Date.now() + durationMs));
    } catch {
      // Session storage is optional. Failing to persist dismissal should not break browsing.
    }
  }

  function removePrompt() {
    clearCooldownRefreshTimer();
    const prompt = global.document.getElementById(PROMPT_ID);
    if (prompt) {
      prompt.remove();
    }
  }

  function createInterventionFeedbackPayload(decision, action, details = {}) {
    const currentVisit = decision?.currentVisit || {};
    const recoveryVisit = decision?.recoveryVisit || {};
    return {
      action,
      reason: details.reason,
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

  function recordInterventionFeedback(decision, action, callback = null, details = {}) {
    if (!global.DAD.safeRuntimeSendMessage || !action) {
      if (callback) callback();
      return;
    }

    let completed = false;
    const finish = () => {
      if (completed) {
        return;
      }
      completed = true;
      if (callback) callback();
    };
    const fallbackTimer = callback ? global.setTimeout(finish, 150) : null;

    global.DAD.safeRuntimeSendMessage({
      action: 'recordIntentFeedback',
      feedback: createInterventionFeedbackPayload(decision, action, details)
    }, () => {
      if (fallbackTimer) {
        global.clearTimeout(fallbackTimer);
      }
      finish();
    });
  }

  function dismissAndRemove(decision, durationMs, feedbackAction, feedbackDetails = {}) {
    recordInterventionFeedback(decision, feedbackAction, null, feedbackDetails);
    dismissDecision(decision, durationMs);
    clearVisualInterventions();
    restoreIntentMedia('intentDismissed');
    removePrompt();
  }

  function requestInterventionState(callback) {
    if (!global.DAD.safeRuntimeSendMessage) {
      callback(null);
      return;
    }

    global.DAD.safeRuntimeSendMessage({ action: 'getIntentInterventionState' }, callback);
  }

  function isolateCurrentPage(decision, feedbackAction = 'isolate') {
    const signals = global.DAD.PageSignals?.collectPageSignals
      ? global.DAD.PageSignals.collectPageSignals(global.document)
      : {
          url: String(global.location.href || ''),
          hostname: String(global.location.hostname || ''),
          title: String(global.document.title || '')
        };

    global.DAD.safeRuntimeSendMessage({
      action: 'isolateIntentCurrentPage',
      signals,
      feedback: createInterventionFeedbackPayload(decision, feedbackAction)
    }, response => {
      if (response?.status === 'isolated') {
        dismissAndRemove(decision, 2000);
      }
    });
  }

  function returnToRecovery(decision) {
    if (!decision?.recoveryUrl) {
      return;
    }

    recordInterventionFeedback(decision, 'return', () => {
      dismissDecision(decision, 2000);
      clearVisualInterventions();
      restoreIntentMedia('intentReturn');
      global.location.assign(decision.recoveryUrl);
    });
  }

  function returnChainToRecovery(decision) {
    if (!decision?.recoveryUrl) {
      return;
    }

    if (!global.DAD.safeRuntimeSendMessage) {
      returnToRecovery(decision);
      return;
    }

    global.DAD.safeRuntimeSendMessage({
      action: 'returnIntentDriftDescendantTabs',
      includeCurrent: false,
      recoveryUrl: decision.recoveryUrl
    }, response => {
      if (response?.status !== 'returned') {
        updatePromptSummary(getIntentMessage('intentPromptReturnChainFailed'));
        return;
      }

      returnToRecovery(decision);
    });
  }

  function showIntentGraph(decision) {
    if (!global.DAD.safeRuntimeSendMessage) {
      updatePromptSummary(getIntentMessage('intentPromptShowGraphFailed'));
      return;
    }

    global.DAD.safeRuntimeSendMessage({
      action: 'openIntentDiagnostics',
      interventionId: decision?.interventionId || null
    }, response => {
      if (response?.status !== 'opened') {
        updatePromptSummary(getIntentMessage('intentPromptShowGraphFailed'));
      }
    });
  }

  function updatePromptSummary(message) {
    const prompt = global.document.getElementById(PROMPT_ID);
    const summary = prompt?.querySelector('[data-dad-intent-summary]');
    if (summary && message) {
      summary.textContent = message;
    }
  }

  const driftTabActions = {
    close: ['closeIntentDriftDescendantTabs', 'closed', 'closedCount', 'intentPromptCloseTabsFailed', 'intentPromptClosedOtherTabs'],
    move: ['moveIntentDriftDescendantTabsToWindow', 'moved', 'movedCount', 'intentPromptMoveTabsFailed', 'intentPromptMovedOtherTabs'],
    return: ['returnIntentDriftDescendantTabs', 'returned', 'returnedCount', 'intentPromptReturnTabsFailed', 'intentPromptReturnedOtherTabs'],
    suspend: ['suspendIntentDriftDescendantTabs', 'suspended', 'suspendedCount', 'intentPromptSuspendTabsFailed', 'intentPromptSuspendedOtherTabs']
  };

  function runDriftDescendantTabAction(decision, actionKey) {
    const config = driftTabActions[actionKey];
    if (!global.DAD.safeRuntimeSendMessage || !config || (actionKey === 'return' && !decision?.recoveryUrl)) return;
    const [runtimeAction, status, countKey, failedMessage, successMessage] = config;
    const message = {
      action: runtimeAction,
      includeCurrent: false
    };
    if (actionKey === 'return') message.recoveryUrl = decision.recoveryUrl;

    global.DAD.safeRuntimeSendMessage(message, response => {
      if (response?.status !== status) {
        updatePromptSummary(getIntentMessage(failedMessage));
        return;
      }

      const count = Number(response[countKey] || 0);
      const tabNoun = count === 1
        ? getIntentMessage('intentPromptTabSingular')
        : getIntentMessage('intentPromptTabPlural');
      updatePromptSummary(count > 0
        ? getIntentMessage(successMessage, [String(count), tabNoun])
        : getIntentMessage('intentPromptNoOtherDriftTabs'));
    });
  }

  function refreshPrompt() {
    if (!isTopFrame() || global.pageBlocked || global.document.visibilityState === 'hidden') {
      clearVisualInterventions();
      restoreIntentMedia('intentUnavailable');
      removePrompt();
      return;
    }

    requestInterventionState(payload => {
      const decision = payload?.intervention;
      if (!decision?.shouldIntervene || isDismissed(decision)) {
        clearVisualInterventions();
        restoreIntentMedia('intentCleared');
        removePrompt();
        return;
      }

      applyVisualIntervention(decision);
      if (decision.action === 'block' || decision.hardBlocked || decision.chainBlock?.active) {
        suspendIntentMedia();
      } else {
        restoreIntentMedia('intentNotBlocking');
      }
      renderPrompt(decision, {
        closeDriftDescendantTabs: decision => runDriftDescendantTabAction(decision, 'close'),
        dismissAndRemove,
        isolateCurrentPage,
        moveDriftDescendantTabs: decision => runDriftDescendantTabAction(decision, 'move'),
        removePrompt,
        returnDriftDescendantTabs: decision => runDriftDescendantTabAction(decision, 'return'),
        returnChainToRecovery,
        returnToRecovery,
        scheduleCooldownRefresh,
        showIntentGraph,
        suspendDriftDescendantTabs: decision => runDriftDescendantTabAction(decision, 'suspend')
      });
    });
  }

  function ensurePromptInterval() {
    if (!promptInterval) {
      promptInterval = global.setInterval(refreshPrompt, CHECK_INTERVAL_MS);
    }
  }

  function initializeIntentInterventionPrompt() {
    if (!isTopFrame()) {
      return;
    }

    global.setTimeout(refreshPrompt, FIRST_CHECK_DELAY_MS);
    ensurePromptInterval();
    global.addEventListener('pageshow', () => {
      ensurePromptInterval();
      refreshPrompt();
    });
    global.document.addEventListener('visibilitychange', refreshPrompt);
  }

  global.addEventListener('pagehide', () => {
    clearCooldownRefreshTimer();
    clearVisualInterventions();
    restoreIntentMedia('intentPageHide');
    if (promptInterval) {
      global.clearInterval(promptInterval);
      promptInterval = null;
    }
  });

  initializeIntentInterventionPrompt();
})(window);
