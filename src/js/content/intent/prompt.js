// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const intent = global.DAD.IntentIntervention = global.DAD.IntentIntervention || {};
  const {
    PROMPT_ID,
    GRAYSCALE_ACTION,
    REDUCE_NOISE_ACTION,
    CONTINUE_REASON_MAX_LENGTH
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

  function normalizeContinueReason(value) {
    return String(value || '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, CONTINUE_REASON_MAX_LENGTH);
  }

  function createContinueReasonControl() {
    const wrapper = global.document.createElement('div');
    wrapper.dataset.dadIntentContinueReason = 'true';

    const label = global.document.createElement('label');
    const inputId = `${PROMPT_ID}-continue-reason`;
    label.setAttribute('for', inputId);
    label.textContent = getIntentMessage('intentPromptContinueReasonLabel');

    const input = global.document.createElement('textarea');
    input.id = inputId;
    input.rows = 2;
    input.maxLength = CONTINUE_REASON_MAX_LENGTH;
    input.placeholder = getIntentMessage('intentPromptContinueReasonPlaceholder');

    const count = global.document.createElement('span');
    count.dataset.dadIntentContinueReasonCount = 'true';

    wrapper.append(label, input, count);

    return {
      wrapper,
      focus: () => input.focus(),
      getReason: () => normalizeContinueReason(input.value),
      bindButton: button => {
        const update = () => {
          const reason = normalizeContinueReason(input.value);
          button.disabled = !reason;
          button.title = reason ? '' : getIntentMessage('intentPromptContinueReasonRequired');
          count.textContent = `${String(reason.length)} / ${String(CONTINUE_REASON_MAX_LENGTH)}`;
        };
        input.addEventListener('input', update);
        update();
      }
    };
  }

  function appendStrongLabel(container, label) {
    const strong = global.document.createElement('strong');
    strong.textContent = label;
    container.appendChild(strong);
    container.appendChild(global.document.createTextNode(' '));
  }

  function createMetaLine(labelKey, text) {
    const line = global.document.createElement('p');
    line.dataset.dadIntentMeta = 'true';
    appendStrongLabel(line, getIntentMessage(labelKey));
    line.appendChild(global.document.createTextNode(text));
    return line;
  }

  function formatDriftTabScope(decision) {
    const count = Math.max(0, Number(decision?.chainBlock?.driftDescendantTabCount || 0));
    if (count <= 0) {
      return getIntentMessage('intentPromptDriftTabsNone');
    }

    const tabNoun = count === 1
      ? getIntentMessage('intentPromptTabSingular')
      : getIntentMessage('intentPromptTabPlural');
    return getIntentMessage('intentPromptDriftTabsScope', [String(count), tabNoun]);
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
    global.DAD.UiLanguage?.applyDirection?.(prompt);
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
    } else if (decision.action === REDUCE_NOISE_ACTION) {
      summary.textContent = getIntentMessage('intentPromptReduceNoiseSummary');
    } else {
      summary.textContent = getIntentMessage('intentPromptDetectedSummary');
    }

    const meta = createMetaLine(
      'intentPromptCoherenceLabel',
      `${decision.coherenceScore ?? '--'} / 100 · ${decision.riskState}`
    );
    const origin = createMetaLine('intentPromptOriginLabel', getLabel(decision.origin));
    const recovery = createMetaLine(
      'intentPromptRecoveryLabel',
      getLabel(decision.recoveryVisit || decision.origin)
    );
    const drift = decision.driftVisit
      ? createMetaLine('intentPromptFirstDriftLabel', getLabel(decision.driftVisit))
      : null;
    const current = createMetaLine('intentPromptCurrentLabel', getLabel(decision.currentVisit));
    const driftTabs = decision.chainBlock?.active
      ? createMetaLine('intentPromptDriftTabsLabel', formatDriftTabScope(decision))
      : null;

    const cooldown = global.document.createElement('p');
    cooldown.dataset.dadIntentMeta = 'true';
    appendStrongLabel(cooldown, getIntentMessage('intentPromptCooldownLabel'));
    if (decision.chainBlock?.cooldownActive) {
      const messageKey = decision.chainBlock?.autoCloseCurrentTab
        ? 'intentPromptCooldownAutoCloseActive'
        : 'intentPromptCooldownActive';
      cooldown.appendChild(global.document.createTextNode(getIntentMessage(messageKey, [
        formatCooldown(decision.chainBlock.cooldownRemainingMs)
      ])));
    } else {
      const messageKey = decision.chainBlock?.autoCloseCurrentTab
        ? 'intentPromptCooldownAutoCloseComplete'
        : 'intentPromptCooldownComplete';
      cooldown.appendChild(global.document.createTextNode(getIntentMessage(messageKey)));
    }

    const reasons = global.document.createElement('ul');
    reasons.dataset.dadIntentReasons = 'true';
    (Array.isArray(decision.reasonLines) ? decision.reasonLines : []).slice(0, 3).forEach(reason => {
      const item = global.document.createElement('li');
      item.textContent = reason;
      reasons.appendChild(item);
    });

    body.append(title, summary, meta, origin, recovery);
    if (drift) {
      body.append(drift);
    }
    body.append(current);
    if (driftTabs) {
      body.append(driftTabs);
    }
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
        }),
        createButton(getIntentMessage('intentPromptShowGraphButton'), {
          onClick: () => handlers.showIntentGraph(decision)
        })
      );
    } else if (decision.action === 'block') {
      if (decision.chainBlock?.active) {
        actions.append(
          createButton(getIntentMessage('intentPromptReturnChainButton'), {
            primary: true,
            onClick: () => handlers.returnChainToRecovery(decision)
          }),
          createButton(getIntentMessage('intentPromptMoveOtherDriftTabsButton'), {
            onClick: () => handlers.moveDriftDescendantTabs(decision)
          }),
          createButton(getIntentMessage('intentPromptSuspendOtherDriftTabsButton'), {
            onClick: () => handlers.suspendDriftDescendantTabs(decision)
          }),
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
          onClick: () => handlers.isolateCurrentPage(
            decision,
            decision.chainBlock?.active ? 'isolate' : 'markCoherent'
          )
        }),
        ...(decision.chainBlock?.active ? [] : [createButton(getIntentMessage('intentPromptReturnButton'), {
          primary: true,
          onClick: () => handlers.returnToRecovery(decision)
        })]),
        createButton(getIntentMessage('intentPromptShowGraphButton'), {
          onClick: () => handlers.showIntentGraph(decision)
        })
      );
    } else {
      const continueReason = createContinueReasonControl();
      body.append(continueReason.wrapper);
      const continueButton = createButton(getIntentMessage('intentPromptContinueButton'), {
        disabled: true,
        title: getIntentMessage('intentPromptContinueReasonRequired'),
        onClick: () => {
          const reason = continueReason.getReason();
          if (!reason) {
            continueReason.focus();
            return;
          }
          handlers.dismissAndRemove(decision, undefined, 'continue', { reason });
        }
      });
      continueReason.bindButton(continueButton);
      actions.append(
        continueButton,
        createButton(getIntentMessage('intentPromptIsolateButton'), {
          onClick: () => handlers.isolateCurrentPage(decision)
        }),
        createButton(getIntentMessage('intentPromptReturnButton'), {
          primary: true,
          onClick: () => handlers.returnToRecovery(decision)
        }),
        createButton(getIntentMessage('intentPromptShowGraphButton'), {
          onClick: () => handlers.showIntentGraph(decision)
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

  global.DAD.UiLanguage?.onChange?.(() => {
    global.DAD.UiLanguage?.applyDirection?.(global.document.getElementById(PROMPT_ID));
  });
})(window);
