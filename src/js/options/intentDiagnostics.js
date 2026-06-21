// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk
import {
  createIntentLineageGraph
} from '../shared/intentCoherence.js';
import { sendRuntimeMessage } from '../../platform/chrome/runtimeMessages.js';
import { addStorageChangeListener } from '../../platform/chrome/storage.js';
import {
  formatChainBlock,
  formatCoherentHosts,
  formatContinueOutcomeSummary,
  formatCount,
  formatDriftDescendantHosts,
  formatDuration,
  formatFeedbackRecommendation,
  formatIntentCalibration,
  formatLineageDetail,
  formatLineageSummary,
  formatPercent,
  formatRate,
  formatSignedNumber
} from './intent-diagnostics/format.js';
const MAX_VISITS = 10;
const MAX_GRAPH_NODES = 12;

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
  getElement('optionsIntentGraph').replaceChildren();
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

function renderMetrics(metrics = {}, debugState = {}, feedbackSummary = {}, session = {}) {
  const feedbackCount = Array.isArray(debugState?.state?.feedback) ? debugState.state.feedback.length : 0;
  const metricRows = [
    ['Origin similarity / anchor', `${formatPercent(metrics.originSimilarity)} / ${formatPercent(metrics.originAnchorStrength)}`],
    ['Local similarity', formatPercent(metrics.localSimilarity)],
    ['Text origin similarity', metrics.textOriginSimilarity === null ? '--' : formatPercent(metrics.textOriginSimilarity)],
    ['Passive media load', formatPercent(metrics.passiveMediaLoad)],
    ['Media playback / chain load', `${formatPercent(metrics.mediaPlaybackLoad)} / ${formatPercent(metrics.mediaChainLoad)} (${formatCount(metrics.consecutiveMediaVisitCount)} in a row)`],
    ['Media playback', formatDuration(metrics.mediaPlaybackMs)],
    ['Media play/change/end events', `${formatCount(metrics.mediaPlayEvents)} / ${formatCount(metrics.mediaSourceChangeEvents)} / ${formatCount(metrics.mediaEndEvents)}`],
    ['Passive regions', `${formatCount(metrics.recommendationRegionCount)} rec / ${formatCount(metrics.commentSectionCount)} comments / ${formatCount(metrics.shortFormMediaCount)} short`],
    ['Passive scroll/click pressure', formatPercent(metrics.passiveInteractionLoad)],
    ['Active input load', `${formatPercent(metrics.activeInputLoad)} (${formatDuration(metrics.activeInputMs)})`],
    ['Agency ratio / low-agency load', `${formatPercent(metrics.agencyRatio)} / ${formatPercent(metrics.lowAgencyLoad)}`],
    ['Interaction velocity load', formatPercent(metrics.interactionVelocityLoad)],
    ['Scroll/click velocity', `${formatRate(metrics.scrollRatePerMinute)} / ${formatRate(metrics.clickRatePerMinute)}`],
    ['Scroll movement', `${formatCount(metrics.scrollDirectionChanges)} reversals / ${Number(metrics.scrollDistanceViewportUnits || 0).toFixed(1)} screens`],
    ['Dynamic scroll appends', `${formatPercent(metrics.dynamicContentLoad)} (${formatCount(metrics.scrollLinkedContentBatches)} batches / ${formatCount(metrics.scrollLinkedAddedElements)} elements)`],
    ['Recommendation/feed click load', formatPercent(metrics.recommenderClickLoad)],
    ['Recommendation/feed clicks', `${formatCount(metrics.recommenderClickEvents)} (${formatCount(metrics.recommendationClickEvents)} rec / ${formatCount(metrics.feedClickEvents)} feed / ${formatCount(metrics.commentClickEvents)} comments)`],
    ['Feed/comment load', `${formatPercent(metrics.feedCommentInteractionLoad)} (${formatRate(metrics.feedClickRatePerMinute)} / ${formatRate(metrics.commentClickRatePerMinute)})`],
    ['Latest transition', `${metrics.latestTransitionType || '--'}${metrics.latestDirectNavigation ? ` (direct, recovery ${formatPercent(metrics.directNavigationRecovery)})` : ''}`],
    ['Transition qualifiers', Array.isArray(metrics.latestTransitionQualifiers) && metrics.latestTransitionQualifiers.length > 0 ? metrics.latestTransitionQualifiers.join(', ') : '--'],
    ['Redirect transition load', formatPercent(metrics.redirectTransitionLoad)],
    ['Redirect transitions', formatCount(metrics.redirectTransitionCount)],
    ['Navigation loop load', `${formatPercent(metrics.navigationLoopLoad)} (${formatCount(metrics.samePageRepeatCount)} repeats, ${formatCount(metrics.reloadTransitionCount)} reloads)`],
    ['Search loop load', `${formatPercent(metrics.searchRefinementLoad)} (${formatCount(metrics.searchVisitCount)} searches, ${formatCount(metrics.searchQueryShiftCount)} shifts)`],
    ['Deliberate gap load', `${formatPercent(metrics.deliberateStalenessLoad)} (${formatCount(metrics.visitsSinceDeliberateAction)} visits)`],
    ['Unanchored / origin decay load', `${formatPercent(metrics.unanchoredSessionLoad)} / ${formatPercent(metrics.originDecayLoad)} (${formatPercent(metrics.recentOriginSimilarity)} recent avg)`],
    ['Session age / deliberate gap', `${formatDuration(metrics.sessionAgeMs)} / ${formatDuration(metrics.deliberateGapMs)}`],
    ['Input velocity', formatRate(metrics.inputRatePerMinute)],
    ['Key velocity', formatRate(metrics.keyRatePerMinute)],
    ['Constructive dwell', formatPercent(metrics.constructiveDwell)],
    ['Passive active-time load', formatPercent(metrics.passiveTimeLoad)],
    ['Latest dwell / active', `${formatDuration(metrics.latestDwellMs)} / ${formatDuration(metrics.latestActiveMs)}`],
    ['Total dwell / active', `${formatDuration(metrics.totalDwellMs)} / ${formatDuration(metrics.totalActiveMs)}`],
    ['Long-session load', formatPercent(metrics.longSessionLoad)],
    ['Link density', formatPercent(metrics.linkDensity)],
    ['Domain entropy', formatPercent(metrics.domainEntropy)],
    ['Domain changes', String(metrics.domainChanges ?? 0)],
    ['Return rate', formatPercent(metrics.returnRate)],
    ['Origin return rate', formatPercent(metrics.originReturnRate)],
    ['Low-return load', formatPercent(metrics.lowReturnLoad)],
    ['Tabs in chain', formatCount(metrics.tabCount)],
    ['Open tabs', formatCount(metrics.openTabCount)],
    ['Open windows', formatCount(metrics.openWindowCount)],
    ['Open-tab pressure', formatPercent(metrics.tabPressureLoad)],
    ['Recent tab switches', formatCount(metrics.tabSwitchCount)],
    ['Tab-switch velocity', formatRate(metrics.tabSwitchRatePerMinute)],
    ['Tab-switch loops', formatCount(metrics.tabSwitchLoopCount)],
    ['Tab-switch load', formatPercent(metrics.tabSwitchLoad)],
    ['Child-tab branches', formatCount(metrics.branchCount)],
    ['Coherent hosts', formatCoherentHosts(session)],
    ['Drift descendants', formatCount(metrics.driftDescendantCount)],
    ['Drift descendant hosts', formatDriftDescendantHosts(session)],
    ['Current is drift descendant', metrics.latestIsDriftDescendant ? 'yes' : 'no'],
    ['Intervention feedback entries', formatCount(feedbackSummary.total ?? feedbackCount)],
    ['Feedback continue reasons', formatCount(feedbackSummary.continueReasonCount)],
    ['Feedback return rate', formatPercent(feedbackSummary.returnRate)],
    ['Feedback isolate rate', formatPercent(feedbackSummary.isolateRate)],
    ['Feedback coherent mark rate', formatPercent(feedbackSummary.markCoherentRate)],
    ['Feedback continue rate', formatPercent(feedbackSummary.continueRate)],
    ['Feedback dismiss rate', formatPercent(feedbackSummary.dismissRate)],
    ['Feedback score / outcomes', `${Number.isFinite(feedbackSummary.averageCoherenceScore) ? String(feedbackSummary.averageCoherenceScore) : '--'} avg - ${formatCount(feedbackSummary.outcomeTotal)} observed - ${formatPercent(feedbackSummary.outcomeRecoveredRate)} recovered (${formatCount(feedbackSummary.outcomeRecovered)}) - return host ${formatPercent(feedbackSummary.outcomeReturnHostRate)} - delta ${Number.isFinite(feedbackSummary.averageOutcomeScoreDelta) ? formatSignedNumber(feedbackSummary.averageOutcomeScoreDelta) : '--'}`],
    ['Continue outcomes', formatContinueOutcomeSummary(feedbackSummary)],
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

function createGraphBadge(label) {
  const badge = document.createElement('span');
  badge.className = 'intent-graph-badge';
  badge.textContent = label;
  return badge;
}

function getGraphNodeMeta(node = {}) {
  return [
    node.startedAt ? new Date(node.startedAt).toLocaleTimeString() : '',
    Number.isFinite(node.tabId) ? `tab ${node.tabId}` : '',
    Number.isFinite(node.openerTabId) ? `from tab ${node.openerTabId}` : '',
    node.transitionType ? `via ${node.transitionType}` : '',
    Array.isArray(node.transitionQualifiers) && node.transitionQualifiers.length > 0
      ? node.transitionQualifiers.join(', ')
      : ''
  ].filter(Boolean).join(' · ');
}

function renderLineageGraph(session = {}) {
  const list = getElement('optionsIntentGraph');
  const graph = createIntentLineageGraph(session, { maxNodes: MAX_GRAPH_NODES });
  if (graph.nodes.length === 0) {
    const item = document.createElement('li');
    item.textContent = 'No graph data yet.';
    list.replaceChildren(item);
    return;
  }

  list.dataset.hiddenVisitCount = String(graph.summary.hiddenVisitCount);
  list.replaceChildren(...graph.nodes.map(node => {
    const item = document.createElement('li');
    item.dataset.current = node.isCurrent ? 'true' : 'false';
    item.dataset.origin = node.isOrigin ? 'true' : 'false';
    item.dataset.firstDrift = node.isFirstDrift ? 'true' : 'false';
    item.dataset.driftDescendant = node.isDriftDescendant ? 'true' : 'false';
    item.dataset.coherenceState = node.coherenceState || 'uncertain';

    const marker = document.createElement('span');
    marker.className = 'intent-graph-marker';
    marker.textContent = String(node.sequence);

    const body = document.createElement('div');
    body.className = 'intent-graph-node-body';

    const title = document.createElement('strong');
    title.textContent = node.label;

    const meta = document.createElement('small');
    meta.textContent = getGraphNodeMeta(node) || 'same tab';

    const badges = document.createElement('div');
    badges.className = 'intent-graph-badges';
    badges.appendChild(createGraphBadge(node.coherenceLabel || 'uncertain'));
    if (node.isOrigin) badges.appendChild(createGraphBadge('origin'));
    if (node.isCurrent) badges.appendChild(createGraphBadge('current'));

    body.append(title, meta, badges);
    item.append(marker, body);
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
    ? `${decision.action} · intervene <= ${decision.settings.interventionThreshold} · locked <= ${decision.settings.lockedThreshold} · retain ${decision.settings.diagnosticsRetentionDays}d${decision.settings.calibration?.applied ? ` · calibrated ${formatSignedNumber(decision.settings.calibration.thresholdDelta)}` : ''}${decision.chainBlock?.active ? ' · chain quarantine' : ''}${decision.settings.autoCloseQuarantinedTab ? ' · auto-close current tab' : ''}`
    : '--';
  getElement('optionsIntentOrigin').textContent = getLabel(session.origin);
  getElement('optionsIntentCurrent').textContent = latestVisit ? `Current: ${getLabel(latestVisit)}` : '--';
  getElement('optionsIntentLineage').textContent = formatLineageSummary(session.metrics);
  getElement('optionsIntentLineageDetail').textContent = formatLineageDetail(session.metrics);

  renderReasons(decision.reasonLines);
  renderLineageGraph(session);
  renderMetrics(session.metrics, debugState, debugState?.feedbackSummary, session);
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
  addStorageChangeListener((changes, areaName) => {
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
