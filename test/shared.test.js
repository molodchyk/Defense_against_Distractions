// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  parseKeywordForEditing,
  parseKeywordForScanning,
  splitKeywordEntry
} from '../src/js/shared/keywords.js';
import {
  normalizeUrl,
  stripUrlPrefix
} from '../src/js/shared/url.js';
import {
  isCurrentTimeInAnySchedule,
  timeStringToMinutes
} from '../src/js/shared/scheduleTime.js';
import {
  doSchedulesOverlap,
  hasMinimumUnlockedTime,
  isScheduleMoreStrict
} from '../src/js/shared/scheduleRules.js';
import {
  createDefaultSchedule,
  formatScheduleTime,
  getNextUnnamedScheduleName,
  normalizeScheduleTimeInput
} from '../src/js/shared/scheduleForm.js';
import {
  areKeywordChangesValid,
  areWebsiteChangesValid,
  getNextUnnamedGroupName,
  getStoredGroups,
  validateKeywordEntry
} from '../src/js/shared/groupRules.js';

describe('keyword parsing', () => {
  it('splits keyword entries on unescaped commas', () => {
    assert.deepEqual(splitKeywordEntry('news, *, 10'), ['news', '*', '10']);
  });

  it('keeps escaped commas inside keywords', () => {
    assert.deepEqual(splitKeywordEntry('hello\\, world, 25'), ['hello, world', '25']);
  });

  it('parses simple scan keywords with blocking defaults', () => {
    assert.deepEqual(parseKeywordForScanning('video games'), {
      keyword: 'video games',
      operation: '+',
      value: 1000
    });
  });

  it('parses weighted scan keywords', () => {
    assert.deepEqual(parseKeywordForScanning('news, 50'), {
      keyword: 'news',
      operation: '+',
      value: 50
    });
  });

  it('parses explicit scan operations', () => {
    assert.deepEqual(parseKeywordForScanning('shorts, *, 5'), {
      keyword: 'shorts',
      operation: '*',
      value: 5
    });
  });

  it('parses editing form into keyword, sign, and value', () => {
    assert.deepEqual(parseKeywordForEditing('news, +, 100'), ['news', '+', 100]);
  });
});

describe('URL helpers', () => {
  it('strips http and www prefixes', () => {
    assert.equal(stripUrlPrefix('https://www.example.com/path'), 'example.com/path');
    assert.equal(stripUrlPrefix('http://example.com'), 'example.com');
  });

  it('normalizes URLs by stripping prefixes and lowercasing', () => {
    assert.equal(normalizeUrl('HTTPS://WWW.Example.COM/News'), 'example.com/news');
  });
});

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
});

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
      isActive: false
    });
  });
});

describe('group rules', () => {
  it('collects only group records from storage items', () => {
    const groups = getStoredGroups({
      group_1: { groupName: 'Focus' },
      schedules: [],
      group_2: { groupName: 'Study' }
    });

    assert.deepEqual(groups, [{ groupName: 'Focus' }, { groupName: 'Study' }]);
  });

  it('generates the next available unnamed group name', () => {
    const groups = [
      { groupName: 'Group 1' },
      { groupName: 'Group 2' },
      { groupName: 'Personal' }
    ];

    assert.equal(getNextUnnamedGroupName(groups, 'Group'), 'Group 3');
  });

  it('allows website additions while preserving existing websites', () => {
    assert.equal(
      areWebsiteChangesValid(['youtube.com'], ['youtube.com', 'reddit.com']),
      true
    );
  });

  it('rejects website removals and duplicates', () => {
    assert.equal(areWebsiteChangesValid(['youtube.com'], ['reddit.com']), false);
    assert.equal(areWebsiteChangesValid(['youtube.com'], ['youtube.com', 'youtube.com']), false);
  });

  it('allows locked keyword value increases', () => {
    assert.equal(
      areKeywordChangesValid(['news, 50'], ['news, 100']),
      true
    );
  });

  it('rejects locked keyword removals and value decreases', () => {
    assert.equal(areKeywordChangesValid(['news', 'games'], ['news']), false);
    assert.equal(areKeywordChangesValid(['news, 100'], ['news, 50']), false);
  });

  it('validates keyword entries outside locked schedules', () => {
    assert.equal(validateKeywordEntry('news, -50', false), true);
    assert.equal(validateKeywordEntry('news, 0', false), false);
    assert.equal(validateKeywordEntry('news, *, 1', false), false);
  });

  it('validates keyword entries inside locked schedules', () => {
    assert.equal(validateKeywordEntry('news, 50', true), true);
    assert.equal(validateKeywordEntry('news, -50', true), false);
    assert.equal(validateKeywordEntry('news, *, 1', true), false);
  });
});
