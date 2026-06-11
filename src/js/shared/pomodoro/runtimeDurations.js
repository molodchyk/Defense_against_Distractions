// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { POMODORO_PHASES } from './constants.js';
import { normalizePomodoroSettings } from './settings.js';
import { normalizePomodoroRuntime } from './runtimeState.js';

export function getPomodoroPhaseDurationMs(settings, phase) {
  const normalizedSettings = normalizePomodoroSettings(settings);

  if (phase === POMODORO_PHASES.WORK) {
    return normalizedSettings.workMinutes * 60 * 1000;
  }

  if (phase === POMODORO_PHASES.LONG_BREAK) {
    return normalizedSettings.longBreakMinutes * 60 * 1000;
  }

  if (phase === POMODORO_PHASES.SHORT_BREAK) {
    return normalizedSettings.shortBreakMinutes * 60 * 1000;
  }

  return 0;
}

export function getPomodoroNextBreakPhase(runtime = {}, settings = {}) {
  const normalizedRuntime = normalizePomodoroRuntime(runtime);
  const normalizedSettings = normalizePomodoroSettings(settings);
  const completedWorkSessions = normalizedRuntime.completedWorkSessions + 1;

  return completedWorkSessions % normalizedSettings.sessionsBeforeLongBreak === 0
    ? POMODORO_PHASES.LONG_BREAK
    : POMODORO_PHASES.SHORT_BREAK;
}

export function getPomodoroRequiredRestMs(runtime = {}, settings = {}) {
  const normalizedRuntime = normalizePomodoroRuntime(runtime);
  if (normalizedRuntime.phase === POMODORO_PHASES.WORK) {
    return getPomodoroPhaseDurationMs(settings, getPomodoroNextBreakPhase(normalizedRuntime, settings));
  }

  if ([POMODORO_PHASES.SHORT_BREAK, POMODORO_PHASES.LONG_BREAK].includes(normalizedRuntime.phase)) {
    return getPomodoroPhaseDurationMs(settings, normalizedRuntime.phase);
  }

  return 0;
}
