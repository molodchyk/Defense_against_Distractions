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
import {
  createMetricRow,
  formatIntentActionSummary,
  formatIntentBoolean,
  getIntentDiagnosticMessage as getMessage
} from './intent-diagnostics/messages.js';
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

function setEmptyState(message = getMessage('popupNoDataLabel', 'No data')) {
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
    : [getMessage('intentDiagnosticsNoScoreReasons', 'No score reasons yet.')];

  list.replaceChildren(...items.map(reason => {
    const item = document.createElement('li');
    item.textContent = reason;
    return item;
  }));
}

function renderMetrics(metrics = {}, debugState = {}, feedbackSummary = {}, session = {}) {
  const feedbackCount = Array.isArray(debugState?.state?.feedback) ? debugState.state.feedback.length : 0;
  const metricRows = [
    createMetricRow('originSimilarityAnchor', `${formatPercent(metrics.originSimilarity)} / ${formatPercent(metrics.originAnchorStrength)}`),
    createMetricRow('localSimilarity', formatPercent(metrics.localSimilarity)),
    createMetricRow('textOriginSimilarity', metrics.textOriginSimilarity === null ? '--' : formatPercent(metrics.textOriginSimilarity)),
    createMetricRow('passiveMediaLoad', formatPercent(metrics.passiveMediaLoad)),
    createMetricRow('mediaPlaybackChainLoad', `${formatPercent(metrics.mediaPlaybackLoad)} / ${formatPercent(metrics.mediaChainLoad)} (${formatCount(metrics.consecutiveMediaVisitCount)} in a row)`),
    createMetricRow('mediaPlayback', formatDuration(metrics.mediaPlaybackMs)),
    createMetricRow('mediaEvents', `${formatCount(metrics.mediaPlayEvents)} / ${formatCount(metrics.mediaSourceChangeEvents)} / ${formatCount(metrics.mediaEndEvents)}`),
    createMetricRow('passiveRegions', `${formatCount(metrics.recommendationRegionCount)} rec / ${formatCount(metrics.commentSectionCount)} comments / ${formatCount(metrics.shortFormMediaCount)} short`),
    createMetricRow('passiveScrollClickPressure', formatPercent(metrics.passiveInteractionLoad)),
    createMetricRow('activeInputLoad', `${formatPercent(metrics.activeInputLoad)} (${formatDuration(metrics.activeInputMs)})`),
    createMetricRow('agencyRatioLowAgencyLoad', `${formatPercent(metrics.agencyRatio)} / ${formatPercent(metrics.lowAgencyLoad)}`),
    createMetricRow('interactionVelocityLoad', formatPercent(metrics.interactionVelocityLoad)),
    createMetricRow('scrollClickVelocity', `${formatRate(metrics.scrollRatePerMinute)} / ${formatRate(metrics.clickRatePerMinute)}`),
    createMetricRow('scrollMovement', `${formatCount(metrics.scrollDirectionChanges)} reversals / ${Number(metrics.scrollDistanceViewportUnits || 0).toFixed(1)} screens`),
    createMetricRow('dynamicScrollAppends', `${formatPercent(metrics.dynamicContentLoad)} (${formatCount(metrics.scrollLinkedContentBatches)} batches / ${formatCount(metrics.scrollLinkedAddedElements)} elements)`),
    createMetricRow('recommendationFeedClickLoad', formatPercent(metrics.recommenderClickLoad)),
    createMetricRow('recommendationFeedClicks', `${formatCount(metrics.recommenderClickEvents)} (${formatCount(metrics.recommendationClickEvents)} rec / ${formatCount(metrics.feedClickEvents)} feed / ${formatCount(metrics.commentClickEvents)} comments)`),
    createMetricRow('feedCommentLoad', `${formatPercent(metrics.feedCommentInteractionLoad)} (${formatRate(metrics.feedClickRatePerMinute)} / ${formatRate(metrics.commentClickRatePerMinute)})`),
    createMetricRow('latestTransition', `${metrics.latestTransitionType || '--'}${metrics.latestDirectNavigation ? ` (direct, recovery ${formatPercent(metrics.directNavigationRecovery)})` : ''}`),
    createMetricRow('transitionQualifiers', Array.isArray(metrics.latestTransitionQualifiers) && metrics.latestTransitionQualifiers.length > 0 ? metrics.latestTransitionQualifiers.join(', ') : '--'),
    createMetricRow('redirectTransitionLoad', formatPercent(metrics.redirectTransitionLoad)),
    createMetricRow('redirectTransitions', formatCount(metrics.redirectTransitionCount)),
    createMetricRow('navigationLoopLoad', `${formatPercent(metrics.navigationLoopLoad)} (${formatCount(metrics.samePageRepeatCount)} repeats, ${formatCount(metrics.reloadTransitionCount)} reloads)`),
    createMetricRow('searchLoopLoad', `${formatPercent(metrics.searchRefinementLoad)} (${formatCount(metrics.searchVisitCount)} searches, ${formatCount(metrics.searchQueryShiftCount)} shifts)`),
    createMetricRow('deliberateGapLoad', `${formatPercent(metrics.deliberateStalenessLoad)} (${formatCount(metrics.visitsSinceDeliberateAction)} visits)`),
    createMetricRow('unanchoredOriginDecayLoad', `${formatPercent(metrics.unanchoredSessionLoad)} / ${formatPercent(metrics.originDecayLoad)} (${formatPercent(metrics.recentOriginSimilarity)} recent avg)`),
    createMetricRow('sessionAgeDeliberateGap', `${formatDuration(metrics.sessionAgeMs)} / ${formatDuration(metrics.deliberateGapMs)}`),
    createMetricRow('inputVelocity', formatRate(metrics.inputRatePerMinute)),
    createMetricRow('keyVelocity', formatRate(metrics.keyRatePerMinute)),
    createMetricRow('constructiveDwell', formatPercent(metrics.constructiveDwell)),
    createMetricRow('passiveActiveTimeLoad', formatPercent(metrics.passiveTimeLoad)),
    createMetricRow('latestDwellActive', `${formatDuration(metrics.latestDwellMs)} / ${formatDuration(metrics.latestActiveMs)}`),
    createMetricRow('totalDwellActive', `${formatDuration(metrics.totalDwellMs)} / ${formatDuration(metrics.totalActiveMs)}`),
    createMetricRow('longSessionLoad', formatPercent(metrics.longSessionLoad)),
    createMetricRow('linkDensity', formatPercent(metrics.linkDensity)),
    createMetricRow('domainEntropy', formatPercent(metrics.domainEntropy)),
    createMetricRow('domainChanges', String(metrics.domainChanges ?? 0)),
    createMetricRow('returnRate', formatPercent(metrics.returnRate)),
    createMetricRow('originReturnRate', formatPercent(metrics.originReturnRate)),
    createMetricRow('lowReturnLoad', formatPercent(metrics.lowReturnLoad)),
    createMetricRow('tabsInChain', formatCount(metrics.tabCount)),
    createMetricRow('openTabs', formatCount(metrics.openTabCount)),
    createMetricRow('openWindows', formatCount(metrics.openWindowCount)),
    createMetricRow('openTabPressure', formatPercent(metrics.tabPressureLoad)),
    createMetricRow('recentTabSwitches', formatCount(metrics.tabSwitchCount)),
    createMetricRow('tabSwitchVelocity', formatRate(metrics.tabSwitchRatePerMinute)),
    createMetricRow('tabSwitchLoops', formatCount(metrics.tabSwitchLoopCount)),
    createMetricRow('tabSwitchLoad', formatPercent(metrics.tabSwitchLoad)),
    createMetricRow('childTabBranches', formatCount(metrics.branchCount)),
    createMetricRow('coherentHosts', formatCoherentHosts(session)),
    createMetricRow('driftDescendants', formatCount(metrics.driftDescendantCount)),
    createMetricRow('driftDescendantHosts', formatDriftDescendantHosts(session)),
    createMetricRow('currentIsDriftDescendant', formatIntentBoolean(metrics.latestIsDriftDescendant)),
    createMetricRow('interventionFeedbackEntries', formatCount(feedbackSummary.total ?? feedbackCount)),
    createMetricRow('feedbackContinueReasons', formatCount(feedbackSummary.continueReasonCount)),
    createMetricRow('feedbackReturnRate', formatPercent(feedbackSummary.returnRate)),
    createMetricRow('feedbackIsolateRate', formatPercent(feedbackSummary.isolateRate)),
    createMetricRow('feedbackCoherentMarkRate', formatPercent(feedbackSummary.markCoherentRate)),
    createMetricRow('feedbackContinueRate', formatPercent(feedbackSummary.continueRate)),
    createMetricRow('feedbackDismissRate', formatPercent(feedbackSummary.dismissRate)),
    createMetricRow('feedbackScoreOutcomes', `${Number.isFinite(feedbackSummary.averageCoherenceScore) ? String(feedbackSummary.averageCoherenceScore) : '--'} avg - ${formatCount(feedbackSummary.outcomeTotal)} observed - ${formatPercent(feedbackSummary.outcomeRecoveredRate)} recovered (${formatCount(feedbackSummary.outcomeRecovered)}) - return host ${formatPercent(feedbackSummary.outcomeReturnHostRate)} - delta ${Number.isFinite(feedbackSummary.averageOutcomeScoreDelta) ? formatSignedNumber(feedbackSummary.averageOutcomeScoreDelta) : '--'}`),
    createMetricRow('continueOutcomes', formatContinueOutcomeSummary(feedbackSummary)),
    createMetricRow('calibrationDiagnostic', formatFeedbackRecommendation(feedbackSummary.recommendation)),
    createMetricRow('autoCalibration', formatIntentCalibration(debugState?.intentPolicy?.settings?.calibration)),
    createMetricRow('chainBlock', formatChainBlock(debugState?.intervention?.chainBlock))
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
      ? getMessage('intentDiagnosticsVisitPolicy', 'policy $1', [visit.policy.planNames.join(', ')])
      : (visit.policy?.source ? getMessage('intentDiagnosticsVisitPolicy', 'policy $1', [visit.policy.source]) : '');

    const meta = document.createElement('span');
    meta.textContent = [
      visit.startedAt ? new Date(visit.startedAt).toLocaleTimeString() : '',
      Number.isFinite(Number(visit.tabId)) ? getMessage('intentDiagnosticsVisitTab', 'tab $1', [String(visit.tabId)]) : '',
      Number.isFinite(Number(visit.openerTabId)) ? getMessage('intentDiagnosticsVisitFromTab', 'from tab $1', [String(visit.openerTabId)]) : '',
      visit.driftDescendant ? getMessage('intentDiagnosticsVisitDriftDescendant', 'drift descendant') : '',
      visit.transitionType ? getMessage('intentDiagnosticsVisitTransition', 'transition $1', [visit.transitionType]) : '',
      Array.isArray(visit.transitionQualifiers) && visit.transitionQualifiers.length > 0 ? visit.transitionQualifiers.join(', ') : '',
      getMessage('intentDiagnosticsVisitActive', 'active $1', [formatDuration(visit.activeMs ?? visit.signals?.activity?.activePageMs)]),
      getMessage('intentDiagnosticsVisitDwell', 'dwell $1', [formatDuration(visit.dwellMs ?? visit.signals?.activity?.pageAgeMs)]),
      policyLabel,
      getMessage('intentDiagnosticsVisitOrigin', 'origin $1', [formatPercent(visit.metrics?.originSimilarity)]),
      getMessage('intentDiagnosticsVisitLocal', 'local $1', [formatPercent(visit.metrics?.localSimilarity)])
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
    Number.isFinite(node.tabId) ? getMessage('intentDiagnosticsGraphTab', 'tab $1', [String(node.tabId)]) : '',
    Number.isFinite(node.openerTabId) ? getMessage('intentDiagnosticsGraphFromTab', 'from tab $1', [String(node.openerTabId)]) : '',
    node.transitionType ? getMessage('intentDiagnosticsGraphVia', 'via $1', [node.transitionType]) : '',
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
    item.textContent = getMessage('intentDiagnosticsNoGraphData', 'No graph data yet.');
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
    meta.textContent = getGraphNodeMeta(node) || getMessage('intentDiagnosticsGraphSameTab', 'same tab');

    const badges = document.createElement('div');
    badges.className = 'intent-graph-badges';
    badges.appendChild(createGraphBadge(node.coherenceLabel || getMessage('intentDiagnosticsGraphUncertainBadge', 'uncertain')));
    if (node.isOrigin) badges.appendChild(createGraphBadge(getMessage('intentDiagnosticsGraphOriginBadge', 'origin')));
    if (node.isCurrent) badges.appendChild(createGraphBadge(getMessage('intentDiagnosticsGraphCurrentBadge', 'current')));

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
  getElement('optionsIntentPlan').textContent = getMessage('intentDiagnosticsPolicyValue', 'Policy: $1', [planNames]);
  getElement('optionsIntentAction').textContent = formatIntentActionSummary(decision);
  getElement('optionsIntentOrigin').textContent = getLabel(session.origin);
  getElement('optionsIntentCurrent').textContent = latestVisit
    ? getMessage('intentDiagnosticsCurrentValue', 'Current: $1', [getLabel(latestVisit)])
    : '--';
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
  if (!globalThis.confirm?.(getMessage(
    'clearIntentDiagnosticsConfirm',
    'Clear local intent diagnostics? This removes recent intent trajectory state and intervention feedback stored on this device. Export first if you want a backup.'
  ))) {
    return;
  }

  const clearButton = getElement('clearIntentDiagnosticsButton');
  clearButton.disabled = true;
  try {
    const response = await sendRuntimeMessage({ action: 'clearIntentDebugState' });
    if (response?.status === 'cleared') {
      setEmptyState(getMessage('clearDiagnosticsClearedStatus', 'Cleared.'));
    } else {
      setEmptyState(getMessage('clearIntentDiagnosticsFailed', 'Could not clear intent diagnostics.'));
    }
  } catch (error) {
    console.error('Failed to clear intent diagnostics:', error);
    setEmptyState(getMessage('clearIntentDiagnosticsFailed', 'Could not clear intent diagnostics.'));
  } finally {
    clearButton.disabled = false;
  }
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
