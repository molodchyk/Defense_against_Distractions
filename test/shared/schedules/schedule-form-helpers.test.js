// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createDefaultSchedule,
  formatScheduleTime,
  getNextUnnamedScheduleName,
  normalizeScheduleTimeInput
} from '../../../src/js/shared/scheduleForm.js';

describe('schedule form helpers', () => {
  it('formats hour-only schedule times', () => {
    assert.equal(formatScheduleTime('8'), '08:00');
  });

  it('pads schedule time parts', () => {
    assert.equal(formatScheduleTime('8:5'), '08:05');
  });

  it('normalizes typed schedule time values', () => {
    assert.equal(normalizeScheduleTimeInput('25:99', '', '9'), '23:59');
    assert.equal(normalizeScheduleTimeInput('8:', '', ':'), '8:');
  });

  it('normalizes backspace after a colon', () => {
    assert.equal(normalizeScheduleTimeInput('12:', '12:', null), '1');
  });

  it('generates the next available unnamed schedule name', () => {
    const schedules = [
      { name: 'Schedule 1' },
      { name: 'Schedule 2' },
      { name: 'Focus' }
    ];

    assert.equal(getNextUnnamedScheduleName(schedules, 'Schedule '), 'Schedule 3');
  });

  it('creates the default schedule shape', () => {
    assert.deepEqual(createDefaultSchedule('Focus'), {
      name: 'Focus',
      days: [],
      startTime: '00:00',
      endTime: '23:59',
      weekInterval: 1,
      anchorDate: '',
      isActive: false
    });
  });
});
