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
    autoCalibration: settings.autoCalibration !== false
  };
}
