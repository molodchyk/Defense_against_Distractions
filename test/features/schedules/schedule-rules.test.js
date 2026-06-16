// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  doSchedulesOverlap,
  hasMinimumUnlockedTime,
  isScheduleMoreStrict
} from '../../../src/features/schedules/core/scheduleRules.js';

describe('schedule rules', () => {
  it('detects overlapping schedules on the same day', () => {
    const schedules = [
      { days: ['Mon'], startTime: '09:00', endTime: '11:00' },
      { days: ['Mon'], startTime: '10:30', endTime: '12:00' }
    ];

    assert.equal(doSchedulesOverlap(schedules), true);
  });

  it('allows adjacent schedules on the same day', () => {
    const schedules = [
      { days: ['Mon'], startTime: '09:00', endTime: '11:00' },
      { days: ['Mon'], startTime: '11:00', endTime: '12:00' }
    ];

    assert.equal(doSchedulesOverlap(schedules), false);
  });

  it('requires at least one unlocked hour per active day', () => {
    const schedules = [
      { days: ['Mon'], startTime: '00:00', endTime: '23:30', isActive: true }
    ];

    assert.equal(hasMinimumUnlockedTime(schedules), false);
  });

  it('accepts schedules with enough unlocked time', () => {
    const schedules = [
      { days: ['Mon'], startTime: '09:00', endTime: '17:00', isActive: true }
    ];

    assert.equal(hasMinimumUnlockedTime(schedules), true);
  });

  it('identifies stricter schedule changes', () => {
    const original = {
      days: ['Mon'],
      startTime: '09:00',
      endTime: '17:00',
      isActive: true
    };
    const next = {
      days: ['Mon', 'Tue'],
      startTime: '08:00',
      endTime: '18:00',
      isActive: true
    };

    assert.equal(isScheduleMoreStrict(original, next), true);
  });

  it('rejects schedule changes that remove days', () => {
    const original = {
      days: ['Mon', 'Tue'],
      startTime: '09:00',
      endTime: '17:00',
      isActive: true
    };
    const next = {
      days: ['Mon'],
      startTime: '09:00',
      endTime: '17:00',
      isActive: true
    };

    assert.equal(isScheduleMoreStrict(original, next), false);
  });
});
