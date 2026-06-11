// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const intent = global.DAD.IntentIntervention = global.DAD.IntentIntervention || {};
  const {
    PROMPT_ID,
    GRAYSCALE_ACTION
  } = intent.constants;
  const {
    getIntentMessage
  } = intent.messages;
  const {
    installStyle
  } = intent.style;
  const {
    applyPromptTheme,
    installThemeSync
  } = intent.theme;

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

  function renderPrompt(decision, handlers) {
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

    handlers.removePrompt();

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
            handlers.dismissAndRemove(decision, undefined, 'acknowledge');
          }
        }),
        createButton(getIntentMessage('intentPromptIsolateButton'), {
          primary: true,
          onClick: () => handlers.isolateCurrentPage(decision)
        })
      );
    } else if (decision.action === 'block') {
      if (decision.chainBlock?.active) {
        actions.append(
          createButton(getIntentMessage('intentPromptCloseOtherDriftTabsButton'), {
            onClick: () => handlers.closeDriftDescendantTabs(decision)
          })
        );
      }
      actions.append(
        createButton(decision.chainBlock?.active
          ? getIntentMessage('intentPromptIsolateAsNewChainButton')
          : getIntentMessage('intentPromptTrustShiftButton'), {
          disabled: decision.chainBlock?.cooldownActive,
          title: decision.chainBlock?.cooldownActive ? getIntentMessage('intentPromptCooldownUnavailableTitle') : '',
          onClick: () => handlers.isolateCurrentPage(decision)
        }),
        createButton(getIntentMessage('intentPromptReturnButton'), {
          primary: true,
          onClick: () => handlers.returnToRecovery(decision)
        })
      );
    } else {
      actions.append(
        createButton(getIntentMessage('intentPromptContinueButton'), {
          onClick: () => handlers.dismissAndRemove(decision, undefined, 'continue')
        }),
        createButton(getIntentMessage('intentPromptIsolateButton'), {
          onClick: () => handlers.isolateCurrentPage(decision)
        }),
        createButton(getIntentMessage('intentPromptReturnButton'), {
          primary: true,
          onClick: () => handlers.returnToRecovery(decision)
        })
      );
    }

    prompt.append(body, actions);
    global.document.documentElement.appendChild(prompt);
    handlers.scheduleCooldownRefresh(decision);
  }

  intent.prompt = {
    renderPrompt
  };
})(window);
