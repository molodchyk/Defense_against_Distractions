// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isPlanChangeAllowedDuringProtectedSchedule } from '../../../src/features/plans/core/index.js';
import {
  DEFAULT_INTENT_SETTINGS,
  INTENT_INTERVENTION_ACTIONS,
  INTENT_POMODORO_INFLUENCE_MODES
} from '../../../src/js/shared/intentCoherence.js';
import { DEFAULT_POMODORO_SETTINGS } from '../../../src/js/shared/pomodoro.js';

describe('protected-schedule plan changes', () => {
  it('allows protected-schedule plan edits that make protection stricter', () => {
    const originalPlan = {
      id: 'plan_1',
      enabled: true,
      groups: [{
        id: 'entry_1',
        groupName: 'Entry',
        websites: ['example.com'],
        keywords: ['video, 50']
      }],
      uiRuleIds: ['hide_feed'],
      pomodoro: {
        ...DEFAULT_POMODORO_SETTINGS,
        enabled: false
      },
      intent: {
        ...DEFAULT_INTENT_SETTINGS,
        enabled: true,
        action: INTENT_INTERVENTION_ACTIONS.GRAYSCALE,
        interventionThreshold: 40,
        lockedThreshold: 20,
        pomodoroInfluence: INTENT_POMODORO_INFLUENCE_MODES.BOTH,
        diagnosticsRetentionDays: 14
      }
    };
    const stricterPlan = {
      ...originalPlan,
      groups: [{
        ...originalPlan.groups[0],
        websites: ['example.com', 'news.example.com'],
        keywords: ['video, 75', 'shorts, 100']
      }],
      uiRuleIds: ['hide_feed', 'hide_comments'],
      pomodoro: {
        ...DEFAULT_POMODORO_SETTINGS,
        enabled: true,
        strictBreaks: true
      },
      intent: {
        ...originalPlan.intent,
        action: INTENT_INTERVENTION_ACTIONS.BLOCK,
        interventionThreshold: 55,
        lockedThreshold: 35,
        pomodoroInfluence: INTENT_POMODORO_INFLUENCE_MODES.WORK_STRICTER,
        diagnosticsRetentionDays: 7
      }
    };

    assert.equal(isPlanChangeAllowedDuringProtectedSchedule(originalPlan, stricterPlan), true);
  });

  it('allows stricter entry edits when Pomodoro and intent are unchanged disabled defaults', () => {
    const originalPlan = {
      id: 'plan_1',
      enabled: true,
      groups: [{
        id: 'entry_1',
        groupName: 'Entry',
        websites: ['example.com'],
        keywords: ['video, 50']
      }],
      pomodoro: {
        ...DEFAULT_POMODORO_SETTINGS,
        enabled: false
      },
      intent: {
        ...DEFAULT_INTENT_SETTINGS,
        enabled: false
      }
    };
    const stricterPlan = {
      ...originalPlan,
      groups: [{
        ...originalPlan.groups[0],
        websites: ['example.com', 'news.example.com'],
        keywords: ['video, 75', 'shorts, 100']
      }]
    };

    assert.equal(isPlanChangeAllowedDuringProtectedSchedule(originalPlan, stricterPlan), true);
  });

  it('rejects protected-schedule plan edits that relax protection', () => {
    const protectedPlan = {
      id: 'plan_1',
      enabled: true,
      groups: [{
        id: 'entry_1',
        groupName: 'Entry',
        websites: ['example.com'],
        keywords: ['video, 100']
      }],
      allowedSites: [],
      uiRuleIds: ['hide_feed'],
      pomodoro: {
        ...DEFAULT_POMODORO_SETTINGS,
        enabled: true,
        strictBreaks: true
      },
      intent: {
        ...DEFAULT_INTENT_SETTINGS,
        enabled: true,
        action: INTENT_INTERVENTION_ACTIONS.PROMPT,
        interventionThreshold: 50,
        lockedThreshold: 25,
        diagnosticsRetentionDays: 7
      }
    };

    [
      { ...protectedPlan, enabled: false },
      { ...protectedPlan, groups: [{ ...protectedPlan.groups[0], websites: [] }] },
      { ...protectedPlan, groups: [{ ...protectedPlan.groups[0], keywords: ['video, 50'] }] },
      { ...protectedPlan, groups: [{ ...protectedPlan.groups[0], keywords: ['video, 100', 'news, -50'] }] },
      { ...protectedPlan, allowedSites: ['example.com'] },
      { ...protectedPlan, uiRuleIds: [] },
      { ...protectedPlan, pomodoro: { ...protectedPlan.pomodoro, enabled: false } },
      { ...protectedPlan, intent: { ...protectedPlan.intent, action: INTENT_INTERVENTION_ACTIONS.WARN } }
    ].forEach(nextPlan => {
      assert.equal(isPlanChangeAllowedDuringProtectedSchedule(protectedPlan, nextPlan), false);
    });
  });
});
