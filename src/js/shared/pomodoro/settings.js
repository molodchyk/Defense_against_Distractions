// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  DEFAULT_POMODORO_SETTINGS,
  MAX_DURATION_MINUTES,
  MAX_SESSIONS_BEFORE_LONG_BREAK,
  MIN_DURATION_MINUTES,
  MIN_SESSIONS_BEFORE_LONG_BREAK
} from './constants.js';
import { clampNumber } from './utils.js';

export function normalizePomodoroSettings(settings = {}) {
  return {
    enabled: settings.enabled === true,
    workMinutes: clampNumber(settings.workMinutes, DEFAULT_POMODORO_SETTINGS.workMinutes, MIN_DURATION_MINUTES, MAX_DURATION_MINUTES),
    shortBreakMinutes: clampNumber(settings.shortBreakMinutes, DEFAULT_POMODORO_SETTINGS.shortBreakMinutes, MIN_DURATION_MINUTES, MAX_DURATION_MINUTES),
    longBreakMinutes: clampNumber(settings.longBreakMinutes, DEFAULT_POMODORO_SETTINGS.longBreakMinutes, MIN_DURATION_MINUTES, MAX_DURATION_MINUTES),
    sessionsBeforeLongBreak: clampNumber(
      settings.sessionsBeforeLongBreak,
      DEFAULT_POMODORO_SETTINGS.sessionsBeforeLongBreak,
      MIN_SESSIONS_BEFORE_LONG_BREAK,
      MAX_SESSIONS_BEFORE_LONG_BREAK
    ),
    strictBreaks: settings.strictBreaks === true,
    autoStart: settings.autoStart === true
  };
}
