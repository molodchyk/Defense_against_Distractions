// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};

  const PROMPT_ID = 'dad-intent-intervention';
  const STYLE_ID = 'dad-intent-intervention-style';
  const GRAYSCALE_ACTION = 'grayscale';
  const GRAYSCALE_ATTRIBUTE = 'data-dad-intent-grayscale';
  const THEME_STORAGE_KEY = 'uiThemeMode';
  const DEFAULT_THEME_MODE = 'system';
  const THEME_QUERY = '(prefers-color-scheme: dark)';
  const CHECK_INTERVAL_MS = 4500;
  const FIRST_CHECK_DELAY_MS = 1600;
  const DISMISS_DURATION_MS = 30 * 60 * 1000;
  let currentThemeMode = DEFAULT_THEME_MODE;
  let promptInterval = null;
  let cooldownRefreshTimer = null;
  let themeListenersInstalled = false;

  const INTENT_MESSAGES = {
    intentPromptDriftChainBlockedTitle: 'Drift chain blocked',
    intentPromptDriftBlockedTitle: 'Intent drift blocked',
    intentPromptDriftDetectedTitle: 'Intent drift detected',
    intentPromptChainQuarantineSummary: 'This tab is part of a drift chain that this plan is quarantining. Return to the last coherent page or isolate this page as a new chain.',
    intentPromptBlockSummary: 'This plan is preventing this drift chain from continuing.',
    intentPromptGrayscaleSummary: 'This page has been desaturated because this browsing chain appears to have detached from where it started.',
    intentPromptDetectedSummary: 'This browsing chain appears to have detached from where it started.',
    intentPromptCoherenceLabel: 'Coherence:',
    intentPromptOriginLabel: 'Origin:',
    intentPromptCurrentLabel: 'Current:',
    intentPromptCooldownLabel: 'Cooldown:',
    intentPromptCooldownActive: '$1 before isolation is available. Return is available now.',
    intentPromptCooldownComplete: 'complete. Isolation is available if this page is intentional.',
    intentPromptCloseTabsFailed: 'Could not close other drift tabs. Return and isolate are still available.',
    intentPromptClosedOtherTabs: 'Closed $1 other drift $2 in this chain. Return or isolate this tab next.',
    intentPromptNoOtherDriftTabs: 'No other drift descendant tabs are currently open in this chain. Return or isolate this tab next.',
    intentPromptTabSingular: 'tab',
    intentPromptTabPlural: 'tabs',
    intentPromptGotItButton: 'Got it',
    intentPromptIsolateButton: 'Isolate',
    intentPromptCloseOtherDriftTabsButton: 'Close other drift tabs',
    intentPromptIsolateAsNewChainButton: 'Isolate as new chain',
    intentPromptTrustShiftButton: 'Trust this shift',
    intentPromptCooldownUnavailableTitle: 'Available after the chain cooldown.',
    intentPromptReturnButton: 'Return',
    intentPromptContinueButton: 'Continue'
  };

  function getIntentMessage(key, fallbackOrSubstitutions, maybeSubstitutions) {
    const hasExplicitFallback = maybeSubstitutions !== undefined;
    const fallback = hasExplicitFallback ? fallbackOrSubstitutions : (INTENT_MESSAGES[key] || key);
    const substitutions = hasExplicitFallback ? maybeSubstitutions : fallbackOrSubstitutions;
    return global.DAD.UiLanguage?.getMessage?.(key, INTENT_MESSAGES[key] || fallback, substitutions)
      || INTENT_MESSAGES[key]
      || fallback;
  }

  function isTopFrame() {
    return global.top === global.self;
  }

  function normalizeThemeMode(mode) {
    return ['system', 'dark', 'light'].includes(mode) ? mode : DEFAULT_THEME_MODE;
  }

  function resolveThemeMode(mode) {
    const normalizedMode = normalizeThemeMode(mode);
    if (normalizedMode === 'system') {
      return global.matchMedia(THEME_QUERY).matches ? 'dark' : 'light';
    }

    return normalizedMode;
  }

  function applyPromptTheme(prompt) {
    prompt.dataset.theme = resolveThemeMode(currentThemeMode);
    prompt.dataset.themeMode = normalizeThemeMode(currentThemeMode);
  }

  function applyPromptThemeToExisting() {
    const prompt = global.document.getElementById(PROMPT_ID);
    if (prompt) {
      applyPromptTheme(prompt);
    }
  }

  function installThemeSync() {
    if (themeListenersInstalled || !global.DAD.safeSyncStorageGet) {
      return;
    }

    global.DAD.safeSyncStorageGet({ [THEME_STORAGE_KEY]: DEFAULT_THEME_MODE }, result => {
      if (!result) {
        return;
      }

      currentThemeMode = normalizeThemeMode(result[THEME_STORAGE_KEY]);
      applyPromptThemeToExisting();
    });

    if (global.DAD.safeStorageOnChangedAddListener) {
      global.DAD.safeStorageOnChangedAddListener((changes, areaName) => {
        if (areaName !== 'sync' || !changes[THEME_STORAGE_KEY]) {
          return;
        }

        currentThemeMode = normalizeThemeMode(changes[THEME_STORAGE_KEY].newValue);
        applyPromptThemeToExisting();
      });
    }

    const mediaQuery = global.matchMedia(THEME_QUERY);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', () => {
        if (currentThemeMode === 'system') {
          applyPromptThemeToExisting();
        }
      });
    }

    themeListenersInstalled = true;
  }

  function installStyle() {
    if (global.document.getElementById(STYLE_ID)) {
      return;
    }

    const style = global.document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${PROMPT_ID} {
        --dad-intent-bg: #101216;
        --dad-intent-surface: #171b22;
        --dad-intent-border: #323b4b;
        --dad-intent-text: #eef2f7;
        --dad-intent-muted: #a8b0bf;
        --dad-intent-primary: #3d8bfd;
        --dad-intent-primary-hover: #2f74d3;
        --dad-intent-neutral: #596477;
        --dad-intent-warning: #d6a03d;
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 2147483646;
        box-sizing: border-box;
        width: min(420px, calc(100vw - 36px));
        overflow: hidden;
        border: 1px solid var(--dad-intent-border);
        border-radius: 8px;
        background: var(--dad-intent-surface);
        color: var(--dad-intent-text);
        box-shadow: 0 18px 44px rgba(0, 0, 0, 0.28);
        font: 14px/1.45 Arial, sans-serif;
        text-align: left;
        color-scheme: dark;
      }

      html[${GRAYSCALE_ATTRIBUTE}="true"] body > *:not(#${PROMPT_ID}) {
        filter: grayscale(1) saturate(0.25) contrast(0.95) !important;
        transition: filter 160ms ease;
      }

      #${PROMPT_ID}[data-action="block"] {
        inset: 0;
        right: auto;
        bottom: auto;
        display: grid;
        place-items: center;
        width: auto;
        padding: 20px;
        border: 0;
        border-radius: 0;
        background: rgba(8, 10, 14, 0.78);
        box-shadow: none;
      }

      #${PROMPT_ID}[data-theme="light"] {
        --dad-intent-bg: #f5f7fb;
        --dad-intent-surface: #ffffff;
        --dad-intent-border: #cfd6e2;
        --dad-intent-text: #17202e;
        --dad-intent-muted: #526173;
        --dad-intent-primary: #2463d6;
        --dad-intent-primary-hover: #1e50aa;
        --dad-intent-neutral: #68758a;
        --dad-intent-warning: #9a6b12;
        color-scheme: light;
      }

      #${PROMPT_ID} * {
        box-sizing: border-box;
      }

      #${PROMPT_ID} [data-dad-intent-body] {
        display: grid;
        gap: 10px;
        padding: 14px;
      }

      #${PROMPT_ID}[data-action="block"] [data-dad-intent-body],
      #${PROMPT_ID}[data-action="block"] [data-dad-intent-actions] {
        width: min(520px, 100%);
        background: var(--dad-intent-surface);
      }

      #${PROMPT_ID}[data-action="block"] [data-dad-intent-body] {
        border: 1px solid var(--dad-intent-border);
        border-bottom: 0;
        border-radius: 8px 8px 0 0;
        padding: 18px;
      }

      #${PROMPT_ID}[data-action="block"] [data-dad-intent-actions] {
        border: 1px solid var(--dad-intent-border);
        border-top: 1px solid var(--dad-intent-border);
        border-radius: 0 0 8px 8px;
        padding: 12px 18px 18px;
      }

      #${PROMPT_ID} [data-dad-intent-title] {
        margin: 0;
        color: var(--dad-intent-text);
        font: 700 16px/1.3 Arial, sans-serif;
      }

      #${PROMPT_ID} [data-dad-intent-summary],
      #${PROMPT_ID} [data-dad-intent-meta] {
        margin: 0;
        color: var(--dad-intent-muted);
        font: 13px/1.45 Arial, sans-serif;
      }

      #${PROMPT_ID} [data-dad-intent-meta] strong {
        color: var(--dad-intent-text);
      }

      #${PROMPT_ID} [data-dad-intent-reasons] {
        display: grid;
        gap: 4px;
        margin: 0;
        padding: 0;
        list-style: none;
      }

      #${PROMPT_ID} [data-dad-intent-reasons] li {
        color: var(--dad-intent-muted);
        font: 12px/1.35 Arial, sans-serif;
      }

      #${PROMPT_ID} [data-dad-intent-reasons] li::before {
        content: "";
        display: inline-block;
        width: 6px;
        height: 6px;
        margin-right: 7px;
        border-radius: 999px;
        background: var(--dad-intent-warning);
        vertical-align: 1px;
      }

      #${PROMPT_ID} [data-dad-intent-actions] {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 8px;
        padding: 10px 14px 14px;
        border-top: 1px solid var(--dad-intent-border);
      }

      #${PROMPT_ID} button {
        min-height: 34px;
        border: 1px solid transparent;
        border-radius: 6px;
        background: var(--dad-intent-neutral);
        color: #ffffff;
        cursor: pointer;
        font: 700 13px/1 Arial, sans-serif;
        padding: 8px 11px;
      }

      #${PROMPT_ID} button:disabled {
        cursor: not-allowed;
        opacity: 0.58;
      }

      #${PROMPT_ID} button[data-dad-intent-primary] {
        background: var(--dad-intent-primary);
      }

      #${PROMPT_ID} button[data-dad-intent-primary]:hover {
        background: var(--dad-intent-primary-hover);
      }
    `;
    global.document.documentElement.appendChild(style);
  }

  function getLabel(entity) {
    if (!entity) {
      return 'unknown';
    }

    const hostname = String(entity.hostname || '').replace(/^www\./i, '');
    const title = String(entity.title || '').trim();
    if (hostname && title) {
      return `${hostname} - ${title}`;
    }

    return title || hostname || 'unknown';
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

  function formatCooldown(value) {
    const totalSeconds = Math.max(0, Math.ceil(Number(value || 0) / 1000));
    if (totalSeconds < 60) {
      return `${totalSeconds}s`;
    }

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }

  function createButton(label, options = {}) {
    const button = global.document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    if (options.disabled) {
      button.disabled = true;
      if (options.title) {
        button.title = options.title;
      }
    }
    if (options.primary) {
      button.dataset.dadIntentPrimary = 'true';
    }
    if (typeof options.onClick === 'function') {
      button.addEventListener('click', options.onClick);
    }
    return button;
  }

  function appendStrongLabel(container, label) {
    const strong = global.document.createElement('strong');
    strong.textContent = label;
    container.appendChild(strong);
    container.appendChild(global.document.createTextNode(' '));
  }

  function renderPrompt(decision) {
    installThemeSync();
    installStyle();

    const existingPrompt = global.document.getElementById(PROMPT_ID);
    if (
      existingPrompt?.dataset.interventionId === decision.interventionId
        && !decision.chainBlock?.cooldownActive
        && existingPrompt.dataset.cooldownActive === 'false'
    ) {
      return;
    }

    removePrompt();

    const prompt = global.document.createElement('section');
    prompt.id = PROMPT_ID;
    prompt.dataset.interventionId = decision.interventionId;
    prompt.dataset.action = decision.action || 'prompt';
    prompt.dataset.chainBlock = decision.chainBlock?.active ? 'true' : 'false';
    prompt.dataset.cooldownActive = decision.chainBlock?.cooldownActive ? 'true' : 'false';
    prompt.setAttribute('role', 'dialog');
    prompt.setAttribute('aria-live', 'polite');
    if (decision.action === 'block') {
      prompt.setAttribute('aria-modal', 'true');
    }
    applyPromptTheme(prompt);

    const body = global.document.createElement('div');
    body.dataset.dadIntentBody = 'true';

    const title = global.document.createElement('h2');
    title.dataset.dadIntentTitle = 'true';
    title.textContent = decision.chainBlock?.active
      ? getIntentMessage('intentPromptDriftChainBlockedTitle')
      : decision.action === 'block'
      ? getIntentMessage('intentPromptDriftBlockedTitle')
      : getIntentMessage('intentPromptDriftDetectedTitle');

    const summary = global.document.createElement('p');
    summary.dataset.dadIntentSummary = 'true';
    if (decision.chainBlock?.active) {
      summary.textContent = getIntentMessage('intentPromptChainQuarantineSummary');
    } else if (decision.action === 'block') {
      summary.textContent = getIntentMessage('intentPromptBlockSummary');
    } else if (decision.action === GRAYSCALE_ACTION) {
      summary.textContent = getIntentMessage('intentPromptGrayscaleSummary');
    } else {
      summary.textContent = getIntentMessage('intentPromptDetectedSummary');
    }

    const meta = global.document.createElement('p');
    meta.dataset.dadIntentMeta = 'true';
    appendStrongLabel(meta, getIntentMessage('intentPromptCoherenceLabel'));
    meta.appendChild(global.document.createTextNode(`${decision.coherenceScore ?? '--'} / 100 · ${decision.riskState}`));

    const origin = global.document.createElement('p');
    origin.dataset.dadIntentMeta = 'true';
    appendStrongLabel(origin, getIntentMessage('intentPromptOriginLabel'));
    origin.appendChild(global.document.createTextNode(getLabel(decision.origin)));

    const current = global.document.createElement('p');
    current.dataset.dadIntentMeta = 'true';
    appendStrongLabel(current, getIntentMessage('intentPromptCurrentLabel'));
    current.appendChild(global.document.createTextNode(getLabel(decision.currentVisit)));

    const cooldown = global.document.createElement('p');
    cooldown.dataset.dadIntentMeta = 'true';
    appendStrongLabel(cooldown, getIntentMessage('intentPromptCooldownLabel'));
    if (decision.chainBlock?.cooldownActive) {
      cooldown.appendChild(global.document.createTextNode(getIntentMessage('intentPromptCooldownActive', [
        formatCooldown(decision.chainBlock.cooldownRemainingMs)
      ])));
    } else {
      cooldown.appendChild(global.document.createTextNode(getIntentMessage('intentPromptCooldownComplete')));
    }

    const reasons = global.document.createElement('ul');
    reasons.dataset.dadIntentReasons = 'true';
    (Array.isArray(decision.reasonLines) ? decision.reasonLines : []).slice(0, 3).forEach(reason => {
      const item = global.document.createElement('li');
      item.textContent = reason;
      reasons.appendChild(item);
    });

    body.append(title, summary, meta, origin, current);
    if (decision.chainBlock?.active && Number(decision.chainBlock.cooldownMs || 0) > 0) {
      body.append(cooldown);
    }
    body.append(reasons);

    const actions = global.document.createElement('div');
    actions.dataset.dadIntentActions = 'true';
    if (decision.action === 'warn') {
      actions.append(
        createButton(getIntentMessage('intentPromptGotItButton'), {
          onClick: () => {
            dismissAndRemove(decision, undefined, 'acknowledge');
          }
        }),
        createButton(getIntentMessage('intentPromptIsolateButton'), {
          primary: true,
          onClick: () => isolateCurrentPage(decision)
        })
      );
    } else if (decision.action === 'block') {
      if (decision.chainBlock?.active) {
        actions.append(
          createButton(getIntentMessage('intentPromptCloseOtherDriftTabsButton'), {
            onClick: () => closeDriftDescendantTabs(decision)
          })
        );
      }
      actions.append(
        createButton(decision.chainBlock?.active
          ? getIntentMessage('intentPromptIsolateAsNewChainButton')
          : getIntentMessage('intentPromptTrustShiftButton'), {
          disabled: decision.chainBlock?.cooldownActive,
          title: decision.chainBlock?.cooldownActive ? getIntentMessage('intentPromptCooldownUnavailableTitle') : '',
          onClick: () => isolateCurrentPage(decision)
        }),
        createButton(getIntentMessage('intentPromptReturnButton'), {
          primary: true,
          onClick: () => returnToRecovery(decision)
        })
      );
    } else {
      actions.append(
        createButton(getIntentMessage('intentPromptContinueButton'), {
          onClick: () => dismissAndRemove(decision, undefined, 'continue')
        }),
        createButton(getIntentMessage('intentPromptIsolateButton'), {
          onClick: () => isolateCurrentPage(decision)
        }),
        createButton(getIntentMessage('intentPromptReturnButton'), {
          primary: true,
          onClick: () => returnToRecovery(decision)
        })
      );
    }

    prompt.append(body, actions);
    global.document.documentElement.appendChild(prompt);
    scheduleCooldownRefresh(decision);
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
      renderPrompt(decision);
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
