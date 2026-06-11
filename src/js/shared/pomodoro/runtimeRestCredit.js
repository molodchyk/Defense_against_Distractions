// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { POMODORO_PHASES } from './constants.js';
import {
  getSystemPauseReason,
  toTimestamp
} from './utils.js';
import { normalizePomodoroRuntime } from './runtimeState.js';
import { getPomodoroRequiredRestMs } from './runtimeDurations.js';

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

export function isPomodoroRestSatisfied(runtime = {}, settings = {}, now = Date.now()) {
  const normalizedRuntime = normalizePomodoroRuntime(runtime, now);
  if (normalizedRuntime.phase !== POMODORO_PHASES.WORK) {
    return false;
  }

  const requiredRestMs = getPomodoroRequiredRestMs(normalizedRuntime, settings);
  return requiredRestMs > 0 && getPomodoroRestCreditMs(normalizedRuntime, now) >= requiredRestMs;
}
