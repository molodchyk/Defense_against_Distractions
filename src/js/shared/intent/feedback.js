// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk


import {
  DEFAULT_INTENT_OPTIONS,
  DEFAULT_INTENT_SETTINGS,
  HELPFUL_INTERVENTION_THRESHOLD_DELTA,
  INTENT_FEEDBACK_ACTIONS,
  INTENT_FEEDBACK_RECOMMENDATIONS,
  MIN_FEEDBACK_ENTRIES_FOR_CALIBRATION,
  TOO_SENSITIVE_THRESHOLD_DELTA
} from './constants.js';
import { normalizeIntentSettings } from './settings.js';
import { clampNumber, normalizeString, normalizeTabId } from './utils.js';

function normalizeIntentFeedbackAction(value) {
  const normalizedValue = normalizeString(value);
  return INTENT_FEEDBACK_ACTIONS.has(normalizedValue) ? normalizedValue : 'dismiss';
}

export function normalizeIntentFeedbackEntry(entry = {}) {
  return {
    id: normalizeString(entry.id),
    recordedAt: normalizeString(entry.recordedAt),
    action: normalizeIntentFeedbackAction(entry.action),
    interventionId: normalizeString(entry.interventionId).slice(0, 180) || null,
    sessionId: normalizeString(entry.sessionId).slice(0, 120) || null,
    visitId: normalizeString(entry.visitId).slice(0, 120) || null,
    tabId: normalizeTabId(entry.tabId),
    riskState: normalizeString(entry.riskState).slice(0, 32) || null,
    coherenceScore: clampNumber(entry.coherenceScore, null, 0, 100),
    policyAction: normalizeString(entry.policyAction).slice(0, 32) || null,
    currentHostname: normalizeString(entry.currentHostname).slice(0, 120) || null,
    recoveryHostname: normalizeString(entry.recoveryHostname).slice(0, 120) || null
  };
}

export function normalizeIntentFeedback(feedback = [], maxEntries = DEFAULT_INTENT_OPTIONS.maxFeedbackEntries) {
  return Array.isArray(feedback)
    ? feedback
      .map(normalizeIntentFeedbackEntry)
      .filter(entry => entry.id && entry.recordedAt)
      .slice(-maxEntries)
    : [];
}

function createEmptyFeedbackSummary() {
  return {
    total: 0,
    counts: {
      acknowledge: 0,
      continue: 0,
      isolate: 0,
      return: 0,
      dismiss: 0
    },
    returnRate: 0,
    isolateRate: 0,
    continueRate: 0,
    dismissRate: 0,
    averageCoherenceScore: null,
    recommendation: INTENT_FEEDBACK_RECOMMENDATIONS.INSUFFICIENT_DATA
  };
}

export function summarizeIntentFeedback(feedback = [], options = {}) {
  const entries = normalizeIntentFeedback(feedback, options.maxFeedbackEntries);
  if (entries.length === 0) {
    return createEmptyFeedbackSummary();
  }

  const counts = entries.reduce((result, entry) => {
    result[entry.action] = (result[entry.action] || 0) + 1;
    return result;
  }, {
    acknowledge: 0,
    continue: 0,
    isolate: 0,
    return: 0,
    dismiss: 0
  });
  const scoredEntries = entries.filter(entry => Number.isFinite(entry.coherenceScore));
  const averageCoherenceScore = scoredEntries.length > 0
    ? Math.round(scoredEntries.reduce((sum, entry) => sum + entry.coherenceScore, 0) / scoredEntries.length)
    : null;
  const total = entries.length;
  const returnRate = Number((counts.return / total).toFixed(3));
  const isolateRate = Number((counts.isolate / total).toFixed(3));
  const continueRate = Number(((counts.continue + counts.acknowledge) / total).toFixed(3));
  const dismissRate = Number((counts.dismiss / total).toFixed(3));
  let recommendation = INTENT_FEEDBACK_RECOMMENDATIONS.INSUFFICIENT_DATA;

  if (total >= 5 && returnRate >= 0.5) {
    recommendation = INTENT_FEEDBACK_RECOMMENDATIONS.INTERVENTIONS_HELPFUL;
  } else if (total >= 5 && isolateRate + continueRate >= 0.7) {
    recommendation = INTENT_FEEDBACK_RECOMMENDATIONS.TOO_SENSITIVE;
  } else if (total >= 5) {
    recommendation = INTENT_FEEDBACK_RECOMMENDATIONS.MIXED;
  }

  return {
    total,
    counts,
    returnRate,
    isolateRate,
    continueRate,
    dismissRate,
    averageCoherenceScore,
    recommendation
  };
}

