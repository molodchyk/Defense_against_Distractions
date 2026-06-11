// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { POMODORO_PHASES } from './constants.js';
import {
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
