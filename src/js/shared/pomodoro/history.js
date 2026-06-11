// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  POMODORO_HISTORY_RECENT_LIMIT,
  POMODORO_HISTORY_TOTALS,
  POMODORO_PAUSE_REASONS
} from './constants.js';
import {
  getUtcDayKey,
  normalizeDurationMs,
  normalizeHistoryTotals,
  normalizePauseReason,
  toIsoString,
  toTimestamp
} from './utils.js';

export function createPomodoroHistoryState(now = Date.now()) {
  return {
    dayKey: getUtcDayKey(now),
    totals: { ...POMODORO_HISTORY_TOTALS },
    recent: [],
    updatedAt: new Date(now).toISOString()
  };
}

function normalizePomodoroHistoryEvent(event = {}, now = Date.now(), index = 0) {
  const eventAt = toIsoString(toTimestamp(event.at)) || new Date(now).toISOString();
  const type = typeof event.type === 'string' && event.type ? event.type : 'unknown';

  return {
    id: typeof event.id === 'string' && event.id
      ? event.id
      : `pomodoro_${Date.parse(eventAt) || now}_${index}_${type}`,
    type,
    at: eventAt,
    planId: typeof event.planId === 'string' && event.planId ? event.planId : null,
    planName: typeof event.planName === 'string' && event.planName ? event.planName : null,
    phase: typeof event.phase === 'string' && event.phase ? event.phase : null,
    nextPhase: typeof event.nextPhase === 'string' && event.nextPhase ? event.nextPhase : null,
    reason: typeof event.reason === 'string' && event.reason ? event.reason : null,
    startType: typeof event.startType === 'string' && event.startType ? event.startType : null,
    restReason: normalizePauseReason(event.restReason),
    workMs: normalizeDurationMs(event.workMs),
    breakMs: normalizeDurationMs(event.breakMs),
    creditedRestMs: normalizeDurationMs(event.creditedRestMs),
    requiredRestMs: normalizeDurationMs(event.requiredRestMs),
    skippedBreak: event.skippedBreak === true
  };
}

export function normalizePomodoroHistoryState(history = {}, now = Date.now()) {
  const currentDayKey = getUtcDayKey(now);
  const dayKey = typeof history.dayKey === 'string' && history.dayKey ? history.dayKey : currentDayKey;
  if (dayKey !== currentDayKey) {
    return createPomodoroHistoryState(now);
  }

  const recent = Array.isArray(history.recent)
    ? history.recent
      .map((event, index) => normalizePomodoroHistoryEvent(event, now, index))
      .slice(-POMODORO_HISTORY_RECENT_LIMIT)
    : [];

  return {
    dayKey: currentDayKey,
    totals: normalizeHistoryTotals(history.totals),
    recent,
    updatedAt: toIsoString(toTimestamp(history.updatedAt)) || new Date(now).toISOString()
  };
}

export function recordPomodoroHistoryEvent(history = {}, event = {}, now = Date.now()) {
  const normalizedHistory = normalizePomodoroHistoryState(history, now);
  const normalizedEvent = normalizePomodoroHistoryEvent(event, now, normalizedHistory.recent.length);
  const totals = normalizeHistoryTotals(normalizedHistory.totals);

  if (normalizedEvent.type === 'workStarted') {
    totals.workSessionsStarted += 1;
    if (normalizedEvent.startType === 'manual') {
      totals.manualStarts += 1;
    } else if (normalizedEvent.startType === 'auto') {
      totals.autoStarts += 1;
    } else if (normalizedEvent.startType === 'continuation') {
      totals.continuationStarts += 1;
    }
  }

  if (normalizedEvent.type === 'workCompleted') {
    totals.workSessionsCompleted += 1;
    totals.workMs += normalizedEvent.workMs;
    totals.creditedRestMs += normalizedEvent.creditedRestMs;

    if (normalizedEvent.restReason === POMODORO_PAUSE_REASONS.SYSTEM_IDLE) {
      totals.idleRestCreditMs += normalizedEvent.creditedRestMs;
    }

    if (normalizedEvent.restReason === POMODORO_PAUSE_REASONS.SYSTEM_LOCKED) {
      totals.lockedRestCreditMs += normalizedEvent.creditedRestMs;
    }

    if (normalizedEvent.skippedBreak) {
      totals.skippedBreaks += 1;
    }
  }

  if (normalizedEvent.type === 'breakCompleted') {
    totals.breakSessionsCompleted += 1;
    totals.breakMs += normalizedEvent.breakMs;
  }

  if (normalizedEvent.type === 'reset') {
    totals.resets += 1;
  }

  return normalizePomodoroHistoryState({
    ...normalizedHistory,
    totals,
    recent: [...normalizedHistory.recent, normalizedEvent].slice(-POMODORO_HISTORY_RECENT_LIMIT),
    updatedAt: new Date(now).toISOString()
  }, now);
}
