// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  POMODORO_ACTIVITY_IDLE_MS,
  POMODORO_PHASES,
  POMODORO_SYSTEM_STATES
} from './constants.js';
import { normalizePomodoroActivityState } from './activity.js';
import { normalizePomodoroSettings } from './settings.js';
import {
  getPomodoroRemainingMs,
  getPomodoroRestCreditMs,
  normalizePomodoroRuntime
} from './runtime.js';
import { toTimestamp } from './utils.js';

export function getPomodoroStatus(runtime, settings, now = Date.now()) {
  const normalizedRuntime = normalizePomodoroRuntime(runtime, now);
  const remainingMs = getPomodoroRemainingMs(normalizedRuntime, now);
  const restCreditMs = getPomodoroRestCreditMs(normalizedRuntime, now);

  return {
    phase: normalizedRuntime.phase,
    phaseLabel: getPomodoroPhaseLabel(normalizedRuntime.phase),
    remainingMs,
    remainingText: formatRemainingTime(remainingMs),
    completedWorkSessions: normalizedRuntime.completedWorkSessions,
    pauseReason: normalizedRuntime.pauseReason,
    restCreditMs,
    restCreditText: formatDuration(restCreditMs),
    settings: normalizePomodoroSettings(settings)
  };
}

export function getPomodoroActivityStatus(state = {}, now = Date.now()) {
  const normalizedState = normalizePomodoroActivityState(state, now);
  const lastActivityAt = toTimestamp(normalizedState.lastActivityAt);
  const systemStateUpdatedAt = toTimestamp(normalizedState.systemStateUpdatedAt);
  const idleForMs = Number.isFinite(lastActivityAt) ? Math.max(0, now - lastActivityAt) : null;
  const isSystemAway = [
    POMODORO_SYSTEM_STATES.IDLE,
    POMODORO_SYSTEM_STATES.LOCKED
  ].includes(normalizedState.systemState);
  const isActive = !isSystemAway && Number.isFinite(idleForMs) && idleForMs <= POMODORO_ACTIVITY_IDLE_MS;

  return {
    isActive,
    stateLabel: getPomodoroActivityStateLabel(normalizedState.systemState, isActive),
    idleForMs,
    idleForText: Number.isFinite(idleForMs) ? formatDuration(idleForMs) : 'unknown',
    systemState: normalizedState.systemState,
    systemStateForMs: Number.isFinite(systemStateUpdatedAt) ? Math.max(0, now - systemStateUpdatedAt) : null,
    systemStateForText: Number.isFinite(systemStateUpdatedAt) ? formatDuration(Math.max(0, now - systemStateUpdatedAt)) : 'unknown',
    activeMsToday: normalizedState.activeMsToday,
    activeTodayText: formatDuration(normalizedState.activeMsToday),
    lastReason: normalizedState.lastReason,
    lastUrl: normalizedState.lastUrl,
    lastTitle: normalizedState.lastTitle,
    updatedAt: normalizedState.updatedAt
  };
}

function getPomodoroActivityStateLabel(systemState, isActive) {
  if (systemState === POMODORO_SYSTEM_STATES.LOCKED) return 'Locked';
  if (systemState === POMODORO_SYSTEM_STATES.IDLE) return 'Away';
  return isActive ? 'Active' : 'Away';
}

export function getPomodoroPhaseLabel(phase) {
  if (phase === POMODORO_PHASES.WORK) return 'Work';
  if (phase === POMODORO_PHASES.SHORT_BREAK) return 'Short break';
  if (phase === POMODORO_PHASES.LONG_BREAK) return 'Long break';
  if (phase === POMODORO_PHASES.PAUSED) return 'Paused';
  if (phase === POMODORO_PHASES.COMPLETED) return 'Rest satisfied';
  return 'Idle';
}

export function formatRemainingTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(Number(milliseconds || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(Number(milliseconds || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}