function createIntentCalibrationResult(settings, summary, overrides = {}) {
  const normalizedSettings = normalizeIntentSettings(settings);
  const normalizedSummary = summary && typeof summary === 'object'
    ? summary
    : createEmptyFeedbackSummary();
  const thresholdDelta = Number(overrides.thresholdDelta || 0);
  const effectiveInterventionThreshold = clampNumber(
    normalizedSettings.interventionThreshold + thresholdDelta,
    normalizedSettings.interventionThreshold,
    normalizedSettings.lockedThreshold + 1,
    99
  );
  const appliedDelta = effectiveInterventionThreshold - normalizedSettings.interventionThreshold;

  return {
    enabled: normalizedSettings.autoCalibration,
    applied: appliedDelta !== 0,
    reason: overrides.reason || 'No calibration adjustment applied',
    recommendation: normalizedSummary.recommendation || INTENT_FEEDBACK_RECOMMENDATIONS.INSUFFICIENT_DATA,
    feedbackTotal: Number(normalizedSummary.total || 0),
    thresholdDelta: appliedDelta,
    baselineInterventionThreshold: normalizedSettings.interventionThreshold,
    effectiveInterventionThreshold,
    lockedThreshold: normalizedSettings.lockedThreshold
  };
}

export function deriveIntentFeedbackCalibration(feedbackSummary = {}, settings = DEFAULT_INTENT_SETTINGS) {
  const normalizedSettings = normalizeIntentSettings(settings);
  const normalizedSummary = feedbackSummary && typeof feedbackSummary === 'object'
    ? feedbackSummary
    : createEmptyFeedbackSummary();
  const feedbackTotal = Number(normalizedSummary.total || 0);

  if (!normalizedSettings.autoCalibration) {
    return createIntentCalibrationResult(normalizedSettings, normalizedSummary, {
      reason: 'Auto calibration disabled'
    });
  }

  if (feedbackTotal < MIN_FEEDBACK_ENTRIES_FOR_CALIBRATION) {
    return createIntentCalibrationResult(normalizedSettings, normalizedSummary, {
      reason: `Needs ${MIN_FEEDBACK_ENTRIES_FOR_CALIBRATION} feedback entries before calibration`
    });
  }

  if (normalizedSummary.recommendation === INTENT_FEEDBACK_RECOMMENDATIONS.INTERVENTIONS_HELPFUL) {
    return createIntentCalibrationResult(normalizedSettings, normalizedSummary, {
      thresholdDelta: HELPFUL_INTERVENTION_THRESHOLD_DELTA,
      reason: 'Return feedback suggests earlier interventions are helpful'
    });
  }

  if (normalizedSummary.recommendation === INTENT_FEEDBACK_RECOMMENDATIONS.TOO_SENSITIVE) {
    return createIntentCalibrationResult(normalizedSettings, normalizedSummary, {
      thresholdDelta: TOO_SENSITIVE_THRESHOLD_DELTA,
      reason: 'Continue/isolate feedback suggests interventions are too sensitive'
    });
  }

  return createIntentCalibrationResult(normalizedSettings, normalizedSummary, {
    reason: 'Feedback is mixed; keeping configured thresholds'
  });
}

export function applyIntentFeedbackCalibration(settings = DEFAULT_INTENT_SETTINGS, feedbackSummary = {}) {
  const normalizedSettings = normalizeIntentSettings(settings);
  const calibration = deriveIntentFeedbackCalibration(feedbackSummary, normalizedSettings);
  const calibratedSettings = normalizeIntentSettings({
    ...normalizedSettings,
    interventionThreshold: calibration.effectiveInterventionThreshold
  });

  return {
    ...calibratedSettings,
    calibration
  };
}