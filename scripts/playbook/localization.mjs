// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export const usageStatsLocalizedMessageKeys = [
  'usageStatsLocalAggregatesStatus',
  'usageStatsBlockedShareValue',
  'usageStatsDomainVisitsMeta',
  'usageStatsDomainActiveMeta',
  'usageStatsDomainBlockedActiveShareMeta',
  'usageStatsDomainBlockedVisitsMeta',
  'usageStatsDomainBlockedActiveMeta',
  'usageStatsDomainBlockedWordsMeta',
  'usageStatsDomainAllowedVisitsMeta',
  'usageStatsDomainAllowedWordsMeta',
  'usageStatsDomainTabsMaxMeta',
  'usageStatsDomainVideosMeta',
  'usageStatsDomainAudioMeta',
  'usageStatsDomainAudibleMeta',
  'usageStatsDomainGifsMeta',
  'usageStatsDomainLinksMeta'
];

export const intentDiagnosticsLocalizedMessageKeys = [
  'intentDiagnosticsNoScoreReasons',
  'intentDiagnosticsNoGraphData',
  'intentDiagnosticsPolicyValue',
  'intentDiagnosticsCurrentValue',
  'intentDiagnosticsActionInterveneThreshold',
  'intentDiagnosticsActionLockedThreshold',
  'intentDiagnosticsActionRetentionDays',
  'intentDiagnosticsActionCalibrated',
  'intentDiagnosticsActionChainQuarantine',
  'intentDiagnosticsActionAutoCloseCurrentTab',
  'intentDiagnosticsVisitPolicy',
  'intentDiagnosticsVisitTab',
  'intentDiagnosticsVisitFromTab',
  'intentDiagnosticsVisitDriftDescendant',
  'intentDiagnosticsVisitTransition',
  'intentDiagnosticsVisitActive',
  'intentDiagnosticsVisitDwell',
  'intentDiagnosticsVisitOrigin',
  'intentDiagnosticsVisitLocal',
  'intentDiagnosticsGraphTab',
  'intentDiagnosticsGraphFromTab',
  'intentDiagnosticsGraphVia',
  'intentDiagnosticsGraphSameTab',
  'intentDiagnosticsGraphOriginBadge',
  'intentDiagnosticsGraphCurrentBadge',
  'intentDiagnosticsGraphUncertainBadge',
  'intentDiagnosticsBooleanYes',
  'intentDiagnosticsBooleanNo',
  'intentDiagnosticsMetricOriginSimilarityAnchor',
  'intentDiagnosticsMetricLocalSimilarity',
  'intentDiagnosticsMetricTextOriginSimilarity',
  'intentDiagnosticsMetricPassiveMediaLoad',
  'intentDiagnosticsMetricMediaPlaybackChainLoad',
  'intentDiagnosticsMetricMediaPlayback',
  'intentDiagnosticsMetricMediaEvents',
  'intentDiagnosticsMetricPassiveRegions',
  'intentDiagnosticsMetricPassiveScrollClickPressure',
  'intentDiagnosticsMetricActiveInputLoad',
  'intentDiagnosticsMetricAgencyRatioLowAgencyLoad',
  'intentDiagnosticsMetricInteractionVelocityLoad',
  'intentDiagnosticsMetricScrollClickVelocity',
  'intentDiagnosticsMetricScrollMovement',
  'intentDiagnosticsMetricDynamicScrollAppends',
  'intentDiagnosticsMetricRecommendationFeedClickLoad',
  'intentDiagnosticsMetricRecommendationFeedClicks',
  'intentDiagnosticsMetricFeedCommentLoad',
  'intentDiagnosticsMetricLatestTransition',
  'intentDiagnosticsMetricTransitionQualifiers',
  'intentDiagnosticsMetricRedirectTransitionLoad',
  'intentDiagnosticsMetricRedirectTransitions',
  'intentDiagnosticsMetricNavigationLoopLoad',
  'intentDiagnosticsMetricSearchLoopLoad',
  'intentDiagnosticsMetricDeliberateGapLoad',
  'intentDiagnosticsMetricUnanchoredOriginDecayLoad',
  'intentDiagnosticsMetricSessionAgeDeliberateGap',
  'intentDiagnosticsMetricInputVelocity',
  'intentDiagnosticsMetricKeyVelocity',
  'intentDiagnosticsMetricConstructiveDwell',
  'intentDiagnosticsMetricPassiveActiveTimeLoad',
  'intentDiagnosticsMetricLatestDwellActive',
  'intentDiagnosticsMetricTotalDwellActive',
  'intentDiagnosticsMetricLongSessionLoad',
  'intentDiagnosticsMetricLinkDensity',
  'intentDiagnosticsMetricDomainEntropy',
  'intentDiagnosticsMetricDomainChanges',
  'intentDiagnosticsMetricReturnRate',
  'intentDiagnosticsMetricOriginReturnRate',
  'intentDiagnosticsMetricLowReturnLoad',
  'intentDiagnosticsMetricTabsInChain',
  'intentDiagnosticsMetricOpenTabs',
  'intentDiagnosticsMetricOpenWindows',
  'intentDiagnosticsMetricOpenTabPressure',
  'intentDiagnosticsMetricRecentTabSwitches',
  'intentDiagnosticsMetricTabSwitchVelocity',
  'intentDiagnosticsMetricTabSwitchLoops',
  'intentDiagnosticsMetricTabSwitchLoad',
  'intentDiagnosticsMetricChildTabBranches',
  'intentDiagnosticsMetricCoherentHosts',
  'intentDiagnosticsMetricDriftDescendants',
  'intentDiagnosticsMetricDriftDescendantHosts',
  'intentDiagnosticsMetricCurrentIsDriftDescendant',
  'intentDiagnosticsMetricInterventionFeedbackEntries',
  'intentDiagnosticsMetricFeedbackContinueReasons',
  'intentDiagnosticsMetricFeedbackReturnRate',
  'intentDiagnosticsMetricFeedbackIsolateRate',
  'intentDiagnosticsMetricFeedbackCoherentMarkRate',
  'intentDiagnosticsMetricFeedbackContinueRate',
  'intentDiagnosticsMetricFeedbackDismissRate',
  'intentDiagnosticsMetricFeedbackScoreOutcomes',
  'intentDiagnosticsMetricContinueOutcomes',
  'intentDiagnosticsMetricCalibrationDiagnostic',
  'intentDiagnosticsMetricAutoCalibration',
  'intentDiagnosticsMetricChainBlock'
];

