// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  getIntentCoherentHostSummary,
  getIntentDriftDescendantHostSummary
} from '../../shared/intentCoherence.js';

export function formatPercent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${Math.round(number * 100)}%` : '--';
}

export function formatCount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : '0';
}

export function formatDuration(value) {
  const totalSeconds = Math.max(0, Math.round(Number(value || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

export function formatRate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(number >= 10 ? 1 : 2)}/min` : '--';
}

export function formatFeedbackRecommendation(value) {
  const labels = {
    insufficientData: 'insufficient data',
    interventionsHelpful: 'interventions helpful',
    tooSensitive: 'possibly too sensitive',
    mixed: 'mixed'
  };
  return labels[value] || '--';
}

export function formatSignedNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number === 0) {
    return '0';
  }

  return number > 0 ? `+${number}` : String(number);
}

export function formatIntentCalibration(calibration = null) {
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
  const adjustmentText = `${calibration.applied ? formatSignedNumber(delta) : '0'} (${thresholdText})`;
  const actionText = calibration.actionEscalated ? ` - action ${calibration.baselineAction || '--'} -> ${calibration.effectiveAction || '--'}` : '';

  return `${adjustmentText}${actionText} - ${calibration.reason || 'no adjustment'}`;
}

export function formatChainBlock(chainBlock = null) {
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

export function formatLineageSummary(metrics = {}) {
  const tabCount = Number(metrics.tabCount || 0);
  const branchCount = Number(metrics.branchCount || 0);
  return `${tabCount} tab${tabCount === 1 ? '' : 's'} / ${branchCount} branch${branchCount === 1 ? '' : 'es'}`;
}

export function formatLineageDetail(metrics = {}) {
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

export function formatDriftDescendantHosts(session = {}) {
  const hosts = getIntentDriftDescendantHostSummary(session);
  if (hosts.length === 0) {
    return 'none';
  }

  return hosts.map(({ hostname, count }) => `${hostname} (${count})`).join(' - ');
}

export function formatCoherentHosts(session = {}) {
  const hosts = getIntentCoherentHostSummary(session);
  if (hosts.length === 0) {
    return 'none';
  }

  return hosts.map(({ hostname, count }) => `${hostname} (${count})`).join(' - ');
}

export function formatContinueOutcomeSummary(feedbackSummary = {}) {
  const averageDelta = Number.isFinite(feedbackSummary.averageContinueOutcomeScoreDelta)
    ? formatSignedNumber(feedbackSummary.averageContinueOutcomeScoreDelta)
    : '--';
  return `${formatCount(feedbackSummary.continueOutcomeTotal)} observed - ${formatPercent(feedbackSummary.continueOutcomeRecoveredRate)} recovered (${formatCount(feedbackSummary.continueOutcomeRecovered)}) - drift after Continue ${formatPercent(feedbackSummary.continueOutcomeUnrecoveredRate)} - delta ${averageDelta}`;
}
