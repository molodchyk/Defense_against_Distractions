// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export {
  createIdlePomodoroRuntime,
  getPomodoroRemainingMs,
  isPomodoroActive,
  normalizePomodoroRuntime
} from './runtimeState.js';
export {
  getPomodoroNextBreakPhase,
  getPomodoroPhaseDurationMs,
  getPomodoroRequiredRestMs
} from './runtimeDurations.js';
export {
  creditPomodoroRestForSystemState,
  getPomodoroRestCreditMs,
  isPomodoroRestSatisfied,
  pausePomodoroForSystemState,
  stopPomodoroRestCredit
} from './runtimeRestCredit.js';
export {
  completePomodoroPhase,
  completePomodoroWorkIfRestSatisfied,
  pausePomodoro,
  resetPomodoro,
  resumePomodoro,
  resumePomodoroFromSystemPause,
  startPomodoroWork
} from './runtimeTransitions.js';
