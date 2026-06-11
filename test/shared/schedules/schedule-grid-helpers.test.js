// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isScheduleDraftComplete
} from '../../../src/js/options/scheduleBoard.js';
import {
  createScheduleRangeFromAnchor,
  createScheduleRangeFromStart,
  minutesToTimeString,
  moveScheduleRange,
  resizeScheduleRange,
  snapMinutes
} from '../../../src/js/shared/schedules/scheduleGrid.js';

describe('schedule grid helpers', () => {
  it('requires a selected day and valid time range before saving a draft', () => {
    assert.equal(isScheduleDraftComplete({
      days: [],
      startTime: '09:00',
      endTime: '10:00'
    }), false);

    assert.equal(isScheduleDraftComplete({
      days: ['Mon'],
      startTime: '10:00',
      endTime: '09:00'
    }), false);

    assert.equal(isScheduleDraftComplete({
      days: ['Mon'],
      startTime: '09:00',
      endTime: '10:00'
    }), true);
  });

  it('snaps and formats minute values for the visual grid', () => {
    assert.equal(snapMinutes(67), 60);
    assert.equal(snapMinutes(68), 75);
    assert.equal(minutesToTimeString(1439), '23:59');
  });

  it('creates one-hour ranges from a clicked grid offset', () => {
    assert.deepEqual(createScheduleRangeFromStart(570), {
      startTime: '09:30',
      endTime: '10:30'
    });
  });

  it('creates drag ranges from a fixed anchor in either direction', () => {
    assert.deepEqual(createScheduleRangeFromAnchor(540, 660), {
      startTime: '09:00',
      endTime: '11:00'
    });
    assert.deepEqual(createScheduleRangeFromAnchor(660, 540), {
      startTime: '09:00',
      endTime: '11:00'
    });
  });

  it('moves schedule ranges while preserving duration', () => {
    assert.deepEqual(moveScheduleRange({
      startTime: '09:00',
      endTime: '11:00'
    }, 60), {
      startTime: '10:00',
      endTime: '12:00'
    });
  });

  it('resizes schedule ranges without crossing the minimum duration', () => {
    assert.deepEqual(resizeScheduleRange({
      startTime: '09:00',
      endTime: '11:00'
    }, 'start', 105), {
      startTime: '10:45',
      endTime: '11:00'
    });
  });
});
