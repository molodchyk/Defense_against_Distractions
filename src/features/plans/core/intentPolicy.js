// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { normalizeUrl } from '../../../js/shared/url.js';
import {
  DEFAULT_INTENT_SETTINGS,
  INTENT_INTERVENTION_ACTIONS,
  INTENT_POMODORO_INFLUENCE_MODES,
  normalizeIntentSettings
} from '../../../js/shared/intentCoherence.js';
import { PLANS_STORAGE_KEY } from './constants.js';
import {
  isUrlAllowedByPlan,
  normalizePlans
} from './model.js';
import { isPlanActive } from './activity.js';

export function getEffectiveIntentPolicyForUrl(items = {}, url = '', options = {}) {
  const normalizedUrl = normalizeUrl(url);
  const plans = normalizePlans(items[PLANS_STORAGE_KEY]);
  const now = options.now instanceof Date ? options.now : new Date();
  const runtime = options.pomodoroRuntime || {};

  if (plans.length === 0) {
    return {
      settings: normalizeIntentSettings(DEFAULT_INTENT_SETTINGS),
      planIds: [],
      planNames: [],
      source: 'default'
    };
  }

  const contributingPlans = plans.filter(plan => (
    isPlanActive(plan, now)
      && !isUrlAllowedByPlan(plan, normalizedUrl)
      && plan.intent.enabled
  ));

  if (contributingPlans.length === 0) {
    return {
      settings: normalizeIntentSettings({ ...DEFAULT_INTENT_SETTINGS, enabled: false }),
      planIds: [],
      planNames: [],
      source: 'plans'
    };
  }

  const settings = normalizeIntentSettings(contributingPlans.reduce((current, plan) => ({
    enabled: true,
    action: getStricterIntentAction(current.action, plan.intent.action),
    interventionThreshold: Math.max(current.interventionThreshold, plan.intent.interventionThreshold),
    lockedThreshold: Math.max(current.lockedThreshold, plan.intent.lockedThreshold),
    pomodoroInfluence: getCombinedPomodoroInfluence(current.pomodoroInfluence, plan.intent.pomodoroInfluence),
    diagnosticsRetentionDays: Math.min(current.diagnosticsRetentionDays, plan.intent.diagnosticsRetentionDays),
    autoCalibration: current.autoCalibration && plan.intent.autoCalibration !== false,
    autoCloseQuarantinedTab: current.autoCloseQuarantinedTab || plan.intent.autoCloseQuarantinedTab === true
  }), {
    ...DEFAULT_INTENT_SETTINGS,
    enabled: true,
    action: INTENT_INTERVENTION_ACTIONS.WARN,
    interventionThreshold: 0,
    lockedThreshold: 0,
    pomodoroInfluence: INTENT_POMODORO_INFLUENCE_MODES.IGNORE,
    diagnosticsRetentionDays: DEFAULT_INTENT_SETTINGS.diagnosticsRetentionDays,
    autoCalibration: DEFAULT_INTENT_SETTINGS.autoCalibration,
    autoCloseQuarantinedTab: DEFAULT_INTENT_SETTINGS.autoCloseQuarantinedTab
  }));

  return {
    settings: applyPomodoroIntentInfluence(settings, runtime, contributingPlans),
    planIds: contributingPlans.map(plan => plan.id),
    planNames: contributingPlans.map(plan => plan.name),
    source: 'plans'
  };
}

function getStricterIntentAction(firstAction, secondAction) {
  const order = [
    INTENT_INTERVENTION_ACTIONS.WARN,
    INTENT_INTERVENTION_ACTIONS.GRAYSCALE,
    INTENT_INTERVENTION_ACTIONS.REDUCE_NOISE,
    INTENT_INTERVENTION_ACTIONS.PROMPT,
    INTENT_INTERVENTION_ACTIONS.BLOCK
  ];
  const firstIndex = order.indexOf(firstAction);
  const secondIndex = order.indexOf(secondAction);
  return order[Math.max(firstIndex, secondIndex, 0)] || DEFAULT_INTENT_SETTINGS.action;
}

function getCombinedPomodoroInfluence(firstMode, secondMode) {
  if (firstMode === INTENT_POMODORO_INFLUENCE_MODES.BOTH || secondMode === INTENT_POMODORO_INFLUENCE_MODES.BOTH) {
    return INTENT_POMODORO_INFLUENCE_MODES.BOTH;
  }

  const hasWorkStricter = [firstMode, secondMode].includes(INTENT_POMODORO_INFLUENCE_MODES.WORK_STRICTER);
  const hasBreakLenient = [firstMode, secondMode].includes(INTENT_POMODORO_INFLUENCE_MODES.BREAK_LENIENT);

  if (hasWorkStricter && hasBreakLenient) {
    return INTENT_POMODORO_INFLUENCE_MODES.BOTH;
  }

  if (hasWorkStricter) {
    return INTENT_POMODORO_INFLUENCE_MODES.WORK_STRICTER;
  }

  if (hasBreakLenient) {
    return INTENT_POMODORO_INFLUENCE_MODES.BREAK_LENIENT;
  }

  return INTENT_POMODORO_INFLUENCE_MODES.IGNORE;
}

function applyPomodoroIntentInfluence(settings, runtime, contributingPlans) {
  const normalizedSettings = normalizeIntentSettings(settings);
  const activePlanIds = new Set(contributingPlans.map(plan => plan.id));
  if (!activePlanIds.has(runtime?.activePlanId)) {
    return normalizedSettings;
  }

  const phase = runtime?.phase;
  const shouldStrictenWork = [
    INTENT_POMODORO_INFLUENCE_MODES.WORK_STRICTER,
    INTENT_POMODORO_INFLUENCE_MODES.BOTH
  ].includes(normalizedSettings.pomodoroInfluence);
  const shouldSoftenBreak = [
    INTENT_POMODORO_INFLUENCE_MODES.BREAK_LENIENT,
    INTENT_POMODORO_INFLUENCE_MODES.BOTH
  ].includes(normalizedSettings.pomodoroInfluence);
  const adjustment = phase === 'work' && shouldStrictenWork
    ? 10
    : (phase === 'shortBreak' || phase === 'longBreak') && shouldSoftenBreak
        ? -10
        : 0;

  return normalizeIntentSettings({
    ...normalizedSettings,
    interventionThreshold: normalizedSettings.interventionThreshold + adjustment,
    lockedThreshold: normalizedSettings.lockedThreshold + adjustment
  });
}
