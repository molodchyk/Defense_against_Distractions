// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  applyIntentFeedbackCalibration,
  summarizeIntentFeedback
} from '../../shared/intentCoherence.js';
import {
  PLANS_STORAGE_KEY,
  getEffectiveIntentPolicyForUrl
} from '../../shared/plans.js';
import {
  POMODORO_RUNTIME_STORAGE_KEY,
  normalizePomodoroRuntime
} from '../../shared/pomodoro.js';
import {
  FOCUS_STATE_STORAGE_KEY,
  applyFocusStateToIntentPolicy,
  normalizeFocusStateSignal
} from '../../shared/self-state/focusState.js';
import {
  getLocal,
  getSync
} from './chromeApi.js';

export async function getIntentPolicyForSignal(signal = {}) {
  const [syncItems, localItems] = await Promise.all([
    getSync(PLANS_STORAGE_KEY),
    getLocal([POMODORO_RUNTIME_STORAGE_KEY, FOCUS_STATE_STORAGE_KEY])
  ]);

  const intentPolicy = getEffectiveIntentPolicyForUrl(syncItems, signal.url, {
    pomodoroRuntime: normalizePomodoroRuntime(localItems[POMODORO_RUNTIME_STORAGE_KEY])
  });

  return {
    ...intentPolicy,
    focusState: normalizeFocusStateSignal(localItems[FOCUS_STATE_STORAGE_KEY])
  };
}

export function getFeedbackSummaryForState(state = {}) {
  return summarizeIntentFeedback(Array.isArray(state?.feedback) ? state.feedback : []);
}

export function applyFeedbackCalibrationToPolicy(intentPolicy = {}, state = {}) {
  const feedbackSummary = getFeedbackSummaryForState(state);
  const baselineSettings = intentPolicy.settings || {};
  const settings = applyIntentFeedbackCalibration(baselineSettings, feedbackSummary);

  return applyFocusStateToIntentPolicy({
    ...intentPolicy,
    baselineSettings,
    settings,
    feedbackSummary,
    calibration: settings.calibration
  }, intentPolicy.focusState);
}
