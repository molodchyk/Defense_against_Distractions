// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  areKeywordChangesValid,
  areWebsiteChangesValid,
  getNextUnnamedGroupName,
  getStoredGroups,
  validateKeywordEntry
} from '../../../src/js/shared/groupRules.js';

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
    assert.equal(
      areKeywordChangesValid(['news, 50/100'], ['news, 60/100']),
      true
    );
  });

  it('rejects locked keyword removals and value decreases', () => {
    assert.equal(areKeywordChangesValid(['news', 'games'], ['news']), false);
    assert.equal(areKeywordChangesValid(['news, 100'], ['news, 50']), false);
    assert.equal(areKeywordChangesValid(['news, 50/100'], ['news, 40/100']), false);
  });

  it('validates keyword entries outside locked schedules', () => {
    assert.equal(validateKeywordEntry('news, -50', false), true);
    assert.equal(validateKeywordEntry('news, -25/100', false), true);
    assert.equal(validateKeywordEntry('news, 50/100', false), true);
    assert.equal(validateKeywordEntry('news, 0', false), false);
    assert.equal(validateKeywordEntry('news, *, 1', false), false);
    assert.equal(validateKeywordEntry('news, *, 50%', false), false);
  });

  it('validates keyword entries inside locked schedules', () => {
    assert.equal(validateKeywordEntry('news, 50', true), true);
    assert.equal(validateKeywordEntry('news, 50%', true), true);
    assert.equal(validateKeywordEntry('news, -50', true), false);
    assert.equal(validateKeywordEntry('news, -25/100', true), false);
    assert.equal(validateKeywordEntry('news, *, 1', true), false);
  });
});
