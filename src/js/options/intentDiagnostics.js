// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

const MAX_VISITS = 10;

function sendRuntimeMessage(message) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage(message, response => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }

      resolve(response);
    });
  });
}

function getElement(id) {
  return document.getElementById(id);
}

function getLabel(entity) {
  if (!entity) {
    return '--';
  }

  const hostname = String(entity.hostname || '').replace(/^www\./i, '');
  const title = String(entity.title || '').trim();
  if (hostname && title) {
    return `${hostname} - ${title}`;
  }

  return title || hostname || '--';
}

function formatPercent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${Math.round(number * 100)}%` : '--';
}

function formatCount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : '0';
}

function formatDuration(value) {
  const totalSeconds = Math.max(0, Math.round(Number(value || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

function formatRate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(number >= 10 ? 1 : 2)}/min` : '--';
}

function formatFeedbackRecommendation(value) {
  const labels = {
    insufficientData: 'insufficient data',
    interventionsHelpful: 'interventions helpful',
    tooSensitive: 'possibly too sensitive',
    mixed: 'mixed'
  };
  return labels[value] || '--';
}

function formatSignedNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number === 0) {
    return '0';
  }

  return number > 0 ? `+${number}` : String(number);
}

function formatIntentCalibration(calibration = null) {
  if (!calibration) {
    return '--';
  }

  if (!calibration.enabled) {
    return 'disabled';
  }

  const delta = Number(calibration.thresholdDelta || 0);
  const thresholdText = Number.isFinite(Number(calibration.effectiveInterventionThreshold))
    ? `intervene <= ${calibration.effectiveInterventionThreshold}`
    : 'no effective threshold';
  const adjustmentText = calibration.applied
    ? `${formatSignedNumber(delta)} (${thresholdText})`
    : `0 (${thresholdText})`;

  return `${adjustmentText} - ${calibration.reason || 'no adjustment'}`;
}

function formatChainBlock(chainBlock = null) {
  if (!chainBlock?.active) {
    return 'inactive';
  }

  const modeLabel = chainBlock.mode === 'driftDescendant'
    ? 'drift descendant'
    : (chainBlock.mode === 'lockedChain' ? 'locked chain' : 'active');
  const cooldownText = chainBlock.cooldownActive
    ? ` - cooldown ${formatDuration(chainBlock.cooldownRemainingMs)}`
    : (Number(chainBlock.cooldownMs || 0) > 0 ? ' - cooldown complete' : '');
  return `${modeLabel} - ${chainBlock.reason || 'quarantine active'}${cooldownText}`;
}

function formatLineageSummary(metrics = {}) {
  const tabCount = Number(metrics.tabCount || 0);
  const branchCount = Number(metrics.branchCount || 0);
  return `${tabCount} tab${tabCount === 1 ? '' : 's'} / ${branchCount} branch${branchCount === 1 ? '' : 'es'}`;
}

function formatLineageDetail(metrics = {}) {
  const driftDescendantCount = Number(metrics.driftDescendantCount || 0);
  const transitionType = metrics.latestTransitionType || 'unknown transition';
  const qualifiers = Array.isArray(metrics.latestTransitionQualifiers) && metrics.latestTransitionQualifiers.length > 0
    ? ` (${metrics.latestTransitionQualifiers.join(', ')})`
    : '';
  const parts = [
    `${driftDescendantCount} drift descendant${driftDescendantCount === 1 ? '' : 's'}`,
    `latest ${transitionType}${qualifiers}`
  ];

  if (metrics.latestIsDriftDescendant) {
    parts.push('current is descendant');
  }

  return parts.join(' - ');
}

function setEmptyState(message = 'No data') {
  getElement('optionsIntentState').textContent = message;
  getElement('optionsIntentState').dataset.state = 'none';
  getElement('optionsIntentScore').textContent = '--';
  getElement('optionsIntentPlan').textContent = '--';
  getElement('optionsIntentAction').textContent = '--';
  getElement('optionsIntentOrigin').textContent = '--';
  getElement('optionsIntentCurrent').textContent = '--';
  getElement('optionsIntentLineage').textContent = '--';
  getElement('optionsIntentLineageDetail').textContent = '--';
  getElement('optionsIntentReasons').replaceChildren();
  getElement('optionsIntentMetrics').replaceChildren();
  getElement('optionsIntentVisits').replaceChildren();
}

function renderReasons(reasons = []) {
  const list = getElement('optionsIntentReasons');
  const items = Array.isArray(reasons) && reasons.length > 0
    ? reasons
    : ['No score reasons yet.'];

  list.replaceChildren(...items.map(reason => {
    const item = document.createElement('li');
    item.textContent = reason;
    return item;
  }));
}

