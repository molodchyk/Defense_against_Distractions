// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  PLANS_STORAGE_KEY,
  isPlanActive,
  normalizePlans
} from '../../shared/plans.js';

const MAX_PREVIEW_CHAINS = 6;

const STEP_LABEL_KEYS = {
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

const RESULT_LABEL_KEYS = {
  ambiguous: 'popupTriggeredActionResultAmbiguous',
  blocked: 'popupTriggeredActionResultBlocked',
  disabled: 'popupTriggeredActionResultDisabled',
  failed: 'popupTriggeredActionResultFailed',
  fallbackBlocked: 'popupTriggeredActionResultFallbackBlocked',
  hostMismatch: 'popupTriggeredActionResultHostMismatch',
  matched: 'popupTriggeredActionResultMatched',
  notMatched: 'popupTriggeredActionResultNotMatched',
  ran: 'popupTriggeredActionResultRan',
  unavailable: 'popupUnavailableLabel'
};

export function collectActiveTriggeredActionChains(plans = [], limit = MAX_PREVIEW_CHAINS) {
  const collected = [];
  normalizePlans(plans).forEach(plan => {
    if (!isPlanActive(plan)) {
      return;
    }

    plan.triggeredActionChains.forEach(chain => {
      if (chain?.enabled === false || collected.length >= limit) {
        return;
      }

      collected.push({
        planId: plan.id,
        planName: plan.name,
        chain
      });
    });
  });
  return collected;
}

export function formatTriggeredActionPreviewTitle(item = {}) {
  const chainName = item.chain?.name || item.chain?.id || '';
  const planName = item.planName || '';
  return planName && chainName ? `${chainName} · ${planName}` : (chainName || planName);
}

export function formatTriggeredActionPreview(item = {}, getMessage) {
  const preview = item.preview || {};
  const status = formatResultLabel(preview.status || 'unavailable', getMessage);
  const parts = [
    status,
    formatTriggerEligibility(preview, getMessage),
    formatTargetAvailability(preview, getMessage),
    formatStepSequence(preview, getMessage),
    formatPageOutcome(preview, getMessage)
  ];
  return parts.filter(Boolean).join(' · ');
}

export function getCompactTriggeredActionPreviewItem(item = {}) {
  const preview = item.preview || {};
  const targets = Array.isArray(preview.targetAvailability) ? preview.targetAvailability : [];
  const steps = Array.isArray(preview.steps) ? preview.steps : [];
  return {
    planId: item.planId || null,
    chainId: item.chain?.id || preview.chainId || null,
    status: preview.status || 'unavailable',
    triggerEligible: preview.triggerEligible ?? null,
    triggerDiagnosticsAvailable: preview.triggerDiagnosticsAvailable ?? null,
    targetAvailableCount: targets.filter(target => target.available === true).length,
    targetCount: targets.length,
    stepTypes: steps.map(step => step.type || '').filter(Boolean),
    wouldRun: Boolean(preview.wouldRun),
    wouldBlock: Boolean(preview.wouldBlock)
  };
}

export function createTriggeredActionPreviewPanel({
  getMessage,
  getActiveTab,
  getSyncStorage,
  isExtensionPage,
  sendTabMessage,
  onActiveTabChange
}) {
  let latestItems = [];
  ensurePanel();

  function setUnavailable(message = getMessage('popupUnavailableLabel')) {
    latestItems = [];
    renderEmpty(message, 'idle', message);
  }

  function renderEmpty(statusText, statusState, emptyText = getMessage('planActionNoChainsLabel')) {
    if (!ensurePanel()) {
      return;
    }
    syncStaticLabels(getMessage);
    const status = document.getElementById('triggeredActionPreviewStatus');
    const list = document.getElementById('triggeredActionPreviewList');
    status.textContent = statusText;
    status.dataset.state = statusState;
    list.replaceChildren(createPreviewListItem(emptyText, ''));
  }

  function render(items = latestItems) {
    if (!ensurePanel()) {
      return;
    }
    syncStaticLabels(getMessage);
    latestItems = Array.isArray(items) ? items : [];
    const list = document.getElementById('triggeredActionPreviewList');
    const status = document.getElementById('triggeredActionPreviewStatus');

    if (latestItems.length === 0) {
      renderEmpty(getMessage('popupNoDataLabel'), 'idle');
      return;
    }

    status.textContent = latestItems.every(item => item.preview?.status === 'unavailable')
      ? getMessage('popupNoScriptLabel')
      : getMessage('popupCurrentTabStatus');
    status.dataset.state = latestItems.some(item => item.preview?.wouldBlock) ? 'active' : 'ready';
    list.replaceChildren(...latestItems.map(item => createPreviewListItem(
      formatTriggeredActionPreviewTitle(item),
      formatTriggeredActionPreview(item, getMessage)
    )));
  }

  async function refresh() {
    const activeTab = await getActiveTab();
    onActiveTabChange?.(activeTab || null);
    if (!activeTab?.id || isExtensionPage(activeTab.url)) {
      setUnavailable(getMessage('popupNoPageLabel'));
      return latestItems;
    }

    const items = await getSyncStorage({ [PLANS_STORAGE_KEY]: [] });
    const chains = collectActiveTriggeredActionChains(items?.[PLANS_STORAGE_KEY]);
    if (chains.length === 0) {
      latestItems = [];
      render();
      return latestItems;
    }

    latestItems = await Promise.all(chains.map(async item => ({
      ...item,
      preview: await previewChain(activeTab.id, item.chain)
    })));
    render(latestItems);
    return latestItems;
  }

  async function previewChain(tabId, chain) {
    try {
      return await sendTabMessage(tabId, {
        action: 'previewTriggeredActionChain',
        chain
      }) || { status: 'unavailable' };
    } catch (error) {
      return { status: 'unavailable' };
    }
  }

  function getSnapshot() {
    return latestItems;
  }

  function getCompactDiagnostics() {
    return latestItems.map(getCompactTriggeredActionPreviewItem);
  }

  return {
    getCompactDiagnostics,
    getSnapshot,
    refresh,
    render,
    setUnavailable
  };
}

function ensurePanel() {
  if (document.getElementById('triggeredActionPreviewPanel')) {
    return true;
  }

  const anchor = document.querySelector('.block-diagnostics-panel');
  if (!anchor) {
    return false;
  }

  const panel = document.createElement('details');
  panel.id = 'triggeredActionPreviewPanel';
  panel.className = 'popup-card diagnostic-panel triggered-action-preview-panel';

  const summary = document.createElement('summary');
  summary.className = 'block-diagnostics-panel-header';
  const title = document.createElement('h2');
  title.id = 'triggeredActionPreviewTitle';
  const status = document.createElement('span');
  status.id = 'triggeredActionPreviewStatus';
  status.className = 'block-diagnostics-badge';
  summary.append(title, status);

  const list = document.createElement('ul');
  list.id = 'triggeredActionPreviewList';
  list.className = 'triggered-action-preview-list';

  const actions = document.createElement('div');
  actions.className = 'diagnostic-actions';
  const refreshButton = document.createElement('button');
  refreshButton.id = 'refreshTriggeredActionPreviewButton';
  refreshButton.className = 'secondary-button';
  refreshButton.type = 'button';
  actions.append(refreshButton);

  panel.append(summary, list, actions);
  anchor.insertAdjacentElement('afterend', panel);
  return true;
}

function syncStaticLabels(getMessage) {
  const title = document.getElementById('triggeredActionPreviewTitle');
  const status = document.getElementById('triggeredActionPreviewStatus');
  const list = document.getElementById('triggeredActionPreviewList');
  const refreshButton = document.getElementById('refreshTriggeredActionPreviewButton');
  if (title) title.textContent = getMessage('elementPickerPreviewLabel');
  if (status && !status.textContent) status.textContent = getMessage('popupLoadingLabel');
  if (list) list.setAttribute('aria-label', getMessage('elementPickerPreviewLabel'));
  if (refreshButton) refreshButton.textContent = getMessage('popupRefreshButton');
}

function createPreviewListItem(title, detail) {
  const item = document.createElement('li');
  const strong = document.createElement('strong');
  const small = document.createElement('small');
  strong.textContent = title || '--';
  small.textContent = detail || '--';
  item.append(strong, small);
  return item;
}

function formatResultLabel(result, getMessage) {
  const key = RESULT_LABEL_KEYS[result] || null;
  return key ? getMessage(key) : String(result || getMessage('popupUnknownLabel'));
}

function formatTriggerEligibility(preview = {}, getMessage) {
  if (preview.triggerDiagnosticsAvailable !== true) {
    return '';
  }

  const triggerStatus = preview.triggerEligible
    ? getMessage('popupTriggeredActionResultMatched')
    : getMessage('popupTriggeredActionResultNotMatched');
  return `${getMessage('popupTriggerLabel')}: ${triggerStatus}`;
}

function formatTargetAvailability(preview = {}, getMessage) {
  const targets = Array.isArray(preview.targetAvailability) ? preview.targetAvailability : [];
  if (targets.length === 0) {
    return '';
  }

  const available = targets.filter(target => target.available === true).length;
  return `${getMessage('planActionTargetLabel')}: ${available}/${targets.length}`;
}

function formatStepSequence(preview = {}, getMessage) {
  const steps = Array.isArray(preview.steps) ? preview.steps : [];
  if (steps.length === 0) {
    return '';
  }

  return `${getMessage('planActionStepLabel')}: ${steps.map(step => formatStep(step, getMessage)).join(', ')}`;
}

function formatStep(step = {}, getMessage) {
  const key = STEP_LABEL_KEYS[step.type] || null;
  const label = key ? getMessage(key) : String(step.type || getMessage('popupUnknownLabel'));
  return step.targetAvailable === false
    ? `${label} (${getMessage('popupUnavailableLabel')})`
    : label;
}

function formatPageOutcome(preview = {}, getMessage) {
  if (!preview.wouldRun && !preview.wouldBlock) {
    return '';
  }

  return `${getMessage('popupPageLabel')}: ${preview.wouldBlock ? getMessage('popupBlockedState') : getMessage('popupClearState')}`;
}
