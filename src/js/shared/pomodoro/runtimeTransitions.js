// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  POMODORO_PAUSE_REASONS,
  POMODORO_PHASES
} from './constants.js';
import {
  isPomodoroSystemPauseReason,
  normalizePauseReason
} from './utils.js';
import {
  createIdlePomodoroRuntime,
  getPomodoroRemainingMs,
  normalizePomodoroRuntime
} from './runtimeState.js';
import {
  getPomodoroNextBreakPhase,
  getPomodoroPhaseDurationMs
} from './runtimeDurations.js';
import {
  getPomodoroRestCreditMs,
  isPomodoroRestSatisfied,
  stopPomodoroRestCredit
} from './runtimeRestCredit.js';

export function startPomodoroWork(planId, settings, now = Date.now(), previousRuntime = {}) {
  const durationMs = getPomodoroPhaseDurationMs(settings, POMODORO_PHASES.WORK);
  const normalizedRuntime = normalizePomodoroRuntime(previousRuntime, now);

  return {
    ...normalizedRuntime,
    activePlanId: planId || normalizedRuntime.activePlanId,
    phase: POMODORO_PHASES.WORK,
    phaseStartedAt: new Date(now).toISOString(),
    phaseEndsAt: new Date(now + durationMs).toISOString(),
    pausedAt: null,
    pausedPhase: null,
    pausedRemainingMs: null,
    pauseReason: null,
    restCreditMs: 0,
    restCreditStartedAt: null,
    restCreditReason: null,
    updatedAt: new Date(now).toISOString()
  };
}

export function pausePomodoro(runtime, now = Date.now(), pauseReason = POMODORO_PAUSE_REASONS.MANUAL) {
  const normalizedRuntime = normalizePomodoroRuntime(runtime, now);
  if (![POMODORO_PHASES.WORK, POMODORO_PHASES.SHORT_BREAK, POMODORO_PHASES.LONG_BREAK].includes(normalizedRuntime.phase)) {
    return normalizedRuntime;
  }

  return {
    ...normalizedRuntime,
    phase: POMODORO_PHASES.PAUSED,
    pausedAt: new Date(now).toISOString(),
    pausedPhase: normalizedRuntime.phase,
    pausedRemainingMs: getPomodoroRemainingMs(normalizedRuntime, now),
    pauseReason: normalizePauseReason(pauseReason) || POMODORO_PAUSE_REASONS.MANUAL,
    restCreditMs: 0,
    restCreditStartedAt: null,
    restCreditReason: null,
    updatedAt: new Date(now).toISOString()
  };
}

export function resumePomodoro(runtime, now = Date.now()) {
  const normalizedRuntime = normalizePomodoroRuntime(runtime, now);
  if (normalizedRuntime.phase !== POMODORO_PHASES.PAUSED || !normalizedRuntime.pausedRemainingMs) {
    return normalizedRuntime;
  }

  return {
    ...normalizedRuntime,
    phase: normalizedRuntime.pausedPhase || POMODORO_PHASES.WORK,
    phaseStartedAt: new Date(now).toISOString(),
    phaseEndsAt: new Date(now + normalizedRuntime.pausedRemainingMs).toISOString(),
    pausedAt: null,
    pausedPhase: null,
    pausedRemainingMs: null,
    pauseReason: null,
    updatedAt: new Date(now).toISOString()
  };
}

export function resumePomodoroFromSystemPause(runtime, now = Date.now()) {
  const normalizedRuntime = normalizePomodoroRuntime(runtime, now);
  if (normalizedRuntime.phase === POMODORO_PHASES.WORK && normalizedRuntime.restCreditStartedAt) {
    return stopPomodoroRestCredit(normalizedRuntime, now);
  }

  if (
    normalizedRuntime.phase !== POMODORO_PHASES.PAUSED
      || !isPomodoroSystemPauseReason(normalizedRuntime.pauseReason)
  ) {
    return normalizedRuntime;
  }

  return resumePomodoro(normalizedRuntime, now);
}

export function resetPomodoro(now = Date.now()) {
  return createIdlePomodoroRuntime(now);
}

export function completePomodoroWorkIfRestSatisfied(runtime = {}, settings = {}, now = Date.now()) {
  const normalizedRuntime = normalizePomodoroRuntime(runtime, now);
  if (!isPomodoroRestSatisfied(normalizedRuntime, settings, now)) {
    return normalizedRuntime;
  }

  return completePomodoroPhase(normalizedRuntime, settings, now);
}

export function completePomodoroPhase(runtime, settings, now = Date.now()) {
  const normalizedRuntime = normalizePomodoroRuntime(runtime, now);

  if (normalizedRuntime.phase === POMODORO_PHASES.WORK) {
    const completedWorkSessions = normalizedRuntime.completedWorkSessions + 1;
    const nextPhase = getPomodoroNextBreakPhase(normalizedRuntime, settings);
    const durationMs = getPomodoroPhaseDurationMs(settings, nextPhase);
    const remainingBreakMs = Math.max(0, durationMs - getPomodoroRestCreditMs(normalizedRuntime, now));

    if (remainingBreakMs <= 0) {
      return buildCompletedRuntime(normalizedRuntime, now, { completedWorkSessions });
    }

    return {
      ...normalizedRuntime,
      phase: nextPhase,
      phaseStartedAt: new Date(now).toISOString(),
      phaseEndsAt: new Date(now + remainingBreakMs).toISOString(),
      completedWorkSessions,
      lastCompletedAt: new Date(now).toISOString(),
      ...getClearedPauseAndRestFields(),
      updatedAt: new Date(now).toISOString()
    };
  }

  if ([POMODORO_PHASES.SHORT_BREAK, POMODORO_PHASES.LONG_BREAK].includes(normalizedRuntime.phase)) {
    return buildCompletedRuntime(normalizedRuntime, now);
  }

  return normalizedRuntime;
}

function buildCompletedRuntime(runtime, now, overrides = {}) {
  return {
    ...runtime,
    phase: POMODORO_PHASES.COMPLETED,
    phaseStartedAt: new Date(now).toISOString(),
    phaseEndsAt: null,
    ...overrides,
    lastCompletedAt: new Date(now).toISOString(),
    ...getClearedPauseAndRestFields(),
    updatedAt: new Date(now).toISOString()
  };
}

function getClearedPauseAndRestFields() {
  return {
    pausedAt: null,
    pausedPhase: null,
    pausedRemainingMs: null,
    pauseReason: null,
    restCreditMs: 0,
    restCreditStartedAt: null,
    restCreditReason: null
  };
}
