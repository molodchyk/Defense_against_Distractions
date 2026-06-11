// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  POMODORO_PAUSE_REASONS,
  POMODORO_PHASES
} from './constants.js';
import { normalizePomodoroSettings } from './settings.js';
import {
  getSystemPauseReason,
  isPomodoroSystemPauseReason,
  normalizePauseReason,
  toIsoString,
  toTimestamp
} from './utils.js';

export function createIdlePomodoroRuntime(now = Date.now()) {
  return {
    activePlanId: null,
    phase: POMODORO_PHASES.IDLE,
    phaseStartedAt: null,
    phaseEndsAt: null,
    completedWorkSessions: 0,
    lastCompletedAt: null,
    pausedAt: null,
    pausedPhase: null,
    pausedRemainingMs: null,
    pauseReason: null,
    restCreditMs: 0,
    restCreditStartedAt: null,
    restCreditReason: null,
    previousUrl: null,
    updatedAt: new Date(now).toISOString()
  };
}

export function normalizePomodoroRuntime(runtime = {}, now = Date.now()) {
  const phase = Object.values(POMODORO_PHASES).includes(runtime.phase)
    ? runtime.phase
    : POMODORO_PHASES.IDLE;

  return {
    activePlanId: typeof runtime.activePlanId === 'string' && runtime.activePlanId ? runtime.activePlanId : null,
    phase,
    phaseStartedAt: toIsoString(toTimestamp(runtime.phaseStartedAt)),
    phaseEndsAt: toIsoString(toTimestamp(runtime.phaseEndsAt)),
    completedWorkSessions: Math.max(0, Math.round(Number(runtime.completedWorkSessions || 0))),
    lastCompletedAt: toIsoString(toTimestamp(runtime.lastCompletedAt)),
    pausedAt: toIsoString(toTimestamp(runtime.pausedAt)),
    pausedPhase: [
      POMODORO_PHASES.WORK,
      POMODORO_PHASES.SHORT_BREAK,
      POMODORO_PHASES.LONG_BREAK
    ].includes(runtime.pausedPhase) ? runtime.pausedPhase : null,
    pausedRemainingMs: Number.isFinite(Number(runtime.pausedRemainingMs)) ? Math.max(0, Math.round(Number(runtime.pausedRemainingMs))) : null,
    pauseReason: phase === POMODORO_PHASES.PAUSED ? normalizePauseReason(runtime.pauseReason) : null,
    restCreditMs: phase === POMODORO_PHASES.WORK
      ? Math.max(0, Math.round(Number(runtime.restCreditMs || 0)))
      : 0,
    restCreditStartedAt: phase === POMODORO_PHASES.WORK ? toIsoString(toTimestamp(runtime.restCreditStartedAt)) : null,
    restCreditReason: phase === POMODORO_PHASES.WORK ? normalizePauseReason(runtime.restCreditReason) : null,
    previousUrl: typeof runtime.previousUrl === 'string' && runtime.previousUrl ? runtime.previousUrl : null,
    updatedAt: toIsoString(toTimestamp(runtime.updatedAt)) || new Date(now).toISOString()
  };
}

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

export function creditPomodoroRestForSystemState(runtime, systemState, now = Date.now()) {
  const normalizedRuntime = normalizePomodoroRuntime(runtime, now);
  const pauseReason = getSystemPauseReason(systemState);
  if (!pauseReason || normalizedRuntime.phase !== POMODORO_PHASES.WORK) {
    return normalizedRuntime;
  }

  if (normalizedRuntime.restCreditStartedAt) {
    return normalizedRuntime;
  }

  return {
    ...normalizedRuntime,
    restCreditStartedAt: new Date(now).toISOString(),
    restCreditReason: pauseReason,
    updatedAt: new Date(now).toISOString()
  };
}

export function pausePomodoroForSystemState(runtime, systemState, now = Date.now()) {
  return creditPomodoroRestForSystemState(runtime, systemState, now);
}

export function getPomodoroRestCreditMs(runtime, now = Date.now()) {
  const normalizedRuntime = normalizePomodoroRuntime(runtime, now);
  if (normalizedRuntime.phase !== POMODORO_PHASES.WORK) {
    return 0;
  }

  const workEndsAt = toTimestamp(normalizedRuntime.phaseEndsAt);
  const creditStartedAt = toTimestamp(normalizedRuntime.restCreditStartedAt);
  const creditEnd = Number.isFinite(workEndsAt) ? Math.min(now, workEndsAt) : now;
  const activeCreditMs = Number.isFinite(creditStartedAt)
    ? Math.max(0, creditEnd - creditStartedAt)
    : 0;

  return Math.max(0, normalizedRuntime.restCreditMs + activeCreditMs);
}

export function stopPomodoroRestCredit(runtime, now = Date.now()) {
  const normalizedRuntime = normalizePomodoroRuntime(runtime, now);
  if (normalizedRuntime.phase !== POMODORO_PHASES.WORK || !normalizedRuntime.restCreditStartedAt) {
    return normalizedRuntime;
  }

  return {
    ...normalizedRuntime,
    restCreditMs: getPomodoroRestCreditMs(normalizedRuntime, now),
    restCreditStartedAt: null,
    restCreditReason: normalizedRuntime.restCreditReason,
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

export function isPomodoroRestSatisfied(runtime = {}, settings = {}, now = Date.now()) {
  const normalizedRuntime = normalizePomodoroRuntime(runtime, now);
  if (normalizedRuntime.phase !== POMODORO_PHASES.WORK) {
    return false;
  }

  const requiredRestMs = getPomodoroRequiredRestMs(normalizedRuntime, settings);
  return requiredRestMs > 0 && getPomodoroRestCreditMs(normalizedRuntime, now) >= requiredRestMs;
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
      return {
        ...normalizedRuntime,
        phase: POMODORO_PHASES.COMPLETED,
        phaseStartedAt: new Date(now).toISOString(),
        phaseEndsAt: null,
        completedWorkSessions,
        lastCompletedAt: new Date(now).toISOString(),
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

    return {
      ...normalizedRuntime,
      phase: nextPhase,
      phaseStartedAt: new Date(now).toISOString(),
      phaseEndsAt: new Date(now + remainingBreakMs).toISOString(),
      completedWorkSessions,
      lastCompletedAt: new Date(now).toISOString(),
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

  if ([POMODORO_PHASES.SHORT_BREAK, POMODORO_PHASES.LONG_BREAK].includes(normalizedRuntime.phase)) {
    return {
      ...normalizedRuntime,
      phase: POMODORO_PHASES.COMPLETED,
      phaseStartedAt: new Date(now).toISOString(),
      phaseEndsAt: null,
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

  return normalizedRuntime;
}

export function getPomodoroRemainingMs(runtime, now = Date.now()) {
  const normalizedRuntime = normalizePomodoroRuntime(runtime, now);
  if (normalizedRuntime.phase === POMODORO_PHASES.PAUSED) {
    return normalizedRuntime.pausedRemainingMs || 0;
  }

  const phaseEndsAt = toTimestamp(normalizedRuntime.phaseEndsAt);
  if (!phaseEndsAt) {
    return 0;
  }

  return Math.max(0, phaseEndsAt - now);
}

export function isPomodoroActive(runtime) {
  return [
    POMODORO_PHASES.WORK,
    POMODORO_PHASES.SHORT_BREAK,
    POMODORO_PHASES.LONG_BREAK,
    POMODORO_PHASES.PAUSED
  ].includes(normalizePomodoroRuntime(runtime).phase);
}
