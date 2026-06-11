// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export const POMODORO_RUNTIME_STORAGE_KEY = 'pomodoroRuntimeState';
export const POMODORO_ACTIVITY_STORAGE_KEY = 'pomodoroActivityState';
export const POMODORO_HISTORY_STORAGE_KEY = 'pomodoroHistoryState';
export const POMODORO_ACTIVITY_IDLE_MS = 2 * 60 * 1000;
export const POMODORO_IDLE_DETECTION_SECONDS = 15;
export const POMODORO_HISTORY_RECENT_LIMIT = 24;

export const POMODORO_PHASES = {
  IDLE: 'idle',
  WORK: 'work',
  SHORT_BREAK: 'shortBreak',
  LONG_BREAK: 'longBreak',
  PAUSED: 'paused',
  COMPLETED: 'completed'
};

export const POMODORO_PAUSE_REASONS = {
  MANUAL: 'manual',
  SYSTEM_IDLE: 'systemIdle',
  SYSTEM_LOCKED: 'systemLocked'
};

export const POMODORO_SYSTEM_STATES = {
  ACTIVE: 'active',
  IDLE: 'idle',
  LOCKED: 'locked'
};

export const DEFAULT_POMODORO_SETTINGS = {
  enabled: false,
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  strictBreaks: false,
  autoStart: false
};

export const MIN_DURATION_MINUTES = 1;
export const MAX_DURATION_MINUTES = 24 * 60;
export const MIN_SESSIONS_BEFORE_LONG_BREAK = 1;
export const MAX_SESSIONS_BEFORE_LONG_BREAK = 12;

export const POMODORO_HISTORY_TOTALS = {
  workSessionsStarted: 0,
  workSessionsCompleted: 0,
  breakSessionsCompleted: 0,
  workMs: 0,
  breakMs: 0,
  creditedRestMs: 0,
  idleRestCreditMs: 0,
  lockedRestCreditMs: 0,
  skippedBreaks: 0,
  manualStarts: 0,
  autoStarts: 0,
  continuationStarts: 0,
  resets: 0
};
