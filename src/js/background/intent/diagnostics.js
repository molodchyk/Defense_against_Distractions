// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  createIntentTrajectoryState,
  getIntentInterventionDecision,
  getIntentSessionForTab
} from '../../shared/intentCoherence.js';
import {
  createUsageStatsState,
  normalizeUsageStats,
  summarizeUsageStats
} from '../../shared/usageStats.js';
import {
  applyFeedbackCalibrationToPolicy,
  getIntentPolicyForSignal
} from './policy.js';
import {
  readIntentState,
  readUsageStatsState,
  saveIntentState,
  saveUsageStatsState
} from './storage.js';

export async function getIntentDebugState(tabId = null) {
  const state = await readIntentState();
  const activeSession = getIntentSessionForTab(state, tabId);
  const visits = Array.isArray(activeSession?.visits) ? activeSession.visits : [];
  const latestVisit = visits[visits.length - 1] || null;
  const baseIntentPolicy = await getIntentPolicyForSignal(latestVisit || {});
  const intentPolicy = applyFeedbackCalibrationToPolicy(baseIntentPolicy, state);

  return {
    state,
    activeSession,
    intentPolicy,
    feedbackSummary: intentPolicy.feedbackSummary,
    intervention: getIntentInterventionDecision(activeSession, {
      intentSettings: intentPolicy.settings
    })
  };
}

export function getIntentInterventionState(tabId = null) {
  return getIntentDebugState(tabId).then(debugState => ({
    status: 'ok',
    intervention: debugState.intervention,
    activeSession: debugState.activeSession
  }));
}

export function clearIntentDebugState() {
  return saveIntentState(createIntentTrajectoryState());
}

export async function getUsageStatsState() {
  const state = normalizeUsageStats(await readUsageStatsState());
  return {
    state,
    summary: summarizeUsageStats(state)
  };
}

export async function clearUsageStatsState() {
  const state = createUsageStatsState();
  await saveUsageStatsState(state);
  return {
    state,
    summary: summarizeUsageStats(state)
  };
}
