// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk


import {
  DEFAULT_INTENT_OPTIONS,
  DEFAULT_INTENT_SETTINGS,
  HELPFUL_INTERVENTION_THRESHOLD_DELTA,
  INTENT_FEEDBACK_ACTIONS,
  INTENT_FEEDBACK_RECOMMENDATIONS,
  MAX_INTENT_CONTINUE_REASON_LENGTH,
  MIN_FEEDBACK_ENTRIES_FOR_CALIBRATION,
  TOO_SENSITIVE_THRESHOLD_DELTA
} from './constants.js';
import {
  annotateIntentFeedbackOutcome,
  normalizeIntentFeedbackOutcome
} from './feedback/outcomes.js';
import { getNextStricterIntentAction, normalizeIntentSettings } from './settings.js';
import { clampNumber, normalizeString, normalizeTabId } from './utils.js';

const MIN_OUTCOME_ENTRIES_FOR_ESCALATION = 3;
const MAX_RECOVERY_RATE_FOR_OUTCOME_ESCALATION = 0.25;

function normalizeIntentFeedbackAction(value) {
  const normalizedValue = normalizeString(value);
  return INTENT_FEEDBACK_ACTIONS.has(normalizedValue) ? normalizedValue : 'dismiss';
}

export function normalizeIntentFeedbackReason(value) {
  return normalizeString(value)
    .replace(/\s+/g, ' ')
    .slice(0, MAX_INTENT_CONTINUE_REASON_LENGTH);
}

export function normalizeIntentFeedbackEntry(entry = {}) {
  const action = normalizeIntentFeedbackAction(entry.action);
  return {
    id: normalizeString(entry.id),
    recordedAt: normalizeString(entry.recordedAt),
    action,
    reason: action === 'continue' ? normalizeIntentFeedbackReason(entry.reason) : '',
    interventionId: normalizeString(entry.interventionId).slice(0, 180) || null,
    sessionId: normalizeString(entry.sessionId).slice(0, 120) || null,
    visitId: normalizeString(entry.visitId).slice(0, 120) || null,
    tabId: normalizeTabId(entry.tabId),
    riskState: normalizeString(entry.riskState).slice(0, 32) || null,
    coherenceScore: clampNumber(entry.coherenceScore, null, 0, 100),
    policyAction: normalizeString(entry.policyAction).slice(0, 32) || null,
    currentHostname: normalizeString(entry.currentHostname).slice(0, 120) || null,
    recoveryHostname: normalizeString(entry.recoveryHostname).slice(0, 120) || null,
    outcome: normalizeIntentFeedbackOutcome(entry.outcome)
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
      markCoherent: 0,
      return: 0,
      dismiss: 0
    },
    continueReasonCount: 0,
    returnRate: 0,
    isolateRate: 0,
    markCoherentRate: 0,
    continueRate: 0,
    dismissRate: 0,
    averageCoherenceScore: null,
    outcomeTotal: 0,
    outcomeRecovered: 0,
    outcomeRecoveredRate: 0,
    outcomeReturnHostRate: 0,
    averageOutcomeScoreDelta: null,
    continueOutcomeTotal: 0,
    continueOutcomeRecovered: 0,
    continueOutcomeRecoveredRate: 0,
    continueOutcomeUnrecoveredRate: 0,
    averageContinueOutcomeScoreDelta: null,
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
    markCoherent: 0,
    return: 0,
    dismiss: 0
  });
  const scoredEntries = entries.filter(entry => Number.isFinite(entry.coherenceScore));
  const outcomeEntries = entries.filter(entry => entry.outcome);
  const outcomeDeltaEntries = outcomeEntries.filter(entry => Number.isFinite(entry.outcome.scoreDelta));
  const continueOutcomeEntries = outcomeEntries.filter(entry => entry.action === 'continue');
  const continueOutcomeDeltaEntries = continueOutcomeEntries.filter(entry => Number.isFinite(entry.outcome.scoreDelta));
  const continueReasonCount = entries.filter(entry => entry.action === 'continue' && entry.reason).length;
  const averageCoherenceScore = scoredEntries.length > 0
    ? Math.round(scoredEntries.reduce((sum, entry) => sum + entry.coherenceScore, 0) / scoredEntries.length)
    : null;
  const averageOutcomeScoreDelta = outcomeDeltaEntries.length > 0
    ? Math.round(outcomeDeltaEntries.reduce((sum, entry) => sum + entry.outcome.scoreDelta, 0) / outcomeDeltaEntries.length)
    : null;
  const averageContinueOutcomeScoreDelta = continueOutcomeDeltaEntries.length > 0
    ? Math.round(continueOutcomeDeltaEntries.reduce((sum, entry) => sum + entry.outcome.scoreDelta, 0) / continueOutcomeDeltaEntries.length)
    : null;
  const total = entries.length;
  const outcomeTotal = outcomeEntries.length;
  const outcomeRecovered = outcomeEntries.filter(entry => entry.outcome.recovered).length;
  const continueOutcomeTotal = continueOutcomeEntries.length;
  const continueOutcomeRecovered = continueOutcomeEntries.filter(entry => entry.outcome.recovered).length;
  const returnRate = Number((counts.return / total).toFixed(3));
  const isolateRate = Number((counts.isolate / total).toFixed(3));
  const markCoherentRate = Number((counts.markCoherent / total).toFixed(3));
  const continueRate = Number(((counts.continue + counts.acknowledge) / total).toFixed(3));
  const dismissRate = Number((counts.dismiss / total).toFixed(3));
  const outcomeRecoveredRate = outcomeTotal > 0
    ? Number((outcomeRecovered / outcomeTotal).toFixed(3))
    : 0;
  const outcomeReturnHostRate = outcomeTotal > 0
    ? Number((outcomeEntries.filter(entry => entry.outcome.returnedToRecoveryHost).length / outcomeTotal).toFixed(3))
    : 0;
  const continueOutcomeRecoveredRate = continueOutcomeTotal > 0
    ? Number((continueOutcomeRecovered / continueOutcomeTotal).toFixed(3))
    : 0;
  const continueOutcomeUnrecoveredRate = continueOutcomeTotal > 0
    ? Number(((continueOutcomeTotal - continueOutcomeRecovered) / continueOutcomeTotal).toFixed(3))
    : 0;
  let recommendation = INTENT_FEEDBACK_RECOMMENDATIONS.INSUFFICIENT_DATA;

  if (total >= 5 && returnRate >= 0.5) {
    recommendation = INTENT_FEEDBACK_RECOMMENDATIONS.INTERVENTIONS_HELPFUL;
  } else if (total >= 5 && isolateRate + markCoherentRate + continueRate >= 0.7) {
    recommendation = INTENT_FEEDBACK_RECOMMENDATIONS.TOO_SENSITIVE;
  } else if (total >= 5) {
    recommendation = INTENT_FEEDBACK_RECOMMENDATIONS.MIXED;
  }

  return {
    total,
    counts,
    continueReasonCount,
    returnRate,
    isolateRate,
    markCoherentRate,
    continueRate,
    dismissRate,
    averageCoherenceScore,
    outcomeTotal,
    outcomeRecovered,
    outcomeRecoveredRate,
    outcomeReturnHostRate,
    averageOutcomeScoreDelta,
    continueOutcomeTotal,
    continueOutcomeRecovered,
    continueOutcomeRecoveredRate,
    continueOutcomeUnrecoveredRate,
    averageContinueOutcomeScoreDelta,
    recommendation
  };
}

