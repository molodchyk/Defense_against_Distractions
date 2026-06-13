// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  createIntentTrajectoryState,
  getIntentChainReturnTabIds,
  getIntentDriftDescendantTabIds,
  getIntentInterventionDecision,
  getIntentSessionForTab,
  INTENT_INTERVENTION_ACTIONS
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
import {
  closeIntentQuarantinedCurrentTab,
  returnIntentQuarantinedChain
} from './tabs.js';

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

export async function getIntentInterventionState(tabId = null) {
  const debugState = await getIntentDebugState(tabId);
  const intervention = attachIntentInterventionTabScope(debugState.intervention, debugState.state, tabId);
  const autoRecovery = await autoRecoverHardChainIfReady(tabId, intervention);

  return {
    status: 'ok',
    intervention,
    activeSession: debugState.activeSession,
    autoReturn: autoRecovery?.status === 'returned' ? autoRecovery : null,
    autoRecovery
  };
}

export function attachIntentInterventionTabScope(intervention = {}, state = {}, tabId = null) {
  if (!intervention || typeof intervention !== 'object' || intervention.chainBlock?.active !== true) {
    return intervention;
  }

  const driftDescendantTabCount = getIntentDriftDescendantTabIds(state, {
    currentTabId: tabId,
    includeCurrent: false
  }).length;
  const chainReturnTabCount = getIntentChainReturnTabIds(state, {
    currentTabId: tabId
  }).length;

  return {
    ...intervention,
    chainBlock: {
      ...intervention.chainBlock,
      driftDescendantTabCount,
      chainReturnTabCount
    }
  };
}

async function autoRecoverHardChainIfReady(tabId = null, intervention = {}) {
  const currentTabId = normalizeInterventionTabId(tabId);
  if (
    !Number.isFinite(currentTabId)
      || intervention?.action !== INTENT_INTERVENTION_ACTIONS.BLOCK
      || intervention?.hardBlocked !== true
      || intervention?.chainBlock?.active !== true
      || intervention?.chainBlock?.cooldownActive === true
  ) {
    return null;
  }

  if (intervention?.chainBlock?.autoCloseCurrentTab === true) {
    return closeIntentQuarantinedCurrentTab(currentTabId);
  }

  if (typeof intervention?.recoveryUrl !== 'string' || !intervention.recoveryUrl.trim()) {
    return null;
  }

  return returnIntentQuarantinedChain(currentTabId, intervention.recoveryUrl);
}

function normalizeInterventionTabId(tabId = null) {
  if (typeof tabId === 'number') {
    return Number.isFinite(tabId) ? tabId : null;
  }

  if (typeof tabId === 'string' && tabId.trim()) {
    const numericTabId = Number(tabId);
    return Number.isFinite(numericTabId) ? numericTabId : null;
  }

  return null;
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
