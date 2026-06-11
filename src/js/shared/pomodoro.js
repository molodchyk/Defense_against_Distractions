// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export {
  DEFAULT_POMODORO_SETTINGS,
  POMODORO_ACTIVITY_IDLE_MS,
  POMODORO_ACTIVITY_STORAGE_KEY,
  POMODORO_HISTORY_RECENT_LIMIT,
  POMODORO_HISTORY_STORAGE_KEY,
  POMODORO_IDLE_DETECTION_SECONDS,
  POMODORO_PAUSE_REASONS,
  POMODORO_PHASES,
  POMODORO_RUNTIME_STORAGE_KEY,
  POMODORO_SYSTEM_STATES
} from './pomodoro/constants.js';
export { isPomodoroSystemPauseReason } from './pomodoro/utils.js';
export { normalizePomodoroSettings } from './pomodoro/settings.js';
export {
  normalizePomodoroActivityState,
  recordPomodoroActivity,
  recordPomodoroSystemState
} from './pomodoro/activity.js';
export {
  createPomodoroHistoryState,
  normalizePomodoroHistoryState,
  recordPomodoroHistoryEvent
} from './pomodoro/history.js';
export {
  completePomodoroPhase,
  completePomodoroWorkIfRestSatisfied,
  createIdlePomodoroRuntime,
  creditPomodoroRestForSystemState,
  getPomodoroNextBreakPhase,
  getPomodoroPhaseDurationMs,
  getPomodoroRemainingMs,
  getPomodoroRequiredRestMs,
  getPomodoroRestCreditMs,
  isPomodoroActive,
  isPomodoroRestSatisfied,
  normalizePomodoroRuntime,
  pausePomodoro,
  pausePomodoroForSystemState,
  resetPomodoro,
  resumePomodoro,
  resumePomodoroFromSystemPause,
  startPomodoroWork,
  stopPomodoroRestCredit
} from './pomodoro/runtime.js';
export {
  formatDuration,
  formatRemainingTime,
  getPomodoroActivityStatus,
  getPomodoroPhaseLabel,
  getPomodoroStatus
} from './pomodoro/status.js';
