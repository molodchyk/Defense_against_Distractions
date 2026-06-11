// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  recordIntentFeedback,
  recordIntentPageVisit
} from '../../shared/intentCoherence.js';
import {
  recordUsagePageSignal,
  summarizeUsageStats
} from '../../shared/usageStats.js';
import {
  getTabPressure
} from './chromeApi.js';
import {
  applyFeedbackCalibrationToPolicy,
  getIntentPolicyForSignal
} from './policy.js';
import {
  updateIntentState,
  updateUsageStats
} from './storage.js';

export async function recordPageSignals(message, sender, options = {}) {
  const baseIntentPolicy = await getIntentPolicyForSignal(message.signals || {});
  const state = await updateIntentState(currentState => recordIntentPageVisit(currentState, message.signals, {
    tabId: sender.tab?.id,
    frameId: sender.frameId,
    intentSettings: applyFeedbackCalibrationToPolicy(baseIntentPolicy, currentState).settings,
    planIds: baseIntentPolicy.planIds,
    planNames: baseIntentPolicy.planNames,
    policySource: baseIntentPolicy.source,
    ...options
  }));
  const intentPolicy = applyFeedbackCalibrationToPolicy(baseIntentPolicy, state);
  let usageSummary = null;
  try {
    const tabPressure = await getTabPressure();
    const usageState = await updateUsageStats(currentState => recordUsagePageSignal(currentState, message.signals, {
      tabId: sender.tab?.id,
      frameId: sender.frameId,
      documentId: sender.documentId,
      tabCount: tabPressure.tabCount,
      windowCount: tabPressure.windowCount
    }));
    usageSummary = summarizeUsageStats(usageState);
  } catch (error) {
    console.error('Failed to record local usage stats:', error);
  }
  return {
    state,
    intentPolicy,
    usageSummary
  };
}

export function recordFeedback(message = {}, sender = {}) {
  return updateIntentState(state => recordIntentFeedback(state, message.feedback || {}, {
    tabId: sender.tab?.id
  }));
}