function renderMetrics(metrics = {}, debugState = {}, feedbackSummary = {}) {
  const feedbackCount = Array.isArray(debugState?.state?.feedback) ? debugState.state.feedback.length : 0;
  const metricRows = [
    ['Origin similarity', formatPercent(metrics.originSimilarity)],
    ['Local similarity', formatPercent(metrics.localSimilarity)],
    ['Text origin similarity', metrics.textOriginSimilarity === null ? '--' : formatPercent(metrics.textOriginSimilarity)],
    ['Passive media load', formatPercent(metrics.passiveMediaLoad)],
    ['Passive scroll/click pressure', formatPercent(metrics.passiveInteractionLoad)],
    ['Active input load', formatPercent(metrics.activeInputLoad)],
    ['Interaction velocity load', formatPercent(metrics.interactionVelocityLoad)],
    ['Scroll velocity', formatRate(metrics.scrollRatePerMinute)],
    ['Click velocity', formatRate(metrics.clickRatePerMinute)],
    ['Recommendation/feed click load', formatPercent(metrics.recommenderClickLoad)],
    ['Recommendation/feed clicks', formatCount(metrics.recommenderClickEvents)],
    ['Recommendation/feed click velocity', formatRate(metrics.recommenderClickRatePerMinute)],
    ['Latest transition', metrics.latestTransitionType || '--'],
    ['Transition qualifiers', Array.isArray(metrics.latestTransitionQualifiers) && metrics.latestTransitionQualifiers.length > 0 ? metrics.latestTransitionQualifiers.join(', ') : '--'],
    ['Redirect transition load', formatPercent(metrics.redirectTransitionLoad)],
    ['Redirect transitions', formatCount(metrics.redirectTransitionCount)],
    ['Input velocity', formatRate(metrics.inputRatePerMinute)],
    ['Key velocity', formatRate(metrics.keyRatePerMinute)],
    ['Constructive dwell', formatPercent(metrics.constructiveDwell)],
    ['Passive active-time load', formatPercent(metrics.passiveTimeLoad)],
    ['Latest dwell', formatDuration(metrics.latestDwellMs)],
    ['Latest active time', formatDuration(metrics.latestActiveMs)],
    ['Total dwell', formatDuration(metrics.totalDwellMs)],
    ['Total active time', formatDuration(metrics.totalActiveMs)],
    ['Link density', formatPercent(metrics.linkDensity)],
    ['Domain entropy', formatPercent(metrics.domainEntropy)],
    ['Domain changes', String(metrics.domainChanges ?? 0)],
    ['Tabs in chain', formatCount(metrics.tabCount)],
    ['Child-tab branches', formatCount(metrics.branchCount)],
    ['Drift descendants', formatCount(metrics.driftDescendantCount)],
    ['Current is drift descendant', metrics.latestIsDriftDescendant ? 'yes' : 'no'],
    ['Intervention feedback entries', formatCount(feedbackSummary.total ?? feedbackCount)],
    ['Feedback return rate', formatPercent(feedbackSummary.returnRate)],
    ['Feedback isolate rate', formatPercent(feedbackSummary.isolateRate)],
    ['Feedback continue rate', formatPercent(feedbackSummary.continueRate)],
    ['Feedback dismiss rate', formatPercent(feedbackSummary.dismissRate)],
    ['Feedback average score', Number.isFinite(feedbackSummary.averageCoherenceScore) ? String(feedbackSummary.averageCoherenceScore) : '--'],
    ['Calibration diagnostic', formatFeedbackRecommendation(feedbackSummary.recommendation)],
    ['Auto calibration', formatIntentCalibration(debugState?.intentPolicy?.settings?.calibration)],
    ['Chain block', formatChainBlock(debugState?.intervention?.chainBlock)]
  ];

  getElement('optionsIntentMetrics').replaceChildren(...metricRows.flatMap(([label, value]) => {
    const term = document.createElement('dt');
    term.textContent = label;
    const definition = document.createElement('dd');
    definition.textContent = value;
    return [term, definition];
  }));
}

function renderVisits(visits = []) {
  const list = getElement('optionsIntentVisits');
  const recentVisits = visits.slice(-MAX_VISITS);

  list.replaceChildren(...recentVisits.map(visit => {
    const item = document.createElement('li');
    const title = document.createElement('strong');
    title.textContent = getLabel(visit);
    const policyLabel = Array.isArray(visit.policy?.planNames) && visit.policy.planNames.length > 0
      ? `policy ${visit.policy.planNames.join(', ')}`
      : (visit.policy?.source ? `policy ${visit.policy.source}` : '');

    const meta = document.createElement('span');
    meta.textContent = [
      visit.startedAt ? new Date(visit.startedAt).toLocaleTimeString() : '',
      Number.isFinite(Number(visit.tabId)) ? `tab ${visit.tabId}` : '',
      Number.isFinite(Number(visit.openerTabId)) ? `from tab ${visit.openerTabId}` : '',
      visit.driftDescendant ? 'drift descendant' : '',
      visit.transitionType ? `transition ${visit.transitionType}` : '',
      Array.isArray(visit.transitionQualifiers) && visit.transitionQualifiers.length > 0 ? visit.transitionQualifiers.join(', ') : '',
      `active ${formatDuration(visit.activeMs ?? visit.signals?.activity?.activePageMs)}`,
      `dwell ${formatDuration(visit.dwellMs ?? visit.signals?.activity?.pageAgeMs)}`,
      policyLabel,
      `origin ${formatPercent(visit.metrics?.originSimilarity)}`,
      `local ${formatPercent(visit.metrics?.localSimilarity)}`
    ].filter(Boolean).join(' · ');

    item.append(title, meta);
    return item;
  }));
}

