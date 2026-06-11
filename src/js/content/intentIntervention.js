// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const intent = global.DAD.IntentIntervention;
  const {
    PROMPT_ID,
    GRAYSCALE_ACTION,
    GRAYSCALE_ATTRIBUTE,
    CHECK_INTERVAL_MS,
    FIRST_CHECK_DELAY_MS,
    DISMISS_DURATION_MS
  } = intent.constants;
  const {
    getIntentMessage
  } = intent.messages;
  const {
    installStyle
  } = intent.style;
  const {
    renderPrompt
  } = intent.prompt;

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

  function applyGrayscaleIntervention() {
    installStyle();
    global.document.documentElement.setAttribute(GRAYSCALE_ATTRIBUTE, 'true');
  }

  function clearGrayscaleIntervention() {
    global.document.documentElement.removeAttribute(GRAYSCALE_ATTRIBUTE);
  }

  function createInterventionFeedbackPayload(decision, action) {
    const currentVisit = decision?.currentVisit || {};
    const recoveryVisit = decision?.recoveryVisit || {};
    return {
      action,
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

  function recordInterventionFeedback(decision, action, callback = null) {
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
      feedback: createInterventionFeedbackPayload(decision, action)
    }, () => {
      if (fallbackTimer) {
        global.clearTimeout(fallbackTimer);
      }
      finish();
    });
  }

  function dismissAndRemove(decision, durationMs, feedbackAction) {
    recordInterventionFeedback(decision, feedbackAction);
    dismissDecision(decision, durationMs);
    clearGrayscaleIntervention();
    removePrompt();
  }

  function requestInterventionState(callback) {
    if (!global.DAD.safeRuntimeSendMessage) {
      callback(null);
      return;
    }

    global.DAD.safeRuntimeSendMessage({ action: 'getIntentInterventionState' }, callback);
  }

  function isolateCurrentPage(decision) {
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
      feedback: createInterventionFeedbackPayload(decision, 'isolate')
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
      clearGrayscaleIntervention();
      global.location.assign(decision.recoveryUrl);
    });
  }

  function updatePromptSummary(message) {
    const prompt = global.document.getElementById(PROMPT_ID);
    const summary = prompt?.querySelector('[data-dad-intent-summary]');
    if (summary && message) {
      summary.textContent = message;
    }
  }

  function closeDriftDescendantTabs(decision) {
    if (!global.DAD.safeRuntimeSendMessage) {
      return;
    }

    global.DAD.safeRuntimeSendMessage({
      action: 'closeIntentDriftDescendantTabs',
      includeCurrent: false
    }, response => {
      if (response?.status !== 'closed') {
        updatePromptSummary(getIntentMessage('intentPromptCloseTabsFailed'));
        return;
      }

      const closedCount = Number(response.closedCount || 0);
      const tabNoun = closedCount === 1
        ? getIntentMessage('intentPromptTabSingular')
        : getIntentMessage('intentPromptTabPlural');
      updatePromptSummary(closedCount > 0
        ? getIntentMessage('intentPromptClosedOtherTabs', [String(closedCount), tabNoun])
        : getIntentMessage('intentPromptNoOtherDriftTabs'));
    });
  }

  function refreshPrompt() {
    if (!isTopFrame() || global.pageBlocked || global.document.visibilityState === 'hidden') {
      clearGrayscaleIntervention();
      removePrompt();
      return;
    }

    requestInterventionState(payload => {
      const decision = payload?.intervention;
      if (!decision?.shouldIntervene || isDismissed(decision)) {
        clearGrayscaleIntervention();
        removePrompt();
        return;
      }

      if (decision.action === GRAYSCALE_ACTION) {
        applyGrayscaleIntervention();
      } else {
        clearGrayscaleIntervention();
      }
      renderPrompt(decision, {
        closeDriftDescendantTabs,
        dismissAndRemove,
        isolateCurrentPage,
        removePrompt,
        returnToRecovery,
        scheduleCooldownRefresh
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
    clearGrayscaleIntervention();
    if (promptInterval) {
      global.clearInterval(promptInterval);
      promptInterval = null;
    }
  });

  initializeIntentInterventionPrompt();
})(window);
