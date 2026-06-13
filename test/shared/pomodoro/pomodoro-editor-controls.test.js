// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getPlanPomodoroRuntimeControlState } from '../../../src/js/options/plans/pomodoroEditor.js';
import { POMODORO_PHASES } from '../../../src/js/shared/pomodoro.js';

describe('plan Pomodoro editor controls', () => {
  it('allows starting Pomodoro during locked schedules because it is stricter', () => {
    assert.deepEqual(getPlanPomodoroRuntimeControlState({
      isLocked: true,
      canStartTargetPlan: true,
      hasRuntimePlan: false,
      ownsRuntime: false,
      phase: POMODORO_PHASES.IDLE
    }), {
      startDisabled: false,
      pauseDisabled: true,
      resumeDisabled: true,
      resetDisabled: true
    });
  });

  it('allows resuming but not pausing or resetting Pomodoro during locked schedules', () => {
    assert.deepEqual(getPlanPomodoroRuntimeControlState({
      isLocked: true,
      canStartTargetPlan: true,
      hasRuntimePlan: true,
      ownsRuntime: true,
      phase: POMODORO_PHASES.PAUSED
    }), {
      startDisabled: true,
      pauseDisabled: true,
      resumeDisabled: false,
      resetDisabled: true
    });
  });

  it('blocks locked-schedule pause and reset controls while work is running', () => {
    assert.deepEqual(getPlanPomodoroRuntimeControlState({
      isLocked: true,
      canStartTargetPlan: true,
      hasRuntimePlan: true,
      ownsRuntime: true,
      phase: POMODORO_PHASES.WORK
    }), {
      startDisabled: true,
      pauseDisabled: true,
      resumeDisabled: true,
      resetDisabled: true
    });
  });
});
