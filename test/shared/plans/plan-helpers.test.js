// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createDefaultPlanFromItems,
  filterElementRulesForActivePlans,
  getEffectiveGroupsForUrl,
  getEffectiveKeywordsForUrl,
  getEffectiveIntentPolicyForUrl,
  getNextPlanName,
  getProtectedSchedules,
  isInProtectedSchedule,
  isPlanActive,
  normalizePlans,
  sanitizePlansForStorage
} from '../../../src/js/shared/plans.js';
import {
  DEFAULT_INTENT_SETTINGS,
  INTENT_INTERVENTION_ACTIONS,
  INTENT_POMODORO_INFLUENCE_MODES,
  normalizeIntentSettings
} from '../../../src/js/shared/intentCoherence.js';
import {
  DEFAULT_POMODORO_SETTINGS
} from '../../../src/js/shared/pomodoro.js';

describe('plan helpers', () => {
  const mondayMorning = new Date(2026, 4, 25, 10, 30);

  const group = {
    id: 'group_1',
    groupName: 'Search',
    websites: ['example.com'],
    keywords: ['video, 50']
  };

  it('normalizes plan records and defaults missing arrays', () => {
    assert.deepEqual(normalizePlans([{ id: 'plan_1', name: ' Focus ' }]), [{
      id: 'plan_1',
      name: 'Focus',
      enabled: true,
      groupIds: [],
      groups: [],
      allowedSites: [],
      uiRuleIds: [],
      schedules: [],
      pomodoro: { ...DEFAULT_POMODORO_SETTINGS },
      intent: { ...DEFAULT_INTENT_SETTINGS }
    }]);
  });

  it('creates a default plan that owns existing groups', () => {
    assert.deepEqual(createDefaultPlanFromItems({ group_1: group }), {
      id: 'plan_1',
      name: 'Default plan',
      enabled: true,
      groupIds: [],
      groups: [group],
      allowedSites: [],
      uiRuleIds: [],
      schedules: [],
      pomodoro: { ...DEFAULT_POMODORO_SETTINGS },
      intent: { ...DEFAULT_INTENT_SETTINGS }
    });
  });

  it('creates a default plan with legacy schedules and whitelist entries', () => {
    const legacySchedule = {
      name: 'Work',
      days: ['Mon'],
      startTime: '09:00',
      endTime: '17:00',
      weekInterval: 1,
      anchorDate: '',
      isActive: true
    };

    assert.deepEqual(createDefaultPlanFromItems({
      schedules: [legacySchedule],
      whitelistedSites: ['HTTPS://WWW.Example.com/Allowed']
    }), {
      id: 'plan_1',
      name: 'Default plan',
      enabled: true,
      groupIds: [],
      groups: [],
      allowedSites: ['example.com/allowed'],
      uiRuleIds: [],
      schedules: [legacySchedule],
      pomodoro: { ...DEFAULT_POMODORO_SETTINGS },
      intent: { ...DEFAULT_INTENT_SETTINGS }
    });
  });

  it('infers group IDs from storage keys for legacy group records', () => {
    const items = {
      group_1: {
        groupName: 'Legacy',
        websites: ['example.com'],
        keywords: ['legacy, 50']
      },
      plans: [{ id: 'plan_1', enabled: true, groupIds: ['group_1'] }]
    };

    assert.deepEqual(
      getEffectiveGroupsForUrl(items, 'https://example.com/watch', mondayMorning),
      [{ id: 'group_1', groupName: 'Legacy', websites: ['example.com'], keywords: ['legacy, 50'] }]
    );
  });

  it('treats enabled plans without schedules as active', () => {
    assert.equal(isPlanActive({ id: 'plan_1', enabled: true }, mondayMorning), true);
    assert.equal(isPlanActive({ id: 'plan_1', enabled: false }, mondayMorning), false);
  });

  it('uses plan schedules to determine scheduled plan activity', () => {
    const plan = {
      id: 'plan_1',
      enabled: true,
      schedules: [{ days: ['Mon'], startTime: '09:00', endTime: '11:00', isActive: true }]
    };

    assert.equal(isPlanActive(plan, mondayMorning), true);
  });

  it('drops schedule placeholders that have no selected days', () => {
    const plans = normalizePlans([{
      id: 'plan_1',
      enabled: true,
      schedules: [
        { name: 'Empty draft', days: [], startTime: '00:00', endTime: '23:59', isActive: false },
        { name: 'Work', days: ['Mon'], startTime: '09:00', endTime: '11:00', isActive: true }
      ]
    }]);

    assert.deepEqual(plans[0].schedules.map(schedule => schedule.name), ['Work']);
    assert.equal(isPlanActive(plans[0], mondayMorning), true);
  });

  it('sanitizes plans before storage so no-day schedule drafts cannot persist', () => {
    const plans = sanitizePlansForStorage([{
      id: 'plan_1',
      name: 'Focus',
      schedules: [
        { name: 'Draft', days: [], startTime: '09:00', endTime: '10:00', isActive: false },
        { name: 'Work', days: ['Mon'], startTime: '09:00', endTime: '11:00', isActive: true }
      ]
    }]);

    assert.deepEqual(plans[0].schedules, [{
      name: 'Work',
      days: ['Mon'],
      startTime: '09:00',
      endTime: '11:00',
      weekInterval: 1,
      anchorDate: '',
      isActive: true
    }]);
  });

  it('falls back to legacy groups when no plans exist', () => {
    const items = { group_1: group };

    assert.deepEqual(getEffectiveKeywordsForUrl(items, 'https://example.com/watch', mondayMorning), ['video, 50']);
  });

  it('uses only active plan groups when plans exist', () => {
    const items = {
      group_1: group,
      group_2: {
        id: 'group_2',
        groupName: 'Other',
        websites: ['example.com'],
        keywords: ['news, 50']
      },
      plans: [{ id: 'plan_1', enabled: true, groupIds: ['group_1'] }]
    };

    assert.deepEqual(getEffectiveGroupsForUrl(items, 'https://example.com/watch', mondayMorning).map(item => item.id), ['group_1']);
  });

  it('uses plan-owned groups without standalone group records', () => {
    const items = {
      plans: [{
        id: 'plan_1',
        enabled: true,
        groups: [group]
      }]
    };

    assert.deepEqual(getEffectiveKeywordsForUrl(items, 'https://example.com/watch', mondayMorning), ['video, 50']);
  });

  it('skips a plan when its allowed sites match the current URL', () => {
    const items = {
      group_1: group,
      plans: [{ id: 'plan_1', enabled: true, groupIds: ['group_1'], allowedSites: ['example.com'] }]
    };

    assert.deepEqual(getEffectiveKeywordsForUrl(items, 'https://example.com/watch', mondayMorning), []);
  });

  it('combines legacy and enabled plan schedules for protected lock checks', () => {
    const items = {
      schedules: [{ days: ['Tue'], startTime: '09:00', endTime: '11:00', isActive: true }],
      plans: [{
        id: 'plan_1',
        enabled: true,
        schedules: [{ days: ['Mon'], startTime: '09:00', endTime: '11:00', isActive: true }]
      }]
    };

    assert.equal(getProtectedSchedules(items).length, 2);
    assert.equal(isInProtectedSchedule(items, mondayMorning), true);
  });

  it('keeps global UI rules global and gates assigned UI rules by active plan', () => {
    const rules = [
      { id: 'global_rule' },
      { id: 'assigned_rule' },
      { id: 'inactive_rule' }
    ];
    const items = {
      plans: [
        { id: 'plan_1', enabled: true, uiRuleIds: ['assigned_rule'] },
        { id: 'plan_2', enabled: false, uiRuleIds: ['inactive_rule'] }
      ]
    };

    assert.deepEqual(
      filterElementRulesForActivePlans(rules, items, mondayMorning).map(rule => rule.id),
      ['global_rule', 'assigned_rule']
    );
  });

  it('generates the next available plan name', () => {
    assert.equal(getNextPlanName([{ id: 'plan_1', name: 'Plan 1' }]), 'Plan 2');
  });

  it('combines active plan intent settings conservatively', () => {
    const policy = getEffectiveIntentPolicyForUrl({
      plans: [
        {
          id: 'plan_1',
          name: 'Work',
          enabled: true,
          intent: {
            enabled: true,
            action: INTENT_INTERVENTION_ACTIONS.PROMPT,
            interventionThreshold: 45,
            lockedThreshold: 20,
            pomodoroInfluence: INTENT_POMODORO_INFLUENCE_MODES.IGNORE,
            diagnosticsRetentionDays: 14
          }
        },
        {
          id: 'plan_2',
          name: 'Hard lock',
          enabled: true,
          intent: {
            enabled: true,
            action: INTENT_INTERVENTION_ACTIONS.BLOCK,
            interventionThreshold: 55,
            lockedThreshold: 30,
            pomodoroInfluence: INTENT_POMODORO_INFLUENCE_MODES.WORK_STRICTER,
            diagnosticsRetentionDays: 3
          }
        }
      ]
    }, 'https://example.com/', {
      now: mondayMorning,
      pomodoroRuntime: {
        activePlanId: 'plan_2',
        phase: 'work'
      }
    });

    assert.deepEqual(policy.planNames, ['Work', 'Hard lock']);
    assert.deepEqual(policy.settings, normalizeIntentSettings({
      enabled: true,
      action: INTENT_INTERVENTION_ACTIONS.BLOCK,
      interventionThreshold: 65,
      lockedThreshold: 40,
      pomodoroInfluence: INTENT_POMODORO_INFLUENCE_MODES.WORK_STRICTER,
      diagnosticsRetentionDays: 3
    }));
  });

  it('orders reversible visual intent actions between warn and prompt', () => {
    const grayscalePolicy = getEffectiveIntentPolicyForUrl({
      plans: [
        {
          id: 'plan_1',
          enabled: true,
          intent: {
            enabled: true,
            action: INTENT_INTERVENTION_ACTIONS.WARN
          }
        },
        {
          id: 'plan_2',
          enabled: true,
          intent: {
            enabled: true,
            action: INTENT_INTERVENTION_ACTIONS.GRAYSCALE
          }
        }
      ]
    }, 'https://example.com/', { now: mondayMorning });

    assert.equal(grayscalePolicy.settings.action, INTENT_INTERVENTION_ACTIONS.GRAYSCALE);

    const reduceNoisePolicy = getEffectiveIntentPolicyForUrl({
      plans: [
        {
          id: 'plan_1',
          enabled: true,
          intent: {
            enabled: true,
            action: INTENT_INTERVENTION_ACTIONS.GRAYSCALE
          }
        },
        {
          id: 'plan_2',
          enabled: true,
          intent: {
            enabled: true,
            action: INTENT_INTERVENTION_ACTIONS.REDUCE_NOISE
          }
        }
      ]
    }, 'https://example.com/', { now: mondayMorning });

    assert.equal(reduceNoisePolicy.settings.action, INTENT_INTERVENTION_ACTIONS.REDUCE_NOISE);

    const promptPolicy = getEffectiveIntentPolicyForUrl({
      plans: [
        {
          id: 'plan_1',
          enabled: true,
          intent: {
            enabled: true,
            action: INTENT_INTERVENTION_ACTIONS.REDUCE_NOISE
          }
        },
        {
          id: 'plan_2',
          enabled: true,
          intent: {
            enabled: true,
            action: INTENT_INTERVENTION_ACTIONS.PROMPT
          }
        }
      ]
    }, 'https://example.com/', { now: mondayMorning });

    assert.equal(promptPolicy.settings.action, INTENT_INTERVENTION_ACTIONS.PROMPT);
  });

  it('keeps feedback calibration disabled if any contributing plan disables it', () => {
    const policy = getEffectiveIntentPolicyForUrl({
      plans: [
        {
          id: 'plan_1',
          enabled: true,
          intent: {
            enabled: true,
            autoCalibration: true
          }
        },
        {
          id: 'plan_2',
          enabled: true,
          intent: {
            enabled: true,
            autoCalibration: false
          }
        }
      ]
    }, 'https://example.com/', { now: mondayMorning });

    assert.equal(policy.settings.autoCalibration, false);
  });

  it('enables quarantine auto-close if any contributing plan requires it', () => {
    const policy = getEffectiveIntentPolicyForUrl({
      plans: [
        {
          id: 'plan_1',
          enabled: true,
          intent: {
            enabled: true,
            autoCloseQuarantinedTab: false
          }
        },
        {
          id: 'plan_2',
          enabled: true,
          intent: {
            enabled: true,
            autoCloseQuarantinedTab: true
          }
        }
      ]
    }, 'https://example.com/', { now: mondayMorning });

    assert.equal(policy.settings.autoCloseQuarantinedTab, true);
  });

  it('disables intent policy when no active plan contributes', () => {
    const policy = getEffectiveIntentPolicyForUrl({
      plans: [{
        id: 'plan_1',
        enabled: true,
        allowedSites: ['example.com'],
        intent: { enabled: true }
      }]
    }, 'https://example.com/page', { now: mondayMorning });

    assert.equal(policy.settings.enabled, false);
  });
});