function renderDiagnostics(debugState) {
  const session = debugState?.activeSession;
  if (!session) {
    setEmptyState();
    return;
  }

  const decision = debugState?.intervention || {};
  const policy = debugState?.intentPolicy || {};
  const visits = Array.isArray(session.visits) ? session.visits : [];
  const latestVisit = visits[visits.length - 1] || null;
  const riskState = decision.riskState || session.riskState || 'clear';
  const planNames = Array.isArray(policy.planNames) && policy.planNames.length > 0
    ? policy.planNames.join(', ')
    : policy.source || 'default';

  getElement('optionsIntentState').textContent = riskState;
  getElement('optionsIntentState').dataset.state = riskState;
  getElement('optionsIntentScore').textContent = Number.isFinite(decision.coherenceScore)
    ? String(decision.coherenceScore)
    : '--';
  getElement('optionsIntentPlan').textContent = `Policy: ${planNames}`;
  getElement('optionsIntentAction').textContent = decision.settings
    ? `${decision.action} · intervene <= ${decision.settings.interventionThreshold} · locked <= ${decision.settings.lockedThreshold} · retain ${decision.settings.diagnosticsRetentionDays}d${decision.settings.calibration?.applied ? ` · calibrated ${formatSignedNumber(decision.settings.calibration.thresholdDelta)}` : ''}${decision.chainBlock?.active ? ' · chain quarantine' : ''}`
    : '--';
  getElement('optionsIntentOrigin').textContent = getLabel(session.origin);
  getElement('optionsIntentCurrent').textContent = latestVisit ? `Current: ${getLabel(latestVisit)}` : '--';
  getElement('optionsIntentLineage').textContent = formatLineageSummary(session.metrics);
  getElement('optionsIntentLineageDetail').textContent = formatLineageDetail(session.metrics);

  renderReasons(decision.reasonLines);
  renderMetrics(session.metrics, debugState, debugState?.feedbackSummary);
  renderVisits(visits);
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function refreshIntentDiagnosticsPanel() {
  const debugState = await sendRuntimeMessage({ action: 'getIntentDebugState' });
  renderDiagnostics(debugState);
}

async function clearIntentDiagnosticsPanel() {
  const clearButton = getElement('clearIntentDiagnosticsButton');
  clearButton.disabled = true;
  const response = await sendRuntimeMessage({ action: 'clearIntentDebugState' });
  if (response?.status === 'cleared') {
    setEmptyState('Cleared');
  }
  clearButton.disabled = false;
}

async function exportIntentDiagnosticsPanel() {
  const exportButton = getElement('exportIntentDiagnosticsButton');
  exportButton.disabled = true;
  const debugState = await sendRuntimeMessage({ action: 'getIntentDebugState' });
  if (debugState?.state) {
    const exportedAt = new Date().toISOString();
    const dateStamp = exportedAt.replace(/[:.]/g, '-');
    downloadJson(`dad-intent-diagnostics-${dateStamp}.json`, {
      exportedAt,
      schema: 'dad.intentDiagnostics.v1',
      privacy: 'Local trajectory diagnostics only. No raw typed input is intentionally stored.',
      intentPolicy: debugState.intentPolicy || null,
      intervention: debugState.intervention || null,
      feedbackSummary: debugState.feedbackSummary || null,
      activeSessionId: debugState.activeSession?.id || null,
      state: debugState.state
    });
  }
  exportButton.disabled = false;
}

export function initializeIntentDiagnosticsPanel() {
  const refreshButton = getElement('refreshIntentDiagnosticsButton');
  const exportButton = getElement('exportIntentDiagnosticsButton');
  const clearButton = getElement('clearIntentDiagnosticsButton');
  if (!refreshButton || !exportButton || !clearButton) {
    return;
  }

  refreshButton.addEventListener('click', refreshIntentDiagnosticsPanel);
  exportButton.addEventListener('click', exportIntentDiagnosticsPanel);
  clearButton.addEventListener('click', clearIntentDiagnosticsPanel);
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (
      (areaName === 'local' && changes.intentTrajectoryState)
        || (areaName === 'sync' && changes.plans)
    ) {
      refreshIntentDiagnosticsPanel().catch(error => {
        console.error('Failed to refresh intent diagnostics:', error);
      });
    }
  });

  refreshIntentDiagnosticsPanel().catch(error => {
    console.error('Failed to initialize intent diagnostics:', error);
  });
}
