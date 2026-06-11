// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_POMODORO_SETTINGS,
  POMODORO_PAUSE_REASONS,
  POMODORO_PHASES,
  POMODORO_SYSTEM_STATES,
  completePomodoroPhase,
  completePomodoroWorkIfRestSatisfied,
  createPomodoroHistoryState,
  getPomodoroActivityStatus,
  getPomodoroRemainingMs,
  getPomodoroRestCreditMs,
  normalizePomodoroHistoryState,
  normalizePomodoroSettings,
  pausePomodoroForSystemState,
  pausePomodoro,
  recordPomodoroActivity,
  recordPomodoroHistoryEvent,
  recordPomodoroSystemState,
  resumePomodoro,
  resumePomodoroFromSystemPause,
  startPomodoroWork
} from '../../../src/js/shared/pomodoro.js';

describe('pomodoro helpers', () => {
  const now = Date.UTC(2026, 0, 1, 10, 0, 0);

  it('normalizes Pomodoro settings into bounded plan config', () => {
    assert.deepEqual(normalizePomodoroSettings({
      enabled: true,
      workMinutes: 0,
      shortBreakMinutes: 2000,
      longBreakMinutes: 'not-a-number',
      sessionsBeforeLongBreak: 50,
      strictBreaks: true,
      autoStart: true
    }), {
      enabled: true,
      workMinutes: 1,
      shortBreakMinutes: 1440,
      longBreakMinutes: DEFAULT_POMODORO_SETTINGS.longBreakMinutes,
      sessionsBeforeLongBreak: 12,
      strictBreaks: true,
      autoStart: true
    });
  });

  it('starts work and advances to a short break after one completed work period', () => {
    const settings = {
      ...DEFAULT_POMODORO_SETTINGS,
      workMinutes: 25,
      shortBreakMinutes: 5
    };
    const workRuntime = startPomodoroWork('plan_1', settings, now);

    assert.equal(workRuntime.phase, POMODORO_PHASES.WORK);
    assert.equal(getPomodoroRemainingMs(workRuntime, now), 25 * 60 * 1000);

    const breakRuntime = completePomodoroPhase(workRuntime, settings, now + 25 * 60 * 1000);
    assert.equal(breakRuntime.phase, POMODORO_PHASES.SHORT_BREAK);
    assert.equal(breakRuntime.completedWorkSessions, 1);
    assert.equal(getPomodoroRemainingMs(breakRuntime, now + 25 * 60 * 1000), 5 * 60 * 1000);
  });

  it('uses a long break after the configured number of work sessions', () => {
    const settings = {
      ...DEFAULT_POMODORO_SETTINGS,
      longBreakMinutes: 15,
      sessionsBeforeLongBreak: 4
    };
    const runtime = {
      ...startPomodoroWork('plan_1', settings, now),
      completedWorkSessions: 3
    };

    const breakRuntime = completePomodoroPhase(runtime, settings, now + 25 * 60 * 1000);
    assert.equal(breakRuntime.phase, POMODORO_PHASES.LONG_BREAK);
    assert.equal(breakRuntime.completedWorkSessions, 4);
    assert.equal(getPomodoroRemainingMs(breakRuntime, now + 25 * 60 * 1000), 15 * 60 * 1000);
  });

  it('pauses and resumes the active phase without losing remaining time', () => {
    const runtime = startPomodoroWork('plan_1', DEFAULT_POMODORO_SETTINGS, now);
    const paused = pausePomodoro(runtime, now + 5 * 60 * 1000);

    assert.equal(paused.phase, POMODORO_PHASES.PAUSED);
    assert.equal(paused.pausedPhase, POMODORO_PHASES.WORK);
    assert.equal(paused.pausedRemainingMs, 20 * 60 * 1000);

    const resumed = resumePomodoro(paused, now + 10 * 60 * 1000);
    assert.equal(resumed.phase, POMODORO_PHASES.WORK);
    assert.equal(getPomodoroRemainingMs(resumed, now + 10 * 60 * 1000), 20 * 60 * 1000);
  });

  it('credits system locked time against the next break without moving the work anchor', () => {
    const settings = {
      ...DEFAULT_POMODORO_SETTINGS,
      workMinutes: 25,
      shortBreakMinutes: 5
    };
    const runtime = startPomodoroWork('plan_1', settings, now);
    const locked = pausePomodoroForSystemState(runtime, POMODORO_SYSTEM_STATES.LOCKED, now + 20 * 60 * 1000);

    assert.equal(locked.phase, POMODORO_PHASES.WORK);
    assert.equal(getPomodoroRemainingMs(locked, now + 20 * 60 * 1000), 5 * 60 * 1000);
    assert.equal(getPomodoroRestCreditMs(locked, now + 22 * 60 * 1000), 2 * 60 * 1000);

    const resumed = resumePomodoroFromSystemPause(locked, now + 22 * 60 * 1000);
    assert.equal(resumed.phase, POMODORO_PHASES.WORK);
    assert.equal(resumed.restCreditMs, 2 * 60 * 1000);
    assert.equal(getPomodoroRemainingMs(resumed, now + 22 * 60 * 1000), 3 * 60 * 1000);

    const breakRuntime = completePomodoroPhase(resumed, settings, now + 25 * 60 * 1000);
    assert.equal(breakRuntime.phase, POMODORO_PHASES.SHORT_BREAK);
    assert.equal(getPomodoroRemainingMs(breakRuntime, now + 25 * 60 * 1000), 3 * 60 * 1000);
  });

  it('skips the break when away credit already satisfies the required rest', () => {
    const settings = {
      ...DEFAULT_POMODORO_SETTINGS,
      workMinutes: 25,
      shortBreakMinutes: 5
    };
    const runtime = startPomodoroWork('plan_1', settings, now);
    const idle = pausePomodoroForSystemState(runtime, POMODORO_SYSTEM_STATES.IDLE, now + 10 * 60 * 1000);
    const resumed = resumePomodoroFromSystemPause(idle, now + 20 * 60 * 1000);

    assert.equal(resumed.phase, POMODORO_PHASES.WORK);
    assert.equal(resumed.restCreditMs, 10 * 60 * 1000);

    const completed = completePomodoroWorkIfRestSatisfied(resumed, settings, now + 20 * 60 * 1000);
    assert.equal(completed.phase, POMODORO_PHASES.COMPLETED);
    assert.equal(completed.completedWorkSessions, 1);

    const restarted = startPomodoroWork('plan_1', settings, now + 20 * 60 * 1000, completed);
    assert.equal(restarted.phase, POMODORO_PHASES.WORK);
    assert.equal(restarted.phaseStartedAt, new Date(now + 20 * 60 * 1000).toISOString());
    assert.equal(getPomodoroRemainingMs(restarted, now + 20 * 60 * 1000), 25 * 60 * 1000);
    assert.equal(restarted.restCreditMs, 0);
  });

  it('marks the cycle completed when a normal break ends', () => {
    const settings = {
      ...DEFAULT_POMODORO_SETTINGS,
      workMinutes: 25,
      shortBreakMinutes: 5
    };
    const workRuntime = startPomodoroWork('plan_1', settings, now);
    const breakRuntime = completePomodoroPhase(workRuntime, settings, now + 25 * 60 * 1000);
    const completed = completePomodoroPhase(breakRuntime, settings, now + 30 * 60 * 1000);

    assert.equal(completed.phase, POMODORO_PHASES.COMPLETED);
    assert.equal(completed.activePlanId, 'plan_1');
    assert.equal(completed.completedWorkSessions, 1);
  });

  it('credits in-progress away time past the work anchor until return', () => {
    const settings = {
      ...DEFAULT_POMODORO_SETTINGS,
      workMinutes: 25,
      shortBreakMinutes: 5
    };
    const runtime = startPomodoroWork('plan_1', settings, now);
    const locked = pausePomodoroForSystemState(runtime, POMODORO_SYSTEM_STATES.LOCKED, now + 24 * 60 * 1000);

    assert.equal(getPomodoroRestCreditMs(locked, now + 30 * 60 * 1000), 6 * 60 * 1000);

    const resumed = resumePomodoroFromSystemPause(locked, now + 30 * 60 * 1000);
    const completed = completePomodoroWorkIfRestSatisfied(resumed, settings, now + 30 * 60 * 1000);
    assert.equal(completed.phase, POMODORO_PHASES.COMPLETED);
  });

  it('starts the remaining break from the return timestamp when away rest is partial', () => {
    const settings = {
      ...DEFAULT_POMODORO_SETTINGS,
      workMinutes: 25,
      shortBreakMinutes: 5
    };
    const runtime = startPomodoroWork('plan_1', settings, now);
    const locked = pausePomodoroForSystemState(runtime, POMODORO_SYSTEM_STATES.LOCKED, now + 24 * 60 * 1000);
    const returnedAt = now + 27 * 60 * 1000;
    const resumed = resumePomodoroFromSystemPause(locked, returnedAt);

    assert.equal(resumed.restCreditMs, 3 * 60 * 1000);

    const breakRuntime = completePomodoroPhase(resumed, settings, returnedAt);
    assert.equal(breakRuntime.phase, POMODORO_PHASES.SHORT_BREAK);
    assert.equal(breakRuntime.phaseStartedAt, new Date(returnedAt).toISOString());
    assert.equal(getPomodoroRemainingMs(breakRuntime, returnedAt), 2 * 60 * 1000);
  });

  it('does not auto-resume manually paused timers on system activity', () => {
    const runtime = startPomodoroWork('plan_1', DEFAULT_POMODORO_SETTINGS, now);
    const manuallyPaused = pausePomodoro(runtime, now + 5 * 60 * 1000);
    const stillPaused = resumePomodoroFromSystemPause(manuallyPaused, now + 10 * 60 * 1000);

    assert.equal(stillPaused.phase, POMODORO_PHASES.PAUSED);
    assert.equal(stillPaused.pauseReason, POMODORO_PAUSE_REASONS.MANUAL);
  });

  it('counts nearby activity as active browser time', () => {
    const first = recordPomodoroActivity({}, { reason: 'pageVisible' }, now);
    const second = recordPomodoroActivity(first, { reason: 'scroll' }, now + 15 * 1000);
    const status = getPomodoroActivityStatus(second, now + 30 * 1000);

    assert.equal(second.activeMsToday, 15 * 1000);
    assert.equal(status.isActive, true);
    assert.equal(status.activeTodayText, '15s');
  });

  it('does not count long away gaps as active browser time', () => {
    const first = recordPomodoroActivity({}, { reason: 'pageVisible' }, now);
    const second = recordPomodoroActivity(first, { reason: 'click' }, now + 5 * 60 * 1000);
    const status = getPomodoroActivityStatus(second, now + 8 * 60 * 1000);

    assert.equal(second.activeMsToday, 0);
    assert.equal(status.isActive, false);
  });

  it('does not count system locked time as active browser time', () => {
    const first = recordPomodoroActivity({}, { reason: 'pageVisible' }, now);
    const locked = recordPomodoroSystemState(first, POMODORO_SYSTEM_STATES.LOCKED, now + 10 * 1000);
    const active = recordPomodoroActivity(locked, { reason: 'systemActive' }, now + 70 * 1000);
    const status = getPomodoroActivityStatus(locked, now + 30 * 1000);

    assert.equal(status.isActive, false);
    assert.equal(status.stateLabel, 'Locked');
    assert.equal(active.activeMsToday, 0);
  });

  it('records local Pomodoro history stats for credited rest and skipped breaks', () => {
    const history = recordPomodoroHistoryEvent(createPomodoroHistoryState(now), {
      type: 'workCompleted',
      planId: 'plan_1',
      planName: 'Default plan',
      phase: POMODORO_PHASES.WORK,
      nextPhase: POMODORO_PHASES.COMPLETED,
      at: new Date(now).toISOString(),
      workMs: 20 * 60 * 1000,
      requiredRestMs: 5 * 60 * 1000,
      creditedRestMs: 5 * 60 * 1000,
      restReason: POMODORO_PAUSE_REASONS.SYSTEM_LOCKED,
      skippedBreak: true
    }, now);

    assert.equal(history.totals.workSessionsCompleted, 1);
    assert.equal(history.totals.workMs, 20 * 60 * 1000);
    assert.equal(history.totals.creditedRestMs, 5 * 60 * 1000);
    assert.equal(history.totals.lockedRestCreditMs, 5 * 60 * 1000);
    assert.equal(history.totals.skippedBreaks, 1);
    assert.equal(history.recent.length, 1);
  });

  it('resets Pomodoro history on a new day', () => {
    const history = recordPomodoroHistoryEvent(createPomodoroHistoryState(now), {
      type: 'workStarted',
      startType: 'manual',
      at: new Date(now).toISOString()
    }, now);
    const nextDay = now + 24 * 60 * 60 * 1000;

    assert.equal(history.totals.workSessionsStarted, 1);
    assert.equal(normalizePomodoroHistoryState(history, nextDay).totals.workSessionsStarted, 0);
  });
});
