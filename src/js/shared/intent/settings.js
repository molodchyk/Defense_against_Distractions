// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk


import {
  DEFAULT_INTENT_SETTINGS,
  INTENT_INTERVENTION_ACTIONS,
  INTENT_POMODORO_INFLUENCE_MODES,
  MAX_DIAGNOSTICS_RETENTION_DAYS,
  MIN_DIAGNOSTICS_RETENTION_DAYS
} from './constants.js';
import { clampNumber } from './utils.js';

const INTENT_ACTION_STRICTNESS_ORDER = [
  INTENT_INTERVENTION_ACTIONS.WARN,
  INTENT_INTERVENTION_ACTIONS.GRAYSCALE,
  INTENT_INTERVENTION_ACTIONS.REDUCE_NOISE,
  INTENT_INTERVENTION_ACTIONS.PROMPT,
  INTENT_INTERVENTION_ACTIONS.BLOCK
];

export function normalizeIntentSettings(settings = {}) {
  const interventionThreshold = clampNumber(
    settings.interventionThreshold,
    DEFAULT_INTENT_SETTINGS.interventionThreshold,
    1,
    99
  );
  const lockedThreshold = clampNumber(
    settings.lockedThreshold,
    DEFAULT_INTENT_SETTINGS.lockedThreshold,
    0,
    interventionThreshold - 1
  );
  const action = Object.values(INTENT_INTERVENTION_ACTIONS).includes(settings.action)
    ? settings.action
    : DEFAULT_INTENT_SETTINGS.action;
  const pomodoroInfluence = Object.values(INTENT_POMODORO_INFLUENCE_MODES).includes(settings.pomodoroInfluence)
    ? settings.pomodoroInfluence
    : DEFAULT_INTENT_SETTINGS.pomodoroInfluence;
  const diagnosticsRetentionDays = clampNumber(
    settings.diagnosticsRetentionDays,
    DEFAULT_INTENT_SETTINGS.diagnosticsRetentionDays,
    MIN_DIAGNOSTICS_RETENTION_DAYS,
    MAX_DIAGNOSTICS_RETENTION_DAYS
  );

  return {
    enabled: settings.enabled !== false,
    action,
    interventionThreshold,
    lockedThreshold,
    pomodoroInfluence,
    diagnosticsRetentionDays,
    autoCalibration: settings.autoCalibration !== false,
    autoCloseQuarantinedTab: settings.autoCloseQuarantinedTab === true
  };
}

export function getIntentActionStrictness(action) {
  return Math.max(0, INTENT_ACTION_STRICTNESS_ORDER.indexOf(action));
}

export function getNextStricterIntentAction(action, maxAction = INTENT_INTERVENTION_ACTIONS.PROMPT) {
  const currentIndex = getIntentActionStrictness(action);
  const maxIndex = getIntentActionStrictness(maxAction);
  const nextIndex = currentIndex >= maxIndex ? currentIndex : currentIndex + 1;
  return INTENT_ACTION_STRICTNESS_ORDER[nextIndex] || DEFAULT_INTENT_SETTINGS.action;
}

function hasWorkStricterInfluence(mode) {
  return [
    INTENT_POMODORO_INFLUENCE_MODES.WORK_STRICTER,
    INTENT_POMODORO_INFLUENCE_MODES.BOTH
  ].includes(mode);
}

function hasBreakLenientInfluence(mode) {
  return [
    INTENT_POMODORO_INFLUENCE_MODES.BREAK_LENIENT,
    INTENT_POMODORO_INFLUENCE_MODES.BOTH
  ].includes(mode);
}

export function isIntentSettingsAtLeastAsStrict(originalSettings = {}, nextSettings = {}) {
  const original = normalizeIntentSettings(originalSettings);
  const next = normalizeIntentSettings(nextSettings);

  if (!original.enabled) {
    return next.enabled;
  }

  if (!next.enabled) {
    return false;
  }

  return Boolean(
    getIntentActionStrictness(next.action) >= getIntentActionStrictness(original.action)
      && next.interventionThreshold >= original.interventionThreshold
      && next.lockedThreshold >= original.lockedThreshold
      && next.diagnosticsRetentionDays <= original.diagnosticsRetentionDays
      && next.autoCalibration === original.autoCalibration
      && (!original.autoCloseQuarantinedTab || next.autoCloseQuarantinedTab)
      && (!hasWorkStricterInfluence(original.pomodoroInfluence) || hasWorkStricterInfluence(next.pomodoroInfluence))
      && (!hasBreakLenientInfluence(next.pomodoroInfluence) || hasBreakLenientInfluence(original.pomodoroInfluence))
  );
}
