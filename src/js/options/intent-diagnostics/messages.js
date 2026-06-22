// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { getUiMessage } from '../../shared/ui/uiLanguage.js';
import { formatSignedNumber } from './format.js';

const INTENT_DIAGNOSTIC_METRIC_LABELS = {
  originSimilarityAnchor: ['intentDiagnosticsMetricOriginSimilarityAnchor', 'Origin similarity / anchor'],
  localSimilarity: ['intentDiagnosticsMetricLocalSimilarity', 'Local similarity'],
  textOriginSimilarity: ['intentDiagnosticsMetricTextOriginSimilarity', 'Text origin similarity'],
  passiveMediaLoad: ['intentDiagnosticsMetricPassiveMediaLoad', 'Passive media load'],
  mediaPlaybackChainLoad: ['intentDiagnosticsMetricMediaPlaybackChainLoad', 'Media playback / chain load'],
  mediaPlayback: ['intentDiagnosticsMetricMediaPlayback', 'Media playback'],
  mediaEvents: ['intentDiagnosticsMetricMediaEvents', 'Media play/change/end events'],
  passiveRegions: ['intentDiagnosticsMetricPassiveRegions', 'Passive regions'],
  passiveScrollClickPressure: ['intentDiagnosticsMetricPassiveScrollClickPressure', 'Passive scroll/click pressure'],
  activeInputLoad: ['intentDiagnosticsMetricActiveInputLoad', 'Active input load'],
  agencyRatioLowAgencyLoad: ['intentDiagnosticsMetricAgencyRatioLowAgencyLoad', 'Agency ratio / low-agency load'],
  interactionVelocityLoad: ['intentDiagnosticsMetricInteractionVelocityLoad', 'Interaction velocity load'],
  scrollClickVelocity: ['intentDiagnosticsMetricScrollClickVelocity', 'Scroll/click velocity'],
  scrollMovement: ['intentDiagnosticsMetricScrollMovement', 'Scroll movement'],
  dynamicScrollAppends: ['intentDiagnosticsMetricDynamicScrollAppends', 'Dynamic scroll appends'],
  recommendationFeedClickLoad: ['intentDiagnosticsMetricRecommendationFeedClickLoad', 'Recommendation/feed click load'],
  recommendationFeedClicks: ['intentDiagnosticsMetricRecommendationFeedClicks', 'Recommendation/feed clicks'],
  feedCommentLoad: ['intentDiagnosticsMetricFeedCommentLoad', 'Feed/comment load'],
  latestTransition: ['intentDiagnosticsMetricLatestTransition', 'Latest transition'],
  transitionQualifiers: ['intentDiagnosticsMetricTransitionQualifiers', 'Transition qualifiers'],
  redirectTransitionLoad: ['intentDiagnosticsMetricRedirectTransitionLoad', 'Redirect transition load'],
  redirectTransitions: ['intentDiagnosticsMetricRedirectTransitions', 'Redirect transitions'],
  navigationLoopLoad: ['intentDiagnosticsMetricNavigationLoopLoad', 'Navigation loop load'],
  searchLoopLoad: ['intentDiagnosticsMetricSearchLoopLoad', 'Search loop load'],
  deliberateGapLoad: ['intentDiagnosticsMetricDeliberateGapLoad', 'Deliberate gap load'],
  unanchoredOriginDecayLoad: ['intentDiagnosticsMetricUnanchoredOriginDecayLoad', 'Unanchored / origin decay load'],
  sessionAgeDeliberateGap: ['intentDiagnosticsMetricSessionAgeDeliberateGap', 'Session age / deliberate gap'],
  inputVelocity: ['intentDiagnosticsMetricInputVelocity', 'Input velocity'],
  keyVelocity: ['intentDiagnosticsMetricKeyVelocity', 'Key velocity'],
  constructiveDwell: ['intentDiagnosticsMetricConstructiveDwell', 'Constructive dwell'],
  passiveActiveTimeLoad: ['intentDiagnosticsMetricPassiveActiveTimeLoad', 'Passive active-time load'],
  latestDwellActive: ['intentDiagnosticsMetricLatestDwellActive', 'Latest dwell / active'],
  totalDwellActive: ['intentDiagnosticsMetricTotalDwellActive', 'Total dwell / active'],
  longSessionLoad: ['intentDiagnosticsMetricLongSessionLoad', 'Long-session load'],
  linkDensity: ['intentDiagnosticsMetricLinkDensity', 'Link density'],
  domainEntropy: ['intentDiagnosticsMetricDomainEntropy', 'Domain entropy'],
  domainChanges: ['intentDiagnosticsMetricDomainChanges', 'Domain changes'],
  returnRate: ['intentDiagnosticsMetricReturnRate', 'Return rate'],
  originReturnRate: ['intentDiagnosticsMetricOriginReturnRate', 'Origin return rate'],
  lowReturnLoad: ['intentDiagnosticsMetricLowReturnLoad', 'Low-return load'],
  tabsInChain: ['intentDiagnosticsMetricTabsInChain', 'Tabs in chain'],
  openTabs: ['intentDiagnosticsMetricOpenTabs', 'Open tabs'],
  openWindows: ['intentDiagnosticsMetricOpenWindows', 'Open windows'],
  openTabPressure: ['intentDiagnosticsMetricOpenTabPressure', 'Open-tab pressure'],
  recentTabSwitches: ['intentDiagnosticsMetricRecentTabSwitches', 'Recent tab switches'],
  tabSwitchVelocity: ['intentDiagnosticsMetricTabSwitchVelocity', 'Tab-switch velocity'],
  tabSwitchLoops: ['intentDiagnosticsMetricTabSwitchLoops', 'Tab-switch loops'],
  tabSwitchLoad: ['intentDiagnosticsMetricTabSwitchLoad', 'Tab-switch load'],
  childTabBranches: ['intentDiagnosticsMetricChildTabBranches', 'Child-tab branches'],
  coherentHosts: ['intentDiagnosticsMetricCoherentHosts', 'Coherent hosts'],
  driftDescendants: ['intentDiagnosticsMetricDriftDescendants', 'Drift descendants'],
  driftDescendantHosts: ['intentDiagnosticsMetricDriftDescendantHosts', 'Drift descendant hosts'],
  currentIsDriftDescendant: ['intentDiagnosticsMetricCurrentIsDriftDescendant', 'Current is drift descendant'],
  interventionFeedbackEntries: ['intentDiagnosticsMetricInterventionFeedbackEntries', 'Intervention feedback entries'],
  feedbackContinueReasons: ['intentDiagnosticsMetricFeedbackContinueReasons', 'Feedback continue reasons'],
  feedbackReturnRate: ['intentDiagnosticsMetricFeedbackReturnRate', 'Feedback return rate'],
  feedbackIsolateRate: ['intentDiagnosticsMetricFeedbackIsolateRate', 'Feedback isolate rate'],
  feedbackCoherentMarkRate: ['intentDiagnosticsMetricFeedbackCoherentMarkRate', 'Feedback coherent mark rate'],
  feedbackContinueRate: ['intentDiagnosticsMetricFeedbackContinueRate', 'Feedback continue rate'],
  feedbackDismissRate: ['intentDiagnosticsMetricFeedbackDismissRate', 'Feedback dismiss rate'],
  feedbackScoreOutcomes: ['intentDiagnosticsMetricFeedbackScoreOutcomes', 'Feedback score / outcomes'],
  continueOutcomes: ['intentDiagnosticsMetricContinueOutcomes', 'Continue outcomes'],
  calibrationDiagnostic: ['intentDiagnosticsMetricCalibrationDiagnostic', 'Calibration diagnostic'],
  autoCalibration: ['intentDiagnosticsMetricAutoCalibration', 'Auto calibration'],
  chainBlock: ['intentDiagnosticsMetricChainBlock', 'Chain block']
};