export function getUsageStatsLocalizationFailures({ englishMessages, usageStatsModule }) {
  const missingMessages = usageStatsLocalizedMessageKeys
    .filter(key => !englishMessages[key]?.message);
  const missingModuleReferences = usageStatsLocalizedMessageKeys
    .filter(key => !usageStatsModule.includes(key));
  const missingValuePlaceholder = usageStatsLocalizedMessageKeys
    .filter(key => !/\$1/.test(englishMessages[key]?.message || ''));
  const failures = [];

  if (
    missingMessages.length > 0
    || missingModuleReferences.length > 0
    || missingValuePlaceholder.length > 0
    || !/\$2/.test(englishMessages.usageStatsBlockedShareValue?.message || '')
    || !/function formatUsageMetric/.test(usageStatsModule)
    || /`\$\{formatCount\(domain\.visits\)\} visits`/.test(usageStatsModule)
    || /`Local aggregates · \$\{summary\.retentionDays \|\| 14\}d retention`/.test(usageStatsModule)
    || /'0% active \/ 0% visits'/.test(usageStatsModule)
  ) {
    failures.push(
      'Options usage stats dynamic labels must use localized messages, including domain metadata, retention status, and blocked-share ratios.'
    );
  }

  return failures;
}

export function getIntentDiagnosticsLocalizationFailures({ englishMessages, intentDiagnosticsModule }) {
  const missingMessages = intentDiagnosticsLocalizedMessageKeys
    .filter(key => !englishMessages[key]?.message);
  const missingModuleReferences = intentDiagnosticsLocalizedMessageKeys
    .filter(key => !intentDiagnosticsModule.includes(key));
  const placeholderMessageKeys = [
    'intentDiagnosticsPolicyValue',
    'intentDiagnosticsCurrentValue',
    'intentDiagnosticsActionInterveneThreshold',
    'intentDiagnosticsActionLockedThreshold',
    'intentDiagnosticsActionRetentionDays',
    'intentDiagnosticsActionCalibrated',
    'intentDiagnosticsVisitPolicy',
    'intentDiagnosticsVisitTab',
    'intentDiagnosticsVisitFromTab',
    'intentDiagnosticsVisitTransition',
    'intentDiagnosticsVisitActive',
    'intentDiagnosticsVisitDwell',
    'intentDiagnosticsVisitOrigin',
    'intentDiagnosticsVisitLocal',
    'intentDiagnosticsGraphTab',
    'intentDiagnosticsGraphFromTab',
    'intentDiagnosticsGraphVia'
  ];
  const missingValuePlaceholder = placeholderMessageKeys
    .filter(key => !/\$1/.test(englishMessages[key]?.message || ''));
  const failures = [];

  if (
    missingMessages.length > 0
    || missingModuleReferences.length > 0
    || missingValuePlaceholder.length > 0
    || !/function getMetricLabel/.test(intentDiagnosticsModule)
    || !/function formatIntentActionSummary/.test(intentDiagnosticsModule)
    || !/function formatIntentBoolean/.test(intentDiagnosticsModule)
    || /item\.textContent = 'No graph data yet\.'/.test(intentDiagnosticsModule)
    || /\['No score reasons yet\.'\]/.test(intentDiagnosticsModule)
    || /`Policy: \$\{planNames\}`/.test(intentDiagnosticsModule)
    || /`Current: \$\{getLabel\(latestVisit\)\}`/.test(intentDiagnosticsModule)
    || /metrics\.latestIsDriftDescendant \? 'yes' : 'no'/.test(intentDiagnosticsModule)
  ) {
    failures.push(
      'Options intent diagnostics dynamic labels must use localized messages for summary, graph, visit metadata, booleans, action details, and metric names.'
    );
  }

  return failures;
}
