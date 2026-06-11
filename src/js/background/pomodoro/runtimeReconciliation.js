// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  POMODORO_PHASES,
  normalizePomodoroRuntime
} from '../../shared/pomodoro.js';

export function didRuntimeChange(before, after) {
  return JSON.stringify(normalizePomodoroRuntime(before)) !== JSON.stringify(normalizePomodoroRuntime(after));
}

export function hasWorkRestCredit(runtime) {
  const normalizedRuntime = normalizePomodoroRuntime(runtime);
  return normalizedRuntime.phase === POMODORO_PHASES.WORK
    && (Boolean(normalizedRuntime.restCreditStartedAt) || Number(normalizedRuntime.restCreditMs || 0) > 0);
}

export function isWaitingForSystemReturn(runtime) {
  const normalizedRuntime = normalizePomodoroRuntime(runtime);
  return normalizedRuntime.phase === POMODORO_PHASES.WORK && Boolean(normalizedRuntime.restCreditStartedAt);
}

export function isPastDueWorkWaitingForSystemReturn(runtime, now = Date.now()) {
  const phaseEndsAt = Date.parse(runtime?.phaseEndsAt || '');
  return isWaitingForSystemReturn(runtime) && Number.isFinite(phaseEndsAt) && phaseEndsAt <= now;
}

export function getPhaseTransitionAt(runtime, now = Date.now()) {
  if (hasWorkRestCredit(runtime)) {
    return now;
  }

  const phaseEndsAt = Date.parse(runtime?.phaseEndsAt || '');
  return Number.isFinite(phaseEndsAt) && phaseEndsAt <= now
    ? phaseEndsAt
    : now;
}
