// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getScheduleActivityCounts,
  isCurrentTimeInAnySchedule,
  timeStringToMinutes
} from '../../../src/js/shared/schedules/scheduleTime.js';
import {
  formatScheduleActivitySummary
} from '../../../src/js/shared/schedules/scheduleSummary.js';

describe('schedule time helpers', () => {
  it('converts HH:mm values to minutes', () => {
    assert.equal(timeStringToMinutes('09:30'), 570);
    assert.equal(timeStringToMinutes('00:00'), 0);
  });

  it('detects active schedules for the current day and time', () => {
    const mondayMorning = new Date(2026, 4, 25, 10, 30);
    const schedules = [
      {
        days: ['Mon'],
        startTime: '09:00',
        endTime: '12:00',
        isActive: true
      }
    ];

    assert.equal(isCurrentTimeInAnySchedule(schedules, mondayMorning), true);
  });

  it('applies every-N-weeks schedule recurrence from an anchor week', () => {
    const schedules = [
      {
        days: ['Mon'],
        startTime: '09:00',
        endTime: '12:00',
        weekInterval: 2,
        anchorDate: '2026-06-01',
        isActive: true
      }
    ];

    assert.equal(isCurrentTimeInAnySchedule(schedules, new Date(2026, 5, 1, 10, 0)), true);
    assert.equal(isCurrentTimeInAnySchedule(schedules, new Date(2026, 5, 8, 10, 0)), false);
    assert.equal(isCurrentTimeInAnySchedule(schedules, new Date(2026, 5, 15, 10, 0)), true);
  });

  it('ignores inactive schedules', () => {
    const mondayMorning = new Date(2026, 4, 25, 10, 30);
    const schedules = [
      {
        days: ['Mon'],
        startTime: '09:00',
        endTime: '12:00',
        isActive: false
      }
    ];

    assert.equal(isCurrentTimeInAnySchedule(schedules, mondayMorning), false);
  });

  it('summarizes saved, enabled, and active-now schedules separately', () => {
    const mondayMorning = new Date(2026, 4, 25, 10, 30);
    const schedules = [
      { days: ['Mon'], startTime: '09:00', endTime: '12:00', isActive: true },
      { days: ['Mon'], startTime: '13:00', endTime: '14:00', isActive: true },
      { days: ['Mon'], startTime: '09:00', endTime: '12:00', isActive: false },
      { days: [], startTime: '00:00', endTime: '23:59', isActive: false }
    ];

    assert.deepEqual(getScheduleActivityCounts(schedules, mondayMorning), {
      total: 4,
      saved: 3,
      enabled: 2,
      disabled: 1,
      incomplete: 1,
      activeNow: 1
    });
  });

  it('formats schedule counts without confusing saved blocks with active-now blocks', () => {
    assert.equal(formatScheduleActivitySummary({
      saved: 3,
      enabled: 2,
      disabled: 1,
      incomplete: 1,
      activeNow: 1
    }), '1 active now · 2 enabled time blocks · 3 saved time blocks · 1 disabled · 1 incomplete ignored');
  });

  it('can omit saved counts for compact plan summaries', () => {
    assert.equal(formatScheduleActivitySummary({
      saved: 15,
      enabled: 1,
      disabled: 14,
      activeNow: 1
    }, {
      includeSaved: false
    }), '1 active now · 1 enabled time block · 14 disabled');
  });

  it('can summarize plan schedule time blocks without enabled or disabled wording', () => {
    assert.equal(formatScheduleActivitySummary({
      saved: 15,
      enabled: 15,
      disabled: 0,
      activeNow: 1
    }, {
      includeEnabled: false,
      includeDisabled: false,
      savedSummaryKey: 'scheduleTimeBlocksSummaryPart',
      savedSummaryFallback: '15 time blocks'
    }), '1 active now · 15 time blocks');
  });

  it('uses atomic schedule count wording when available', () => {
    const summary = formatScheduleActivitySummary({
      saved: 2,
      enabled: 2,
      activeNow: 1
    }, {
      getMessage: (key, fallback, substitutions) => {
        if (key === 'scheduleActiveNowSummaryPart') {
          return `${substitutions[0]} jetzt aktiv`;
        }
        return fallback;
      }
    });

    assert.equal(summary, '1 jetzt aktiv · 2 enabled time blocks · 2 saved time blocks');
  });

  it('does not use stale sentence-level schedule wording', () => {
    const summary = formatScheduleActivitySummary({
      saved: 15,
      enabled: 1,
      activeNow: 1
    }, {
      getMessage: (key, fallback) => {
        if (key === 'scheduleActivitySummaryMessage') {
          return '15 schedules, 1 enabled.';
        }
        return fallback;
      }
    });

    assert.equal(summary, '1 active now · 1 enabled time block · 15 saved time blocks');
  });
});
