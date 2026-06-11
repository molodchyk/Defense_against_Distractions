// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  POMODORO_ACTIVITY_IDLE_MS,
  POMODORO_SYSTEM_STATES
} from './constants.js';
import {
  getUtcDayKey,
  normalizeSystemState,
  toIsoString,
  toTimestamp
} from './utils.js';

export function normalizePomodoroActivityState(state = {}, now = Date.now()) {
  const dayKey = typeof state.dayKey === 'string' && state.dayKey ? state.dayKey : getUtcDayKey(now);
  const currentDayKey = getUtcDayKey(now);

  return {
    dayKey: currentDayKey,
    activeMsToday: dayKey === currentDayKey
      ? Math.max(0, Math.round(Number(state.activeMsToday || 0)))
      : 0,
    lastActivityAt: toIsoString(toTimestamp(state.lastActivityAt)),
    lastReason: typeof state.lastReason === 'string' && state.lastReason ? state.lastReason : null,
    lastUrl: typeof state.lastUrl === 'string' && state.lastUrl ? state.lastUrl : null,
    lastTitle: typeof state.lastTitle === 'string' && state.lastTitle ? state.lastTitle : null,
    systemState: normalizeSystemState(state.systemState),
    systemStateUpdatedAt: toIsoString(toTimestamp(state.systemStateUpdatedAt)),
    updatedAt: toIsoString(toTimestamp(state.updatedAt)) || new Date(now).toISOString()
  };
}

export function recordPomodoroActivity(state = {}, activity = {}, now = Date.now()) {
  const normalizedState = normalizePomodoroActivityState(state, now);
  const previousActivityAt = toTimestamp(normalizedState.lastActivityAt);
  const wasSystemAway = [
    POMODORO_SYSTEM_STATES.IDLE,
    POMODORO_SYSTEM_STATES.LOCKED
  ].includes(normalizedState.systemState);
  const activeDelta = !wasSystemAway && Number.isFinite(previousActivityAt) && now - previousActivityAt <= POMODORO_ACTIVITY_IDLE_MS
    ? Math.max(0, now - previousActivityAt)
    : 0;

  return normalizePomodoroActivityState({
    ...normalizedState,
    activeMsToday: normalizedState.activeMsToday + activeDelta,
    lastActivityAt: new Date(now).toISOString(),
    lastReason: activity.reason,
    lastUrl: activity.url,
    lastTitle: activity.title,
    systemState: POMODORO_SYSTEM_STATES.ACTIVE,
    systemStateUpdatedAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString()
  }, now);
}

export function recordPomodoroSystemState(state = {}, systemState, now = Date.now()) {
  const normalizedState = normalizePomodoroActivityState(state, now);
  const normalizedSystemState = normalizeSystemState(systemState);
  if (!normalizedSystemState) {
    return normalizedState;
  }

  return normalizePomodoroActivityState({
    ...normalizedState,
    systemState: normalizedSystemState,
    systemStateUpdatedAt: new Date(now).toISOString(),
    lastReason: `system:${normalizedSystemState}`,
    updatedAt: new Date(now).toISOString()
  }, now);
}
