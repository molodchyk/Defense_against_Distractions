// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  getHostnameLabel
} from '../format.js';
import {
  countKnownDriftDescendantTabs,
  formatDriftDescendantTabCount,
  formatIntentInterventionStatus,
  formatIntentPolicyStatus,
  formatReturnedChainStatus,
  getIntentRecoverySummary
} from './intentRecoveryModel.js';
import {
  renderIntentRecoveryTimeline
} from './intentRecoveryTimeline.js';
import {
  clearIntentContinueReason,
  getIntentContinueControlState,
  renderIntentContinueControl
} from './intentContinueControl.js';
import {
  createIntentDriftTabActions
} from './intentDriftTabActions.js';

export function createIntentRecoveryPanel({
  getMessage,
  getActiveTab,
  isExtensionPage,
  sendRuntimeMessage,
  sendTabMessage = async () => null,
  updateTabUrl,
  pageSignalsPanel,
  setStatus,
  refreshIntentState
}) {
  let latestDebugState = null;
  let latestActiveTab = null;
  let latestContinueInterventionId = '';
  const driftTabActions = createIntentDriftTabActions({
    getActiveTab,
    getLatestActiveTab: () => latestActiveTab,
    getLatestDebugState: () => latestDebugState,
    getMessage,
    refreshIntentState,
    sendRuntimeMessage,
    setActionsDisabled,
    setStatus
  });

  function setText(elementId, value) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const text = String(value || '--');
    element.textContent = text;
    element.title = text;
  }

  function setButtonState(elementId, disabled, title = '') {
    const button = document.getElementById(elementId);
    if (!button) return;

    button.disabled = Boolean(disabled);
    if (title) {
      button.title = title;
    } else {
      button.removeAttribute('title');
    }
  }

  function setActionsDisabled(disabled) {
    [
      'returnIntentChainButton',
      'returnIntentButton',
      'continueIntentButton',
      'isolateIntentButton',
      'markIntentCoherentButton',
      'returnIntentDriftTabsButton',
      'moveIntentDriftTabsButton',
      'suspendIntentDriftTabsButton',
      'cleanIntentDriftTabsButton'
    ].forEach(elementId => setButtonState(elementId, disabled));
  }

  function canActOnTab(activeTab = latestActiveTab) {
    const activeTabUrl = String(activeTab?.url || '');
    return Boolean(activeTab?.id && activeTabUrl && !isExtensionPage(activeTabUrl));
  }

  function renderContinueControl(intervention = latestDebugState?.intervention || {}) {
    return renderIntentContinueControl({
      getMessage,
      intervention,
      canActOnActiveTab: canActOnTab()
    });
  }

  function getContinueReasonInput() {
    return document.getElementById('intentContinueReasonInput');
  }

  getContinueReasonInput()?.addEventListener('input', () => {
    renderContinueControl();
  });

  function getScore(activeSession = {}) {
    const score = Number(activeSession.coherenceScore);
    return Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : null;
  }

  function getPageSignalFallback(activeTab = latestActiveTab) {
    let hostname = '';
    try {
      hostname = new URL(activeTab?.url || '').hostname;
    } catch {
      hostname = '';
    }

    return {
      url: String(activeTab?.url || ''),
      hostname,
      title: String(activeTab?.title || '')
    };
  }

  function createInterventionFeedbackPayload(action, debugState = latestDebugState) {
    const intervention = debugState?.intervention || {};
    const currentVisit = intervention.currentVisit || {};
    const recoveryVisit = intervention.recoveryVisit || {};

    return {
      action,
      interventionId: intervention.interventionId,
      sessionId: intervention.sessionId,
      visitId: currentVisit.id,
      riskState: intervention.riskState,
      coherenceScore: intervention.coherenceScore,
      policyAction: intervention.action,
      currentVisit: {
        id: currentVisit.id,
        url: currentVisit.url,
        hostname: currentVisit.hostname
      },
      recoveryVisit: {
        url: recoveryVisit.url,
        hostname: recoveryVisit.hostname
      },
      recoveryUrl: intervention.recoveryUrl
    };
  }

  function renderReasonList(reasons = []) {
    const reasonList = document.getElementById('intentRecoveryReasonList');
    const visibleReasons = Array.isArray(reasons) ? reasons.slice(0, 3) : [];

    reasonList.replaceChildren(...visibleReasons.map(reason => {
      const item = document.createElement('li');
      item.textContent = reason;
      return item;
    }));
  }

  function setEmptyState(message = getMessage('popupIntentNoTrajectorySummary')) {
    const badge = document.getElementById('intentRecoveryBadge');
    const meter = document.getElementById('intentRecoveryMeter');

    badge.textContent = getMessage('popupNoDataLabel');
    badge.dataset.state = 'none';
    document.getElementById('intentRecoveryScore').textContent = '--';
    setText('intentRecoverySummary', message);
    setText('intentRecoveryOriginText', '--');
    setText('intentRecoveryCurrentText', '--');
    setText('intentRecoveryLastCoherentText', '--');
    setText('intentRecoveryDriftText', '--');
    setText('intentRecoveryDriftTabsText', '--');
    setText('intentRecoveryInterventionText', '--');
    setText('intentRecoveryPolicyText', '--');
    document.getElementById('intentRecoveryTimelineList')?.replaceChildren();
    document.getElementById('intentRecoveryReasonList').replaceChildren();
    clearIntentContinueReason();
    latestContinueInterventionId = '';
    renderContinueControl({});
    meter.style.width = '0%';
    meter.dataset.state = 'none';
    setActionsDisabled(true);
  }

  function render(debugState) {
    latestDebugState = debugState || null;
    const activeSession = debugState?.activeSession;
    if (!activeSession) {
      setEmptyState();
      return;
    }

    const visits = Array.isArray(activeSession.visits) ? activeSession.visits : [];
    const latestVisit = visits.at(-1);
    const driftVisit = visits.find(visit => visit.id === activeSession.firstDriftVisitId);
    const intervention = debugState?.intervention || {};
    const riskState = intervention.riskState || activeSession.riskState || 'clear';
    const score = getScore(activeSession);
    const badge = document.getElementById('intentRecoveryBadge');
    const meter = document.getElementById('intentRecoveryMeter');
    const recoveryUrl = String(intervention.recoveryUrl || '');
    const activeTabUrl = String(latestActiveTab?.url || '');
    const canActOnActiveTab = canActOnTab();
    const cooldownActive = intervention.chainBlock?.cooldownActive === true;
    const driftDescendantCount = countKnownDriftDescendantTabs(debugState, latestActiveTab?.id);
    const hasDriftDescendants = driftDescendantCount > 0;
    const continueInterventionId = String(intervention.interventionId || '');

    if (continueInterventionId !== latestContinueInterventionId) {
      clearIntentContinueReason();
      latestContinueInterventionId = continueInterventionId;
    }

    badge.textContent = riskState;
    badge.dataset.state = riskState;
    document.getElementById('intentRecoveryScore').textContent = score === null ? '--' : `${score}`;
    setText('intentRecoverySummary', getIntentRecoverySummary(riskState, intervention, getMessage));
    setText('intentRecoveryOriginText', getHostnameLabel(activeSession.origin));
    setText('intentRecoveryCurrentText', getHostnameLabel(latestVisit));
    setText('intentRecoveryLastCoherentText', getHostnameLabel(intervention.recoveryVisit));
    setText('intentRecoveryDriftText', driftVisit ? getHostnameLabel(driftVisit) : getMessage('popupNoneDetectedTitleCase'));
    setText('intentRecoveryDriftTabsText', formatDriftDescendantTabCount(driftDescendantCount, getMessage));
    setText('intentRecoveryInterventionText', formatIntentInterventionStatus(intervention, getMessage));
    setText('intentRecoveryPolicyText', formatIntentPolicyStatus(intervention));
    renderIntentRecoveryTimeline({
      timelineList: document.getElementById('intentRecoveryTimelineList'),
      visits,
      firstDriftVisitId: activeSession.firstDriftVisitId,
      getMessage
    });
    renderReasonList(intervention.reasonLines);
    renderContinueControl(intervention);

    meter.style.width = `${score ?? 0}%`;
    meter.dataset.state = riskState;
    setButtonState('returnIntentChainButton', !canActOnActiveTab || !recoveryUrl || recoveryUrl === activeTabUrl);
    setButtonState('returnIntentButton', !canActOnActiveTab || !recoveryUrl || recoveryUrl === activeTabUrl);
    ['isolateIntentButton', 'markIntentCoherentButton'].forEach(elementId => {
      setButtonState(elementId, !canActOnActiveTab || cooldownActive, cooldownActive ? getMessage('intentPromptCooldownUnavailableTitle') : '');
    });
    setButtonState(
      'returnIntentDriftTabsButton',
      !canActOnActiveTab || !recoveryUrl || !hasDriftDescendants
    );
    setButtonState(
      'moveIntentDriftTabsButton',
      !canActOnActiveTab || !hasDriftDescendants
    );
    setButtonState(
      'suspendIntentDriftTabsButton',
      !canActOnActiveTab || !hasDriftDescendants
    );
    setButtonState(
      'cleanIntentDriftTabsButton',
      !canActOnActiveTab || !hasDriftDescendants
    );
  }

  async function getFreshSignals(activeTab) {
    const snapshot = await pageSignalsPanel.refresh();
    return snapshot?.signals || getPageSignalFallback(activeTab);
  }

  async function returnToRecovery() {
    const activeTab = latestActiveTab || await getActiveTab();
    const recoveryUrl = latestDebugState?.intervention?.recoveryUrl;

    if (!activeTab?.id || !recoveryUrl) {
      setStatus(getMessage('popupIntentActionFailed'));
      return;
    }

    setActionsDisabled(true);
    await sendRuntimeMessage({
      action: 'recordIntentFeedback',
      tabId: activeTab.id,
      feedback: createInterventionFeedbackPayload('return')
    });
    const response = await updateTabUrl(activeTab.id, recoveryUrl);
    setStatus(response?.status === 'updated'
      ? getMessage('popupIntentReturned')
      : getMessage('popupIntentActionFailed'));
    await refreshIntentState?.();
  }

  async function returnChainToRecovery() {
    const activeTab = latestActiveTab || await getActiveTab();
    const recoveryUrl = latestDebugState?.intervention?.recoveryUrl;

    if (!activeTab?.id || !recoveryUrl) {
      setStatus(getMessage('popupIntentActionFailed'));
      return;
    }

    setActionsDisabled(true);
    const tabsResponse = await sendRuntimeMessage({
      action: 'returnIntentDriftDescendantTabs',
      tabId: activeTab.id,
      includeCurrent: false,
      recoveryUrl
    });
    await sendRuntimeMessage({
      action: 'recordIntentFeedback',
      tabId: activeTab.id,
      feedback: createInterventionFeedbackPayload('return')
    });
    const currentResponse = await updateTabUrl(activeTab.id, recoveryUrl);

    if (currentResponse?.status === 'updated') {
      setStatus(formatReturnedChainStatus(tabsResponse?.returnedCount, getMessage));
    } else {
      setStatus(getMessage('popupIntentActionFailed'));
    }

    await refreshIntentState?.();
  }

  async function continueCurrentIntent() {
    const activeTab = latestActiveTab || await getActiveTab();
    const intervention = latestDebugState?.intervention || {};
    const state = getIntentContinueControlState({
      intervention,
      canActOnActiveTab: canActOnTab(activeTab),
      reason: getContinueReasonInput()?.value || ''
    });

    if (state.disabled) {
      setStatus(getMessage(state.titleKey || 'popupIntentContinueFailed'));
      if (state.available) {
        getContinueReasonInput()?.focus();
      }
      renderContinueControl(intervention);
      return;
    }

    setActionsDisabled(true);
    const response = await sendTabMessage(activeTab.id, {
      action: 'continueIntentIntervention',
      interventionId: intervention.interventionId || null,
      reason: state.reason
    });
    const messageKey = {
      continued: 'popupIntentContinued',
      reasonRequired: 'popupIntentContinueReasonRequired',
      stale: 'popupIntentContinueStale',
      unavailable: 'popupIntentContinueUnavailable'
    }[response?.status] || 'popupIntentContinueFailed';

    if (response?.status === 'continued') {
      clearIntentContinueReason();
    }
    setStatus(getMessage(messageKey));
    await refreshIntentState?.();
  }

  async function startCleanSessionFromCurrentPage({ feedbackAction, successMessageKey }) {
    const activeTab = latestActiveTab || await getActiveTab();

    if (!activeTab?.id || isExtensionPage(activeTab.url)) {
      setStatus(getMessage('popupIntentActionFailed'));
      return;
    }

    setActionsDisabled(true);
    const signals = await getFreshSignals(activeTab);
    const response = await sendRuntimeMessage({
      action: 'isolateIntentCurrentPage',
      tabId: activeTab.id,
      signals,
      feedback: createInterventionFeedbackPayload(feedbackAction)
    });

    setStatus(response?.status === 'isolated'
      ? getMessage(successMessageKey)
      : getMessage('popupIntentActionFailed'));
    await refreshIntentState?.();
  }

  async function isolateCurrentPage() {
    await startCleanSessionFromCurrentPage({
      feedbackAction: 'isolate',
      successMessageKey: 'popupIntentIsolated'
    });
  }

  async function markCurrentSessionCoherent() {
    await startCleanSessionFromCurrentPage({
      feedbackAction: 'markCoherent',
      successMessageKey: 'popupIntentMarkedCoherent'
    });
  }

  function setActiveTab(activeTab) {
    latestActiveTab = activeTab || null;
  }

  return {
    cleanDriftTabs: driftTabActions.cleanDriftTabs,
    continueCurrentIntent,
    isolateCurrentPage,
    markCurrentSessionCoherent,
    moveDriftTabs: driftTabActions.moveDriftTabs,
    render,
    returnChainToRecovery,
    returnDriftTabs: driftTabActions.returnDriftTabs,
    returnToRecovery,
    setActiveTab,
    setEmptyState,
    suspendDriftTabs: driftTabActions.suspendDriftTabs
  };
}
