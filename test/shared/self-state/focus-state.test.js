// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_FOCUS_STATE_DURATION_MS,
  FOCUS_STATE_LEVELS,
  applyFocusStateToIntentPolicy,
  createFocusStateSignal,
  getFocusStateThresholdAdjustment,
  normalizeFocusStateSignal
} from '../../../src/js/shared/self-state/focusState.js';
import {
  DEFAULT_INTENT_SETTINGS
} from '../../../src/js/shared/intentCoherence.js';

describe('focus state signal helpers', () => {
  const now = Date.UTC(2026, 0, 1, 8, 0, 0);

  it('creates bounded local focus state signals', () => {
    const signal = createFocusStateSignal(FOCUS_STATE_LEVELS.VULNERABLE, { now: () => now });

    assert.deepEqual(signal, {
      level: FOCUS_STATE_LEVELS.VULNERABLE,
      updatedAt: '2026-01-01T08:00:00.000Z',
      activeUntil: new Date(now + DEFAULT_FOCUS_STATE_DURATION_MS).toISOString()
    });
  });

  it('normalizes expired or unknown focus states back to calm', () => {
    assert.deepEqual(normalizeFocusStateSignal({
      level: FOCUS_STATE_LEVELS.STRAINED,
      updatedAt: '2026-01-01T07:00:00.000Z',
      activeUntil: '2026-01-01T07:59:59.000Z'
    }, { now: () => now }), {
      level: FOCUS_STATE_LEVELS.CALM,
      updatedAt: '2026-01-01T08:00:00.000Z',
      activeUntil: null
    });

    assert.equal(normalizeFocusStateSignal({ level: 'panic' }, { now: () => now }).level, FOCUS_STATE_LEVELS.CALM);
  });

  it('applies focus state as a stricter intent threshold adjustment only', () => {
    const policy = {
      settings: {
        ...DEFAULT_INTENT_SETTINGS,
        interventionThreshold: 40,
        lockedThreshold: 20,
        calibration: {
          thresholdDelta: -6
        }
      }
    };
    const signal = createFocusStateSignal(FOCUS_STATE_LEVELS.STRAINED, { now: () => now });
    const focusedPolicy = applyFocusStateToIntentPolicy(policy, signal, { now: () => now });

    assert.equal(getFocusStateThresholdAdjustment(signal, { now: () => now }), 8);
    assert.equal(focusedPolicy.settings.interventionThreshold, 48);
    assert.equal(focusedPolicy.settings.lockedThreshold, 28);
    assert.equal(focusedPolicy.settings.calibration.thresholdDelta, -6);
    assert.equal(focusedPolicy.focusState.thresholdAdjustment, 8);

    const calmPolicy = applyFocusStateToIntentPolicy(policy, createFocusStateSignal(FOCUS_STATE_LEVELS.CALM, { now: () => now }), { now: () => now });
    assert.equal(calmPolicy.settings.interventionThreshold, 40);
    assert.equal(calmPolicy.settings.lockedThreshold, 20);
  });
});