export function getIntentDiagnosticMessage(key, fallback, substitutions) {
  return getUiMessage(key, fallback, substitutions);
}

function getMetricLabel(labelId) {
  const [messageKey, fallback] = INTENT_DIAGNOSTIC_METRIC_LABELS[labelId] || [];
  return getIntentDiagnosticMessage(messageKey, fallback || labelId);
}

export function createMetricRow(labelId, value) {
  return [getMetricLabel(labelId), value];
}

export function formatIntentBoolean(value) {
  return value
    ? getIntentDiagnosticMessage('intentDiagnosticsBooleanYes', 'yes')
    : getIntentDiagnosticMessage('intentDiagnosticsBooleanNo', 'no');
}

export function formatIntentActionSummary(decision = {}) {
  if (!decision.settings) {
    return '--';
  }

  const actionParts = [
    decision.action || '--',
    getIntentDiagnosticMessage('intentDiagnosticsActionInterveneThreshold', 'intervene <= $1', [
      String(decision.settings.interventionThreshold)
    ]),
    getIntentDiagnosticMessage('intentDiagnosticsActionLockedThreshold', 'locked <= $1', [
      String(decision.settings.lockedThreshold)
    ]),
    getIntentDiagnosticMessage('intentDiagnosticsActionRetentionDays', 'retain $1d', [
      String(decision.settings.diagnosticsRetentionDays)
    ])
  ];

  if (decision.settings.calibration?.applied) {
    actionParts.push(getIntentDiagnosticMessage('intentDiagnosticsActionCalibrated', 'calibrated $1', [
      formatSignedNumber(decision.settings.calibration.thresholdDelta)
    ]));
  }

  if (decision.chainBlock?.active) {
    actionParts.push(getIntentDiagnosticMessage('intentDiagnosticsActionChainQuarantine', 'chain quarantine'));
  }

  if (decision.settings.autoCloseQuarantinedTab) {
    actionParts.push(getIntentDiagnosticMessage('intentDiagnosticsActionAutoCloseCurrentTab', 'auto-close current tab'));
  }

  return actionParts.join(' · ');
}