export function recordIntentFeedbackOutcome(feedback = [], session = {}, visit = {}, options = {}) {
  const entries = normalizeIntentFeedback(feedback, options.maxFeedbackEntries);
  return annotateIntentFeedbackOutcome(entries, session, visit, options).map(normalizeIntentFeedbackEntry);
}

function createIntentCalibrationResult(settings, summary, overrides = {}) {
  const normalizedSettings = normalizeIntentSettings(settings);
  const normalizedSummary = summary && typeof summary === 'object'
    ? summary
    : createEmptyFeedbackSummary();
  const thresholdDelta = Number(overrides.thresholdDelta || 0);
  const effectiveAction = overrides.effectiveAction || normalizedSettings.action;
  const effectiveInterventionThreshold = clampNumber(
    normalizedSettings.interventionThreshold + thresholdDelta,
    normalizedSettings.interventionThreshold,
    normalizedSettings.lockedThreshold + 1,
    99
  );
  const appliedDelta = effectiveInterventionThreshold - normalizedSettings.interventionThreshold;
  const actionEscalated = effectiveAction !== normalizedSettings.action;

  return {
    enabled: normalizedSettings.autoCalibration,
    applied: appliedDelta !== 0 || actionEscalated,
    reason: overrides.reason || 'No calibration adjustment applied',
    recommendation: normalizedSummary.recommendation || INTENT_FEEDBACK_RECOMMENDATIONS.INSUFFICIENT_DATA,
    feedbackTotal: Number(normalizedSummary.total || 0),
    outcomeTotal: Number(normalizedSummary.outcomeTotal || 0),
    thresholdDelta: appliedDelta,
    baselineAction: normalizedSettings.action,
    effectiveAction,
    actionEscalated,
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
  const outcomeTotal = Number(normalizedSummary.outcomeTotal || 0);
  const outcomeRecoveredRate = Number(normalizedSummary.outcomeRecoveredRate || 0);

  if (!normalizedSettings.autoCalibration) {
    return createIntentCalibrationResult(normalizedSettings, normalizedSummary, {
      reason: 'Auto calibration disabled'
    });
  }

  if (feedbackTotal < MIN_FEEDBACK_ENTRIES_FOR_CALIBRATION && outcomeTotal < MIN_OUTCOME_ENTRIES_FOR_ESCALATION) {
    return createIntentCalibrationResult(normalizedSettings, normalizedSummary, {
      reason: `Needs ${MIN_FEEDBACK_ENTRIES_FOR_CALIBRATION} feedback entries or ${MIN_OUTCOME_ENTRIES_FOR_ESCALATION} observed outcomes before calibration`
    });
  }

  if (outcomeTotal >= MIN_OUTCOME_ENTRIES_FOR_ESCALATION && outcomeRecoveredRate <= MAX_RECOVERY_RATE_FOR_OUTCOME_ESCALATION) {
    return createIntentCalibrationResult(normalizedSettings, normalizedSummary, {
      thresholdDelta: HELPFUL_INTERVENTION_THRESHOLD_DELTA,
      effectiveAction: getNextStricterIntentAction(normalizedSettings.action),
      reason: 'Post-intervention outcomes suggest reminders are not restoring control'
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
      reason: 'Continue/isolate/coherent feedback suggests interventions are too sensitive'
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
    action: calibration.effectiveAction,
    interventionThreshold: calibration.effectiveInterventionThreshold
  });

  return {
    ...calibratedSettings,
    calibration
  };
}
