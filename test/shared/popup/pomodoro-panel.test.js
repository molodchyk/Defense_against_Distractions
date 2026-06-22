// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getPomodoroSummary,
  getPopupPomodoroRuntimeControlState
} from '../../../src/js/popup/pomodoroPanel.js';

function message(key, substitutions = []) {
  const messages = {
    popupAutoStartDelayed: 'Auto-start delayed',
    popupAutoStartPaused: 'Auto-start paused',
    popupIdleLabel: 'Idle',
    popupNotRunning: 'Not running',
    popupPausedSummary: `Paused - ${substitutions[0]}`,
    popupPomodoroStateSummary: `${substitutions[0]} - ${substitutions[1]}`,
    popupRestSatisfied: 'Rest satisfied',
    popupWorkSummary: `Work - ${substitutions[0]}`
  };
  return messages[key] || key;
}

describe('popup Pomodoro panel helpers', () => {
  it('allows starting Pomodoro during locked schedules because starting is stricter', () => {
    assert.deepEqual(getPopupPomodoroRuntimeControlState({
      canStart: true,
      phase: 'idle',
      protectedScheduleActive: true
    }), {
      startDisabled: false,
      pauseDisabled: true,
      resumeDisabled: true,
      resetDisabled: true
    });
  });

  it('allows resuming but not pausing or resetting Pomodoro during locked schedules', () => {
    assert.deepEqual(getPopupPomodoroRuntimeControlState({
      canStart: true,
      phase: 'paused',
      protectedScheduleActive: true
    }), {
      startDisabled: true,
      pauseDisabled: true,
      resumeDisabled: false,
      resetDisabled: true
    });
  });

  it('keeps pause and reset available outside locked schedules while Pomodoro is running', () => {
    assert.deepEqual(getPopupPomodoroRuntimeControlState({
      canStart: true,
      phase: 'work',
      protectedScheduleActive: false
    }), {
      startDisabled: true,
      pauseDisabled: false,
      resumeDisabled: true,
      resetDisabled: false
    });
  });

  it('summarizes rest-satisfied work credit before ordinary work state', () => {
    assert.deepEqual(getPomodoroSummary({
      timerStatus: {
        phase: 'work',
        phaseLabel: 'Work',
        remainingText: '15:00',
        restSatisfiedByCredit: true
      }
    }, message), {
      state: 'ready',
      text: 'Rest satisfied'
    });
  });

  it('keeps ordinary work summary when rest is not satisfied by credit', () => {
    assert.deepEqual(getPomodoroSummary({
      timerStatus: {
        phase: 'work',
        phaseLabel: 'Work',
        remainingText: '15:00',
        restSatisfiedByCredit: false
      }
    }, message), {
      state: 'ready',
      text: 'Work - 15:00'
    });
  });
});
