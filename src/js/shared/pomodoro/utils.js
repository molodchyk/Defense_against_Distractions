// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  POMODORO_HISTORY_TOTALS,
  POMODORO_PAUSE_REASONS,
  POMODORO_SYSTEM_STATES
} from './constants.js';

export function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(Math.max(Math.round(number), min), max);
}

export function toTimestamp(value) {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function toIsoString(timestamp) {
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

export function getUtcDayKey(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}

export function normalizeDurationMs(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
}

export function normalizeHistoryTotals(totals = {}) {
  return Object.fromEntries(Object.entries(POMODORO_HISTORY_TOTALS).map(([key, fallback]) => ([
    key,
    normalizeDurationMs(totals[key] ?? fallback)
  ])));
}

export function normalizePauseReason(reason) {
  return Object.values(POMODORO_PAUSE_REASONS).includes(reason) ? reason : null;
}

export function normalizeSystemState(systemState) {
  return Object.values(POMODORO_SYSTEM_STATES).includes(systemState) ? systemState : null;
}

export function getSystemPauseReason(systemState) {
  if (systemState === POMODORO_SYSTEM_STATES.LOCKED) return POMODORO_PAUSE_REASONS.SYSTEM_LOCKED;
  if (systemState === POMODORO_SYSTEM_STATES.IDLE) return POMODORO_PAUSE_REASONS.SYSTEM_IDLE;
  return null;
}

export function isPomodoroSystemPauseReason(reason) {
  return [
    POMODORO_PAUSE_REASONS.SYSTEM_IDLE,
    POMODORO_PAUSE_REASONS.SYSTEM_LOCKED
  ].includes(reason);
}
