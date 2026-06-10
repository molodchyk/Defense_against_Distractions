// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  formatShortDuration,
  getHostnameLabel
} from './format.js';

const DEFAULT_MAX_VISITS = 4;

export function createIntentDiagnosticsPanel({
  getMessage,
  getActiveTab,
  isExtensionPage,
  sendRuntimeMessage,
  sendTabMessage,
  pageSignalsPanel,
  setStatus,
  onActiveTabChange,
  onStateChange,
  maxVisits = DEFAULT_MAX_VISITS
}) {
  let latestDebugState = null;

  function setEmptyState(message = getMessage('popupNoTrajectoryDataYet')) {
    document.getElementById('intentRiskBadge').textContent = getMessage('popupNoDataLabel');
    document.getElementById('intentRiskBadge').dataset.state = 'none';
    document.getElementById('intentCoherenceScore').textContent = '--';
    document.getElementById('intentOriginText').textContent = message;
    document.getElementById('intentCurrentText').textContent = '--';
    document.getElementById('intentDriftText').textContent = '--';
    document.getElementById('intentLineageText').textContent = '--';
    document.getElementById('intentReasonList').replaceChildren();
    document.getElementById('intentVisitList').replaceChildren();
  }

  function formatLineage(metrics = {}) {
    const tabCount = Number(metrics.tabCount || 0);
    const branchCount = Number(metrics.branchCount || 0);
    const driftDescendantCount = Number(metrics.driftDescendantCount || 0);
    const transitionType = metrics.latestTransitionType || 'unknown';
    const parts = [
      `${tabCount} tab${tabCount === 1 ? '' : 's'}`,
      `${branchCount} branch${branchCount === 1 ? '' : 'es'}`,
      `latest ${transitionType}`
    ];

    if (driftDescendantCount > 0) {
      parts.push(`${driftDescendantCount} drift descendant${driftDescendantCount === 1 ? '' : 's'}`);
    }

    if (metrics.latestIsDriftDescendant) {
      parts.push('current is descendant');
    }

    return parts.join(' - ');
  }

  function renderVisitList(visits = []) {
    const visitList = document.getElementById('intentVisitList');
    const recentVisits = visits.slice(-maxVisits);

    visitList.replaceChildren(...recentVisits.map(visit => {
      const item = document.createElement('li');
      const title = document.createElement('span');
      const meta = document.createElement('small');

      title.textContent = getHostnameLabel(visit);
      const metaParts = [];
      if (Number.isFinite(Number(visit.tabId))) {
        metaParts.push(`tab ${visit.tabId}`);
      }
      if (Number.isFinite(Number(visit.openerTabId))) {
        metaParts.push(`from tab ${visit.openerTabId}`);
      }
      if (visit.driftDescendant) {
        metaParts.push('drift descendant');
      }
      if (visit.transitionType) {
        metaParts.push(`transition ${visit.transitionType}`);
      }
      if (Array.isArray(visit.transitionQualifiers) && visit.transitionQualifiers.length > 0) {
        metaParts.push(visit.transitionQualifiers.join(', '));
      }
      metaParts.push(`active ${formatShortDuration(visit.activeMs ?? visit.signals?.activity?.activePageMs)}`);
      if (visit.metrics) {
        metaParts.push(`origin ${Math.round(Number(visit.metrics.originSimilarity || 0) * 100)}%`);
        metaParts.push(`local ${Math.round(Number(visit.metrics.localSimilarity || 0) * 100)}%`);
      }

      meta.textContent = metaParts.join(' - ');

      item.append(title, meta);
      return item;
    }));
  }

  function renderReasonList(reasons = []) {
    const reasonList = document.getElementById('intentReasonList');
    const visibleReasons = Array.isArray(reasons) ? reasons.slice(0, 3) : [];

    reasonList.replaceChildren(...visibleReasons.map(reason => {
      const item = document.createElement('li');
      item.textContent = reason;
      return item;
    }));
  }

  function render(debugState) {
    latestDebugState = debugState || null;
    const activeSession = debugState?.activeSession;

    if (!activeSession) {
      setEmptyState();
      onStateChange?.(latestDebugState);
      return;
    }

    const visits = Array.isArray(activeSession.visits) ? activeSession.visits : [];
    const latestVisit = visits.at(-1);
    const driftVisit = visits.find(visit => visit.id === activeSession.firstDriftVisitId);
    const riskState = debugState?.intervention?.riskState || activeSession.riskState || 'clear';
    const score = Number.isFinite(activeSession.coherenceScore)
      ? activeSession.coherenceScore
      : '--';

    document.getElementById('intentRiskBadge').textContent = riskState;
    document.getElementById('intentRiskBadge').dataset.state = riskState;
    document.getElementById('intentCoherenceScore').textContent = score;
    document.getElementById('intentOriginText').textContent = getHostnameLabel(activeSession.origin);
    document.getElementById('intentCurrentText').textContent = getHostnameLabel(latestVisit);
    document.getElementById('intentDriftText').textContent = driftVisit ? getHostnameLabel(driftVisit) : 'None detected';
    document.getElementById('intentLineageText').textContent = formatLineage(activeSession.metrics);
    renderReasonList(debugState?.intervention?.reasonLines);
    renderVisitList(visits);
    onStateChange?.(latestDebugState);
  }

  async function refresh() {
    const activeTab = await getActiveTab();
    onActiveTabChange?.(activeTab || null);

    await pageSignalsPanel.refresh();

    if (activeTab?.id && !isExtensionPage(activeTab.url)) {
      await sendTabMessage(activeTab.id, { action: 'reportIntentPageSignals' });
    }

    const debugState = await sendRuntimeMessage({
      action: 'getIntentDebugState',
      tabId: activeTab?.id
    });

    render(debugState);
    return latestDebugState;
  }

  async function clear() {
    const clearButton = document.getElementById('clearIntentButton');
    clearButton.disabled = true;
    const response = await sendRuntimeMessage({ action: 'clearIntentDebugState' });

    if (response?.status === 'cleared') {
      latestDebugState = null;
      setEmptyState(getMessage('popupClearedLabel'));
      onStateChange?.(latestDebugState);
    } else {
      setStatus(getMessage('popupCouldNotClearIntent'));
    }

    clearButton.disabled = false;
  }

  function getSummary(debugState = latestDebugState) {
    const activeSession = debugState?.activeSession;
    const riskState = debugState?.intervention?.riskState || activeSession?.riskState || 'none';
    const score = Number.isFinite(Number(activeSession?.coherenceScore))
      ? activeSession.coherenceScore
      : null;
    const scoreText = score === null ? '' : ` · ${score}`;

    if (!activeSession) {
      return {
        state: 'idle',
        text: getMessage('popupNoTrajectory')
      };
    }

    if (riskState === 'locked' || riskState === 'intervene') {
      return {
        state: 'active',
        text: `${riskState}${scoreText}`
      };
    }

    if (riskState === 'watch' || riskState === 'drift') {
      return {
        state: 'ready',
        text: `${riskState}${scoreText}`
      };
    }

    return {
      state: 'idle',
      text: `${riskState}${scoreText}`
    };
  }

  function getCompactDiagnostics(debugState = latestDebugState) {
    const activeSession = debugState?.activeSession || null;
    const visits = Array.isArray(activeSession?.visits) ? activeSession.visits : [];
    const latestVisit = visits.at(-1) || null;
    const driftVisit = visits.find(visit => visit.id === activeSession?.firstDriftVisitId) || null;

    if (!activeSession) {
      return {
        active: false,
        riskState: 'none'
      };
    }

    return {
      active: true,
      sessionId: activeSession.id || null,
      riskState: debugState?.intervention?.riskState || activeSession.riskState || null,
      coherenceScore: Number.isFinite(Number(activeSession.coherenceScore))
        ? activeSession.coherenceScore
        : null,
      origin: activeSession.origin || null,
      current: latestVisit,
      firstDrift: driftVisit,
      metrics: activeSession.metrics || null,
      reasonLines: Array.isArray(debugState?.intervention?.reasonLines)
        ? debugState.intervention.reasonLines
        : [],
      intervention: debugState?.intervention || null,
      visitCount: visits.length
    };
  }

  function getDebugState() {
    return latestDebugState;
  }

  return {
    clear,
    getCompactDiagnostics,
    getDebugState,
    getSummary,
    refresh,
    render,
    setEmptyState
  };
}
