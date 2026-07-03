// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  QUICK_ADD_CREATE_ENTRY_VALUE,
  applySelectedTextQuickAdd,
  formatQuickAddKeywordLine,
  getDefaultQuickAddGroupId,
  getDefaultQuickAddTarget,
  getQuickAddHostPattern,
  normalizeQuickAddScore,
  upsertQuickAddKeyword
} from '../../../src/js/popup/quick-add/selectedTextQuickAddModel.js';
import {
  isPlanChangeAllowedDuringProtectedSchedule
} from '../../../src/js/shared/plans.js';

const ACTIVE_NOW = new Date('2026-07-03T12:00:00Z');

function basePlan(overrides = {}) {
  return {
    id: 'default',
    name: 'Default plan',
    enabled: true,
    groupIds: [],
    allowedSites: [],
    uiRuleIds: [],
    schedules: [],
    pomodoro: {},
    intent: {},
    groups: [{
      id: 'entry_matching',
      groupName: 'Matching',
      websites: ['mail.google.com'],
      keywords: ['old topic, 10/100']
    }, {
      id: 'entry_other',
      groupName: 'Other',
      websites: ['example.com'],
      keywords: []
    }],
    ...overrides
  };
}

describe('selected text quick-add model', () => {
  it('formats a selected text candidate as a normal keyword rule with editable score', () => {
    assert.equal(normalizeQuickAddScore('150'), 100);
    assert.equal(normalizeQuickAddScore('0'), 1);
    assert.equal(getQuickAddHostPattern('https://www.mail.google.com/mail/u/0'), 'mail.google.com');
    assert.equal(formatQuickAddKeywordLine({
      text: '  Rama Aurora, thread ',
      estimatedScore100: 36
    }, 42), 'Rama Aurora\\, thread, 42/100');
  });

  it('defaults to a current-page matching entry when one exists', () => {
    assert.deepEqual(getDefaultQuickAddTarget(
      [basePlan()],
      'https://mail.google.com/mail/u/0/#inbox',
      ACTIVE_NOW
    ), {
      planId: 'default',
      groupId: 'entry_matching'
    });
  });

  it('picks the current-page entry inside the user-selected plan', () => {
    const secondPlan = basePlan({
      id: 'second',
      name: 'Second plan',
      groups: [{
        id: 'second_matching',
        groupName: 'Second matching',
        websites: ['mail.google.com'],
        keywords: []
      }]
    });

    assert.deepEqual(getDefaultQuickAddTarget(
      [basePlan(), secondPlan],
      'https://mail.google.com/mail/u/0/#inbox',
      ACTIVE_NOW
    ), {
      planId: 'default',
      groupId: 'entry_matching'
    });
    assert.equal(getDefaultQuickAddGroupId(secondPlan, 'https://mail.google.com/mail/u/0/#inbox'), 'second_matching');
  });

  it('appends a selected text keyword to an existing matching entry', () => {
    const result = applySelectedTextQuickAdd([basePlan()], {
      planId: 'default',
      groupId: 'entry_matching',
      candidate: { text: 'Rama Aurora', estimatedScore100: 36 },
      score: 36,
      url: 'https://mail.google.com/mail/u/0/#inbox',
      now: ACTIVE_NOW
    });

    assert.equal(result.changed, true);
    assert.equal(result.status, 'added');
    assert.equal(result.currentPage.matches, true);
    assert.equal(result.currentPage.wouldBlockByKeywordAlone, false);
    assert.deepEqual(result.plans[0].groups[0].keywords, [
      'old topic, 10/100',
      'Rama Aurora, 36/100'
    ]);
  });

  it('creates a current-host entry when no selected entry exists', () => {
    const result = applySelectedTextQuickAdd([basePlan({ groups: [] })], {
      planId: 'default',
      groupId: QUICK_ADD_CREATE_ENTRY_VALUE,
      candidate: { text: 'Rama Aurora', estimatedScore100: 100 },
      score: 100,
      url: 'https://mail.google.com/mail/u/0/#inbox',
      now: ACTIVE_NOW,
      createEntryName: 'Quick add'
    });

    assert.equal(result.changed, true);
    assert.equal(result.status, 'created');
    assert.equal(result.currentPage.matches, true);
    assert.equal(result.currentPage.wouldBlockByKeywordAlone, true);
    assert.deepEqual(result.plans[0].groups[0], {
      id: 'default_quick_add_mr4vslc0',
      groupName: 'Quick add',
      websites: ['mail.google.com'],
      keywords: ['Rama Aurora, 100/100']
    });
  });

  it('raises an existing additive keyword but does not weaken covered entries', () => {
    assert.deepEqual(upsertQuickAddKeyword(['Rama Aurora, 20/100'], 'Rama Aurora, 40/100'), {
      changed: true,
      keywords: ['Rama Aurora, 40/100'],
      reason: 'raised'
    });
    assert.deepEqual(upsertQuickAddKeyword(['Rama Aurora'], 'Rama Aurora, 40/100'), {
      changed: false,
      keywords: ['Rama Aurora'],
      reason: 'alreadyCovered'
    });
    assert.deepEqual(upsertQuickAddKeyword(['Rama Aurora, *, 2'], 'Rama Aurora, 40/100'), {
      changed: false,
      keywords: ['Rama Aurora, *, 2'],
      reason: 'alreadyCovered'
    });
  });

  it('produces stricter plan changes accepted by the protected-schedule comparator', () => {
    const originalPlan = basePlan();
    const added = applySelectedTextQuickAdd([originalPlan], {
      planId: 'default',
      groupId: 'entry_matching',
      candidate: { text: 'Rama Aurora', estimatedScore100: 36 },
      score: 36,
      url: 'https://mail.google.com/mail/u/0/#inbox',
      now: ACTIVE_NOW
    });
    const raised = applySelectedTextQuickAdd([basePlan({
      groups: [{
        id: 'entry_matching',
        groupName: 'Matching',
        websites: ['mail.google.com'],
        keywords: ['Rama Aurora, 20/100']
      }]
    })], {
      planId: 'default',
      groupId: 'entry_matching',
      candidate: { text: 'Rama Aurora', estimatedScore100: 60 },
      score: 60,
      url: 'https://mail.google.com/mail/u/0/#inbox',
      now: ACTIVE_NOW
    });

    assert.equal(isPlanChangeAllowedDuringProtectedSchedule(originalPlan, added.plan), true);
    assert.equal(isPlanChangeAllowedDuringProtectedSchedule(basePlan({
      groups: [{
        id: 'entry_matching',
        groupName: 'Matching',
        websites: ['mail.google.com'],
        keywords: ['Rama Aurora, 20/100']
      }]
    }), raised.plan), true);
  });
});
