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
  getScheduleActivityCounts,
  isCurrentTimeInAnySchedule,
  timeStringToMinutes
} from '../src/js/shared/scheduleTime.js';
import {
  formatScheduleActivitySummary
} from '../src/js/shared/scheduleSummary.js';
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
  createLegacyWebsiteGroupsMigration
} from '../src/js/shared/legacyMigration.js';
import {
  isScheduleDraftComplete
} from '../src/js/options/scheduleBoard.js';
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
} from '../src/js/shared/plans.js';
import {
  createScheduleRangeFromAnchor,
  createScheduleRangeFromStart,
  minutesToTimeString,
  moveScheduleRange,
  resizeScheduleRange,
  snapMinutes
} from '../src/js/shared/scheduleGrid.js';
import {
  areKeywordChangesValid,
  areWebsiteChangesValid,
  getNextUnnamedGroupName,
  getStoredGroups,
  validateKeywordEntry
} from '../src/js/shared/groupRules.js';
import {
  normalizeThemeMode,
  resolveThemeMode
} from '../src/js/shared/theme.js';
import {
  formatLocalizedMessage,
  normalizeUiLanguage
} from '../src/js/shared/uiLanguage.js';
import {
  collectPageSignals,
  extractTopTextTokens
} from '../src/js/shared/pageSignals.js';
import {
  buildUsageStatsExportPayload,
  createUsageStatsState,
  normalizeUsageStats,
  recordUsagePageSignal,
  summarizeUsageStats
} from '../src/js/shared/usageStats.js';
import {
  applyIntentFeedbackCalibration,
  calculateIntentCoherence,
  calculateTokenSimilarity,
  createIntentTrajectoryState,
  DEFAULT_INTENT_SETTINGS,
  deriveIntentFeedbackCalibration,
  extractIntentTokens,
  getActiveIntentSession,
  getIntentDriftDescendantTabIds,
  getIntentInterventionDecision,
  getIntentRiskState,
  getIntentSessionForTab,
  getIntentTabLineageEntry,
  getLastCoherentIntentVisit,
  INTENT_INTERVENTION_ACTIONS,
  INTENT_POMODORO_INFLUENCE_MODES,
  normalizeIntentSettings,
  recordIntentFeedback,
  recordIntentNavigationTransition,
  recordIntentPageVisit,
  recordIntentTabActivation,
  recordIntentTabCreated,
  recordIntentTabRemoved,
  summarizeIntentFeedback
} from '../src/js/shared/intentCoherence.js';
import {
  hasExistingConfiguration
} from '../src/js/shared/releaseBackupNotice.js';
import {
  buildEntitlementCheckUrl,
  getEntitlementLabel,
  hasBillingIdentity,
  isBillingEnabled,
  isEntitlementActive,
  normalizeBillingConfig,
  normalizeBillingEntitlement,
  normalizeBillingIdentity
} from '../src/js/shared/billing.js';
import {
  DEFAULT_POMODORO_SETTINGS,
  POMODORO_PAUSE_REASONS,
  POMODORO_PHASES,
  POMODORO_SYSTEM_STATES,
  completePomodoroPhase,
  completePomodoroWorkIfRestSatisfied,
  createPomodoroHistoryState,
  getPomodoroActivityStatus,
  getPomodoroRemainingMs,
  getPomodoroRestCreditMs,
  normalizePomodoroHistoryState,
  normalizePomodoroSettings,
  pausePomodoroForSystemState,
  pausePomodoro,
  recordPomodoroActivity,
  recordPomodoroHistoryEvent,
  recordPomodoroSystemState,
  resumePomodoro,
  resumePomodoroFromSystemPause,
  startPomodoroWork
} from '../src/js/shared/pomodoro.js';

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
      weekInterval: 1,
      anchorDate: '',
      isActive: false
    });
  });
});

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

  it('orders grayscale between warn and prompt for active plan intent settings', () => {
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

    const promptPolicy = getEffectiveIntentPolicyForUrl({
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

describe('legacy migration helpers', () => {
  it('turns legacy websiteGroups into group records and removes the legacy key', () => {
    const migration = createLegacyWebsiteGroupsMigration({
      groupCounter: 1,
      websiteGroups: [{
        groupName: 'Legacy',
        websites: ['example.com'],
        keywords: ['news, 50']
      }]
    });

    assert.equal(migration.changed, true);
    assert.deepEqual(migration.removeKeys, ['websiteGroups']);
    assert.equal(migration.setItems.groupCounter, 2);
    assert.deepEqual(migration.setItems.group_2, {
      id: 'group_2',
      groupName: 'Legacy',
      websites: ['example.com'],
      keywords: ['news, 50']
    });
  });

  it('skips occupied group ids during legacy migration', () => {
    const migration = createLegacyWebsiteGroupsMigration({
      groupCounter: 1,
      group_2: { id: 'group_2' },
      websiteGroups: [{
        groupName: 'Legacy',
        websites: [],
        keywords: []
      }]
    });

    assert.equal(migration.setItems.groupCounter, 3);
    assert.equal(migration.setItems.group_3.id, 'group_3');
  });

  it('does nothing when legacy websiteGroups storage is absent', () => {
    assert.deepEqual(createLegacyWebsiteGroupsMigration({}), {
      changed: false,
      setItems: {},
      removeKeys: [],
      migratedGroups: []
    });
  });
});

describe('pomodoro helpers', () => {
  const now = Date.UTC(2026, 0, 1, 10, 0, 0);

  it('normalizes Pomodoro settings into bounded plan config', () => {
    assert.deepEqual(normalizePomodoroSettings({
      enabled: true,
      workMinutes: 0,
      shortBreakMinutes: 2000,
      longBreakMinutes: 'not-a-number',
      sessionsBeforeLongBreak: 50,
      strictBreaks: true,
      autoStart: true
    }), {
      enabled: true,
      workMinutes: 1,
      shortBreakMinutes: 1440,
      longBreakMinutes: DEFAULT_POMODORO_SETTINGS.longBreakMinutes,
      sessionsBeforeLongBreak: 12,
      strictBreaks: true,
      autoStart: true
    });
  });

  it('starts work and advances to a short break after one completed work period', () => {
    const settings = {
      ...DEFAULT_POMODORO_SETTINGS,
      workMinutes: 25,
      shortBreakMinutes: 5
    };
    const workRuntime = startPomodoroWork('plan_1', settings, now);

    assert.equal(workRuntime.phase, POMODORO_PHASES.WORK);
    assert.equal(getPomodoroRemainingMs(workRuntime, now), 25 * 60 * 1000);

    const breakRuntime = completePomodoroPhase(workRuntime, settings, now + 25 * 60 * 1000);
    assert.equal(breakRuntime.phase, POMODORO_PHASES.SHORT_BREAK);
    assert.equal(breakRuntime.completedWorkSessions, 1);
    assert.equal(getPomodoroRemainingMs(breakRuntime, now + 25 * 60 * 1000), 5 * 60 * 1000);
  });

  it('uses a long break after the configured number of work sessions', () => {
    const settings = {
      ...DEFAULT_POMODORO_SETTINGS,
      longBreakMinutes: 15,
      sessionsBeforeLongBreak: 4
    };
    const runtime = {
      ...startPomodoroWork('plan_1', settings, now),
      completedWorkSessions: 3
    };

    const breakRuntime = completePomodoroPhase(runtime, settings, now + 25 * 60 * 1000);
    assert.equal(breakRuntime.phase, POMODORO_PHASES.LONG_BREAK);
    assert.equal(breakRuntime.completedWorkSessions, 4);
    assert.equal(getPomodoroRemainingMs(breakRuntime, now + 25 * 60 * 1000), 15 * 60 * 1000);
  });

  it('pauses and resumes the active phase without losing remaining time', () => {
    const runtime = startPomodoroWork('plan_1', DEFAULT_POMODORO_SETTINGS, now);
    const paused = pausePomodoro(runtime, now + 5 * 60 * 1000);

    assert.equal(paused.phase, POMODORO_PHASES.PAUSED);
    assert.equal(paused.pausedPhase, POMODORO_PHASES.WORK);
    assert.equal(paused.pausedRemainingMs, 20 * 60 * 1000);

    const resumed = resumePomodoro(paused, now + 10 * 60 * 1000);
    assert.equal(resumed.phase, POMODORO_PHASES.WORK);
    assert.equal(getPomodoroRemainingMs(resumed, now + 10 * 60 * 1000), 20 * 60 * 1000);
  });

  it('credits system locked time against the next break without moving the work anchor', () => {
    const settings = {
      ...DEFAULT_POMODORO_SETTINGS,
      workMinutes: 25,
      shortBreakMinutes: 5
    };
    const runtime = startPomodoroWork('plan_1', settings, now);
    const locked = pausePomodoroForSystemState(runtime, POMODORO_SYSTEM_STATES.LOCKED, now + 20 * 60 * 1000);

    assert.equal(locked.phase, POMODORO_PHASES.WORK);
    assert.equal(getPomodoroRemainingMs(locked, now + 20 * 60 * 1000), 5 * 60 * 1000);
    assert.equal(getPomodoroRestCreditMs(locked, now + 22 * 60 * 1000), 2 * 60 * 1000);

    const resumed = resumePomodoroFromSystemPause(locked, now + 22 * 60 * 1000);
    assert.equal(resumed.phase, POMODORO_PHASES.WORK);
    assert.equal(resumed.restCreditMs, 2 * 60 * 1000);
    assert.equal(getPomodoroRemainingMs(resumed, now + 22 * 60 * 1000), 3 * 60 * 1000);

    const breakRuntime = completePomodoroPhase(resumed, settings, now + 25 * 60 * 1000);
    assert.equal(breakRuntime.phase, POMODORO_PHASES.SHORT_BREAK);
    assert.equal(getPomodoroRemainingMs(breakRuntime, now + 25 * 60 * 1000), 3 * 60 * 1000);
  });

  it('skips the break when away credit already satisfies the required rest', () => {
    const settings = {
      ...DEFAULT_POMODORO_SETTINGS,
      workMinutes: 25,
      shortBreakMinutes: 5
    };
    const runtime = startPomodoroWork('plan_1', settings, now);
    const idle = pausePomodoroForSystemState(runtime, POMODORO_SYSTEM_STATES.IDLE, now + 10 * 60 * 1000);
    const resumed = resumePomodoroFromSystemPause(idle, now + 20 * 60 * 1000);

    assert.equal(resumed.phase, POMODORO_PHASES.WORK);
    assert.equal(resumed.restCreditMs, 10 * 60 * 1000);

    const completed = completePomodoroWorkIfRestSatisfied(resumed, settings, now + 20 * 60 * 1000);
    assert.equal(completed.phase, POMODORO_PHASES.COMPLETED);
    assert.equal(completed.completedWorkSessions, 1);

    const restarted = startPomodoroWork('plan_1', settings, now + 20 * 60 * 1000, completed);
    assert.equal(restarted.phase, POMODORO_PHASES.WORK);
    assert.equal(restarted.phaseStartedAt, new Date(now + 20 * 60 * 1000).toISOString());
    assert.equal(getPomodoroRemainingMs(restarted, now + 20 * 60 * 1000), 25 * 60 * 1000);
    assert.equal(restarted.restCreditMs, 0);
  });

  it('marks the cycle completed when a normal break ends', () => {
    const settings = {
      ...DEFAULT_POMODORO_SETTINGS,
      workMinutes: 25,
      shortBreakMinutes: 5
    };
    const workRuntime = startPomodoroWork('plan_1', settings, now);
    const breakRuntime = completePomodoroPhase(workRuntime, settings, now + 25 * 60 * 1000);
    const completed = completePomodoroPhase(breakRuntime, settings, now + 30 * 60 * 1000);

    assert.equal(completed.phase, POMODORO_PHASES.COMPLETED);
    assert.equal(completed.activePlanId, 'plan_1');
    assert.equal(completed.completedWorkSessions, 1);
  });

  it('credits in-progress away time only up to the anchored work end', () => {
    const settings = {
      ...DEFAULT_POMODORO_SETTINGS,
      workMinutes: 25,
      shortBreakMinutes: 5
    };
    const runtime = startPomodoroWork('plan_1', settings, now);
    const locked = pausePomodoroForSystemState(runtime, POMODORO_SYSTEM_STATES.LOCKED, now + 24 * 60 * 1000);

    assert.equal(getPomodoroRestCreditMs(locked, now + 30 * 60 * 1000), 1 * 60 * 1000);

    const breakRuntime = completePomodoroPhase(locked, settings, now + 25 * 60 * 1000);
    assert.equal(breakRuntime.phase, POMODORO_PHASES.SHORT_BREAK);
    assert.equal(getPomodoroRemainingMs(breakRuntime, now + 25 * 60 * 1000), 4 * 60 * 1000);
  });

  it('does not auto-resume manually paused timers on system activity', () => {
    const runtime = startPomodoroWork('plan_1', DEFAULT_POMODORO_SETTINGS, now);
    const manuallyPaused = pausePomodoro(runtime, now + 5 * 60 * 1000);
    const stillPaused = resumePomodoroFromSystemPause(manuallyPaused, now + 10 * 60 * 1000);

    assert.equal(stillPaused.phase, POMODORO_PHASES.PAUSED);
    assert.equal(stillPaused.pauseReason, POMODORO_PAUSE_REASONS.MANUAL);
  });

  it('counts nearby activity as active browser time', () => {
    const first = recordPomodoroActivity({}, { reason: 'pageVisible' }, now);
    const second = recordPomodoroActivity(first, { reason: 'scroll' }, now + 15 * 1000);
    const status = getPomodoroActivityStatus(second, now + 30 * 1000);

    assert.equal(second.activeMsToday, 15 * 1000);
    assert.equal(status.isActive, true);
    assert.equal(status.activeTodayText, '15s');
  });

  it('does not count long away gaps as active browser time', () => {
    const first = recordPomodoroActivity({}, { reason: 'pageVisible' }, now);
    const second = recordPomodoroActivity(first, { reason: 'click' }, now + 5 * 60 * 1000);
    const status = getPomodoroActivityStatus(second, now + 8 * 60 * 1000);

    assert.equal(second.activeMsToday, 0);
    assert.equal(status.isActive, false);
  });

  it('does not count system locked time as active browser time', () => {
    const first = recordPomodoroActivity({}, { reason: 'pageVisible' }, now);
    const locked = recordPomodoroSystemState(first, POMODORO_SYSTEM_STATES.LOCKED, now + 10 * 1000);
    const active = recordPomodoroActivity(locked, { reason: 'systemActive' }, now + 70 * 1000);
    const status = getPomodoroActivityStatus(locked, now + 30 * 1000);

    assert.equal(status.isActive, false);
    assert.equal(status.stateLabel, 'Locked');
    assert.equal(active.activeMsToday, 0);
  });

  it('records local Pomodoro history stats for credited rest and skipped breaks', () => {
    const history = recordPomodoroHistoryEvent(createPomodoroHistoryState(now), {
      type: 'workCompleted',
      planId: 'plan_1',
      planName: 'Default plan',
      phase: POMODORO_PHASES.WORK,
      nextPhase: POMODORO_PHASES.COMPLETED,
      at: new Date(now).toISOString(),
      workMs: 20 * 60 * 1000,
      requiredRestMs: 5 * 60 * 1000,
      creditedRestMs: 5 * 60 * 1000,
      restReason: POMODORO_PAUSE_REASONS.SYSTEM_LOCKED,
      skippedBreak: true
    }, now);

    assert.equal(history.totals.workSessionsCompleted, 1);
    assert.equal(history.totals.workMs, 20 * 60 * 1000);
    assert.equal(history.totals.creditedRestMs, 5 * 60 * 1000);
    assert.equal(history.totals.lockedRestCreditMs, 5 * 60 * 1000);
    assert.equal(history.totals.skippedBreaks, 1);
    assert.equal(history.recent.length, 1);
  });

  it('resets Pomodoro history on a new day', () => {
    const history = recordPomodoroHistoryEvent(createPomodoroHistoryState(now), {
      type: 'workStarted',
      startType: 'manual',
      at: new Date(now).toISOString()
    }, now);
    const nextDay = now + 24 * 60 * 60 * 1000;

    assert.equal(history.totals.workSessionsStarted, 1);
    assert.equal(normalizePomodoroHistoryState(history, nextDay).totals.workSessionsStarted, 0);
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

describe('theme helpers', () => {
  it('defaults unknown theme modes to system', () => {
    assert.equal(normalizeThemeMode('sepia'), 'system');
  });

  it('resolves system mode from the current color preference', () => {
    assert.equal(resolveThemeMode('system', true), 'dark');
    assert.equal(resolveThemeMode('system', false), 'light');
  });

  it('keeps explicit theme modes regardless of system preference', () => {
    assert.equal(resolveThemeMode('dark', false), 'dark');
    assert.equal(resolveThemeMode('light', true), 'light');
  });
});

describe('UI language helpers', () => {
  it('normalizes supported browser locale codes', () => {
    assert.equal(normalizeUiLanguage('system'), 'system');
    assert.equal(normalizeUiLanguage('de-DE'), 'de');
    assert.equal(normalizeUiLanguage('pt-BR'), 'pt_BR');
    assert.equal(normalizeUiLanguage('es-419'), 'es_419');
    assert.equal(normalizeUiLanguage('unknown-locale'), 'system');
  });

  it('formats Chrome-style named and positional placeholders', () => {
    assert.equal(formatLocalizedMessage({
      message: 'Selected $LANGUAGE$ for $1',
      placeholders: {
        language: { content: '$2' }
      }
    }, ['DaD', 'Deutsch']), 'Selected Deutsch for DaD');
  });
});

describe('page signal helpers', () => {
  function createFakeRoot(counts, text = '') {
    return {
      location: {
        href: 'https://example.com/feed',
        hostname: 'example.com'
      },
      body: {
        innerText: text
      },
      querySelectorAll(selector) {
        return Array.from({ length: counts[selector] || 0 });
      }
    };
  }

  it('collects page media, interaction, and structure counts', () => {
    const root = createFakeRoot({
      'a[href]': 8,
      'img, picture, svg': 3,
      video: 2,
      audio: 1,
      'img[src*=".gif" i], source[src*=".gif" i]': 1,
      'button, [role="button"]': 5,
      'input, textarea, select, [contenteditable="true"]': 2,
      form: 1,
      iframe: 4,
      '[role="feed"], [aria-label*="feed" i], [class*="feed" i]': 1,
      '*': 40
    }, 'hello world 🎯');
    const signals = collectPageSignals(root);

    assert.match(signals.collectedAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.deepEqual({
      ...signals,
      collectedAt: 'timestamp'
    }, {
      url: 'https://example.com/feed',
      hostname: 'example.com',
      title: '',
      collectedAt: 'timestamp',
      text: {
        sampleLength: 14,
        wordCount: 2,
        emojiCount: 1,
        topTokens: ['hello', 'world']
      },
      media: {
        imageCount: 3,
        videoCount: 2,
        audioCount: 1,
        gifCount: 1,
        iframeCount: 4
      },
      interaction: {
        linkCount: 8,
        buttonCount: 5,
        inputCount: 2,
        formCount: 1
      },
      structure: {
        elementCount: 40,
        feedCount: 1
      },
      activity: {
        pageAgeMs: 0,
        activePageMs: 0,
        scrollEvents: 0,
        clickEvents: 0,
        recommenderClickEvents: 0,
        keyEvents: 0,
        inputEvents: 0,
        scrollRatePerMinute: 0,
        clickRatePerMinute: 0,
        recommenderClickRatePerMinute: 0,
        keyRatePerMinute: 0,
        inputRatePerMinute: 0,
        maxScrollDepthRatio: 0
      }
    });
  });

  it('extracts bounded visible-text topic tokens by frequency', () => {
    assert.deepEqual(
      extractTopTextTokens('PDE5 mechanism PDE5 sildenafil news news news', 3),
      ['news', 'pde5', 'mechanism']
    );
  });

  it('limits text samples before counting text signals', () => {
    const root = createFakeRoot({}, 'one two three four');
    const signals = collectPageSignals(root, { textSampleLimit: 7 });

    assert.equal(signals.text.sampleLength, 7);
    assert.equal(signals.text.wordCount, 2);
    assert.deepEqual(signals.text.topTokens, ['one', 'two']);
  });

  it('includes summarized activity signals without recording raw input', () => {
    const root = createFakeRoot({}, 'activity test');
    const signals = collectPageSignals(root, {
      activity: {
        pageAgeMs: 60000,
        activePageMs: 60000,
        scrollEvents: 12,
        clickEvents: 3,
        recommenderClickEvents: 2,
        keyEvents: 4,
        inputEvents: 2,
        maxScrollDepthRatio: 0.8
      }
    });

    assert.deepEqual(signals.activity, {
      pageAgeMs: 60000,
      activePageMs: 60000,
      scrollEvents: 12,
      clickEvents: 3,
      recommenderClickEvents: 2,
      keyEvents: 4,
      inputEvents: 2,
      scrollRatePerMinute: 12,
      clickRatePerMinute: 3,
      recommenderClickRatePerMinute: 2,
      keyRatePerMinute: 4,
      inputRatePerMinute: 2,
      maxScrollDepthRatio: 0.8
    });
  });
});

describe('usage stats helpers', () => {
  const baseNow = Date.parse('2026-06-09T08:00:00.000Z');

  function usageSignal(overrides = {}) {
    return {
      url: 'https://www.video.example.com/watch?v=private',
      hostname: 'www.video.example.com',
      title: 'Private browsing title',
      text: {
        sampleLength: 500,
        wordCount: 80,
        emojiCount: 2,
        topTokens: ['private', 'secret']
      },
      media: {
        imageCount: 3,
        videoCount: 1,
        audioCount: 0,
        gifCount: 2,
        iframeCount: 1
      },
      interaction: {
        linkCount: 20,
        buttonCount: 5,
        inputCount: 1,
        formCount: 0
      },
      structure: {
        elementCount: 100,
        feedCount: 1
      },
      activity: {
        pageAgeMs: 10000,
        activePageMs: 4000
      },
      ...overrides
    };
  }

  it('records bounded hostname aggregates without raw URL, title, or tokens', () => {
    const state = recordUsagePageSignal(
      createUsageStatsState(baseNow),
      usageSignal(),
      {
        now: () => baseNow + 10000,
        tabId: 1,
        frameId: 0,
        documentId: 'doc-1',
        tabCount: 9,
        windowCount: 2
      }
    );
    const day = state.days[0];
    const domain = day.domains[0];
    const serialized = JSON.stringify(state);

    assert.equal(domain.hostname, 'video.example.com');
    assert.equal(domain.visits, 1);
    assert.equal(domain.activeMs, 4000);
    assert.equal(domain.tabMax, 9);
    assert.equal(domain.windowMax, 2);
    assert.equal(day.tabMax, 9);
    assert.equal(day.windowMax, 2);
    assert.equal(domain.mediaMax.videoCount, 1);
    assert.equal(domain.interactionMax.linkCount, 20);
    assert.equal(serialized.includes('watch?v=private'), false);
    assert.equal(serialized.includes('Private browsing title'), false);
    assert.equal(serialized.includes('secret'), false);
  });

  it('uses activity deltas for repeated samples in one page context', () => {
    const firstState = recordUsagePageSignal(
      createUsageStatsState(baseNow),
      usageSignal(),
      {
        now: () => baseNow + 10000,
        tabId: 1,
        frameId: 0,
        documentId: 'doc-1',
        tabCount: 8,
        windowCount: 1
      }
    );
    const secondState = recordUsagePageSignal(
      firstState,
      usageSignal({
        activity: {
          pageAgeMs: 15000,
          activePageMs: 9000
        }
      }),
      {
        now: () => baseNow + 15000,
        tabId: 1,
        frameId: 0,
        documentId: 'doc-1',
        tabCount: 11,
        windowCount: 2
      }
    );
    const domain = secondState.days[0].domains[0];

    assert.equal(secondState.days[0].samples, 2);
    assert.equal(secondState.days[0].visits, 1);
    assert.equal(secondState.days[0].activeMs, 9000);
    assert.equal(secondState.days[0].dwellMs, 15000);
    assert.equal(secondState.days[0].tabMax, 11);
    assert.equal(secondState.days[0].windowMax, 2);
    assert.equal(domain.samples, 2);
    assert.equal(domain.visits, 1);
    assert.equal(domain.tabMax, 11);
  });

  it('prunes old days and caps retained domains', () => {
    const oldDay = {
      dayKey: '2026-06-01',
      samples: 1,
      visits: 1,
      activeMs: 1000,
      dwellMs: 1000,
      updatedAt: '2026-06-01T12:00:00.000Z',
      domains: [{ hostname: 'old.example.com', samples: 1, visits: 1 }]
    };
    const today = {
      dayKey: '2026-06-09',
      samples: 3,
      visits: 3,
      activeMs: 3000,
      dwellMs: 3000,
      tabMax: 12,
      windowMax: 2,
      updatedAt: '2026-06-09T12:00:00.000Z',
      domains: [
        { hostname: 'first.example.com', samples: 1, visits: 1, activeMs: 1000, tabMax: 4 },
        { hostname: 'second.example.com', samples: 1, visits: 1, activeMs: 3000, tabMax: 12 },
        { hostname: 'third.example.com', samples: 1, visits: 1, activeMs: 2000, tabMax: 8 }
      ]
    };
    const state = normalizeUsageStats(
      {
        createdAt: '2026-06-01T12:00:00.000Z',
        updatedAt: '2026-06-09T12:00:00.000Z',
        days: [oldDay, today],
        contexts: []
      },
      {
        now: () => Date.parse('2026-06-09T12:00:00.000Z'),
        retentionDays: 2,
        maxDomainsPerDay: 2
      }
    );
    const summary = summarizeUsageStats(state, {
      now: () => Date.parse('2026-06-09T12:00:00.000Z')
    });

    assert.deepEqual(state.days.map(day => day.dayKey), ['2026-06-09']);
    assert.deepEqual(
      state.days[0].domains.map(domain => domain.hostname),
      ['second.example.com', 'third.example.com']
    );
    assert.equal(summary.total.domainCount, 2);
    assert.equal(summary.today.tabMax, 12);
    assert.equal(summary.total.tabMax, 12);
  });

  it('builds an inspectable local export payload without raw browsing strings', () => {
    const state = recordUsagePageSignal(
      createUsageStatsState(baseNow),
      usageSignal(),
      {
        now: () => baseNow + 10000,
        tabId: 1,
        frameId: 0,
        documentId: 'doc-1',
        tabCount: 7,
        windowCount: 1
      }
    );
    const payload = buildUsageStatsExportPayload(state, {
      exportedAt: '2026-06-09T08:00:30.000Z',
      now: () => baseNow + 30000
    });
    const serialized = JSON.stringify(payload);

    assert.equal(payload.schema, 'dad.usageStats.v1');
    assert.equal(payload.exportedAt, '2026-06-09T08:00:30.000Z');
    assert.equal(payload.summary.today.visits, 1);
    assert.equal(payload.summary.today.tabMax, 7);
    assert.equal(payload.state.days[0].domains[0].hostname, 'video.example.com');
    assert.equal(payload.state.days[0].domains[0].tabMax, 7);
    assert.equal(serialized.includes('watch?v=private'), false);
    assert.equal(serialized.includes('Private browsing title'), false);
    assert.equal(serialized.includes('secret'), false);
  });
});

describe('intent coherence helpers', () => {
  function pageSignal(overrides = {}) {
    return {
      url: 'https://docs.example.com/pde5-mechanism',
      hostname: 'docs.example.com',
      title: 'PDE5 inhibitor mechanism',
      text: {
        sampleLength: 1000,
        wordCount: 120,
        emojiCount: 0,
        topTokens: ['pde5', 'inhibitor', 'mechanism', 'sildenafil']
      },
      media: {
        imageCount: 1,
        videoCount: 0,
        audioCount: 0,
        gifCount: 0,
        iframeCount: 0
      },
      interaction: {
        linkCount: 12,
        buttonCount: 2,
        inputCount: 1,
        formCount: 0
      },
      structure: {
        elementCount: 160,
        feedCount: 0
      },
      activity: {
        pageAgeMs: 0,
        activePageMs: 0,
        scrollEvents: 0,
        clickEvents: 0,
        recommenderClickEvents: 0,
        keyEvents: 0,
        inputEvents: 0,
        recommenderClickRatePerMinute: 0,
        maxScrollDepthRatio: 0
      },
      ...overrides
    };
  }

  it('extracts comparable local tokens from page metadata', () => {
    assert.deepEqual(extractIntentTokens({
      url: 'https://example.com/search?q=PDE5+inhibitor',
      hostname: 'example.com',
      title: 'PDE5 inhibitor mechanism'
    }).slice(0, 5), ['example', 'search', 'pde5', 'inhibitor', 'mechanism']);
  });

  it('calculates token overlap as a bounded similarity score', () => {
    assert.equal(calculateTokenSimilarity(['pde5', 'mechanism'], ['pde5', 'video']), 1 / 3);
    assert.equal(calculateTokenSimilarity([], []), 1);
    assert.equal(calculateTokenSimilarity(['pde5'], []), 0);
  });

  it('normalizes configurable intent settings and risk thresholds', () => {
    const settings = normalizeIntentSettings({
      enabled: false,
      action: INTENT_INTERVENTION_ACTIONS.BLOCK,
      interventionThreshold: 30,
      lockedThreshold: 50,
      pomodoroInfluence: INTENT_POMODORO_INFLUENCE_MODES.BREAK_LENIENT
    });

    assert.deepEqual(settings, {
      enabled: false,
      action: INTENT_INTERVENTION_ACTIONS.BLOCK,
      interventionThreshold: 30,
      lockedThreshold: 29,
      pomodoroInfluence: INTENT_POMODORO_INFLUENCE_MODES.BREAK_LENIENT,
      diagnosticsRetentionDays: DEFAULT_INTENT_SETTINGS.diagnosticsRetentionDays,
      autoCalibration: true
    });
    assert.equal(getIntentRiskState(30, { ...settings, enabled: true }), 'intervene');
    assert.equal(getIntentRiskState(25, settings), 'clear');
    assert.equal(
      normalizeIntentSettings({ action: INTENT_INTERVENTION_ACTIONS.GRAYSCALE }).action,
      INTENT_INTERVENTION_ACTIONS.GRAYSCALE
    );
    assert.equal(normalizeIntentSettings({ diagnosticsRetentionDays: 0 }).diagnosticsRetentionDays, 1);
    assert.equal(normalizeIntentSettings({ diagnosticsRetentionDays: 100 }).diagnosticsRetentionDays, 30);
  });

  it('creates a first intent session from a page signal', () => {
    const state = recordIntentPageVisit(null, pageSignal(), {
      now: () => 1000,
      tabId: 7
    });
    const activeSession = getActiveIntentSession(state);

    assert.equal(state.activeTabId, 7);
    assert.equal(state.sessions.length, 1);
    assert.equal(activeSession.visits.length, 1);
    assert.equal(activeSession.origin.hostname, 'docs.example.com');
    assert.equal(activeSession.coherenceScore, 100);
    assert.equal(activeSession.riskState, 'clear');
  });

  it('stores contributing plan policy metadata on intent visits', () => {
    const state = recordIntentPageVisit(null, pageSignal(), {
      now: () => 1000,
      planIds: ['plan_1'],
      planNames: ['Work'],
      policySource: 'plans'
    });
    const activeSession = getActiveIntentSession(state);
    const visit = activeSession.visits[0];

    assert.deepEqual(visit.policy.planIds, ['plan_1']);
    assert.deepEqual(visit.policy.planNames, ['Work']);
    assert.equal(visit.policy.source, 'plans');
  });

  it('keeps coherent related pages in the same session', () => {
    let state = recordIntentPageVisit(null, pageSignal(), { now: () => 1000 });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://wikipedia.org/wiki/PDE5',
      hostname: 'wikipedia.org',
      title: 'PDE5 mechanism and sildenafil',
      text: {
        sampleLength: 1200,
        wordCount: 160,
        emojiCount: 0,
        topTokens: ['pde5', 'mechanism', 'sildenafil', 'inhibitor']
      }
    }), { now: () => 2000 });
    const activeSession = getActiveIntentSession(state);

    assert.equal(state.sessions.length, 1);
    assert.equal(activeSession.visits.length, 2);
    assert.equal(activeSession.metrics.visitCount, 2);
    assert.notEqual(activeSession.riskState, 'drift');
    assert.notEqual(activeSession.riskState, 'intervene');
    assert.notEqual(activeSession.riskState, 'locked');
    assert.ok(activeSession.coherenceScore >= 60);
  });

  it('marks unrelated media-heavy pages as drift without enforcing anything', () => {
    let state = recordIntentPageVisit(null, pageSignal(), { now: () => 1000 });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://video.example.com/celebrity-reaction-feed',
      hostname: 'video.example.com',
      title: 'Celebrity drama reaction clips',
      text: {
        sampleLength: 2000,
        wordCount: 300,
        emojiCount: 8,
        topTokens: ['celebrity', 'drama', 'reaction', 'clips']
      },
      media: {
        imageCount: 40,
        videoCount: 4,
        audioCount: 0,
        gifCount: 4,
        iframeCount: 2
      },
      interaction: {
        linkCount: 260,
        buttonCount: 80,
        inputCount: 0,
        formCount: 0
      },
      structure: {
        elementCount: 320,
        feedCount: 3
      }
    }), { now: () => 2000 });
    const activeSession = getActiveIntentSession(state);

    assert.equal(activeSession.visits.length, 2);
    assert.ok(activeSession.coherenceScore < 60);
    assert.equal(activeSession.riskState, 'drift');
    assert.equal(activeSession.firstDriftVisitId, activeSession.visits[1].id);
  });

  it('starts a new session after the idle reset window', () => {
    let state = recordIntentPageVisit(null, pageSignal(), {
      now: () => 1000,
      idleResetMs: 5000
    });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://news.example.com/',
      hostname: 'news.example.com',
      title: 'News'
    }), {
      now: () => 7000,
      idleResetMs: 5000
    });

    assert.equal(state.sessions.length, 2);
    assert.equal(getActiveIntentSession(state).origin.hostname, 'news.example.com');
  });

  it('can force the current page into a new isolated intent session', () => {
    let state = recordIntentPageVisit(null, pageSignal(), {
      now: () => 1000,
      idleResetMs: 100000
    });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://video.example.com/unrelated-feed',
      hostname: 'video.example.com',
      title: 'Unrelated video feed'
    }), {
      now: () => 2000,
      idleResetMs: 100000,
      forceNewSession: true
    });

    assert.equal(state.sessions.length, 2);
    assert.equal(getActiveIntentSession(state).origin.hostname, 'video.example.com');
    assert.equal(getActiveIntentSession(state).coherenceScore, 100);
  });

  it('selects the last coherent visit as an intervention recovery target', () => {
    let state = recordIntentPageVisit(null, pageSignal(), { now: () => 1000 });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://wikipedia.org/wiki/PDE5',
      hostname: 'wikipedia.org',
      title: 'PDE5 mechanism and sildenafil',
      text: {
        sampleLength: 1200,
        wordCount: 160,
        emojiCount: 0,
        topTokens: ['pde5', 'mechanism', 'sildenafil', 'inhibitor']
      }
    }), { now: () => 2000 });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://video.example.com/celebrity-reaction-feed',
      hostname: 'video.example.com',
      title: 'Celebrity drama reaction clips',
      text: {
        sampleLength: 2000,
        wordCount: 300,
        emojiCount: 8,
        topTokens: ['celebrity', 'drama', 'reaction', 'clips']
      },
      media: {
        imageCount: 40,
        videoCount: 4,
        audioCount: 0,
        gifCount: 4,
        iframeCount: 2
      },
      interaction: {
        linkCount: 260,
        buttonCount: 80,
        inputCount: 0,
        formCount: 0
      },
      structure: {
        elementCount: 320,
        feedCount: 3
      }
    }), { now: () => 3000 });

    const activeSession = getActiveIntentSession(state);
    const recoveryVisit = getLastCoherentIntentVisit(activeSession);
    const intervention = getIntentInterventionDecision(activeSession);

    assert.equal(recoveryVisit.hostname, 'wikipedia.org');
    assert.equal(intervention.riskState, 'intervene');
    assert.equal(intervention.shouldIntervene, true);
    assert.equal(intervention.recoveryUrl, 'https://wikipedia.org/wiki/PDE5');
    assert.ok(intervention.reasonLines.length > 0);
  });

  it('marks block-action locked sessions as hard chain blocks', () => {
    let state = recordIntentPageVisit(null, pageSignal({
      url: 'https://wikipedia.org/wiki/PDE5',
      hostname: 'wikipedia.org',
      title: 'PDE5 mechanism and sildenafil'
    }), { now: () => 1000 });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://video.example.com/celebrity-reaction-feed',
      hostname: 'video.example.com',
      title: 'Celebrity drama reaction clips',
      text: {
        sampleLength: 2000,
        wordCount: 300,
        emojiCount: 8,
        topTokens: ['celebrity', 'drama', 'reaction', 'clips']
      },
      media: {
        imageCount: 40,
        videoCount: 4,
        audioCount: 0,
        gifCount: 4,
        iframeCount: 2
      },
      interaction: {
        linkCount: 260,
        buttonCount: 80,
        inputCount: 0,
        formCount: 0
      },
      structure: {
        elementCount: 320,
        feedCount: 3
      }
    }), { now: () => 2000 });

    const intervention = getIntentInterventionDecision(getActiveIntentSession(state), {
      intentSettings: {
        action: INTENT_INTERVENTION_ACTIONS.BLOCK,
        interventionThreshold: 80,
        lockedThreshold: 70
      },
      chainBlockCooldownMs: 5000,
      now: () => 3000
    });

    assert.equal(intervention.riskState, 'locked');
    assert.equal(intervention.shouldIntervene, true);
    assert.equal(intervention.hardBlocked, true);
    assert.equal(intervention.chainBlock.active, true);
    assert.equal(intervention.chainBlock.mode, 'lockedChain');
    assert.equal(intervention.chainBlock.reason, 'Session crossed the locked threshold');
    assert.equal(intervention.chainBlock.startedAt, new Date(2000).toISOString());
    assert.equal(intervention.chainBlock.cooldownActive, true);
    assert.equal(intervention.chainBlock.cooldownRemainingMs, 4000);

    const afterCooldown = getIntentInterventionDecision(getActiveIntentSession(state), {
      intentSettings: {
        action: INTENT_INTERVENTION_ACTIONS.BLOCK,
        interventionThreshold: 80,
        lockedThreshold: 70
      },
      chainBlockCooldownMs: 5000,
      now: () => 7000
    });

    assert.equal(afterCooldown.chainBlock.active, true);
    assert.equal(afterCooldown.chainBlock.cooldownActive, false);
    assert.equal(afterCooldown.chainBlock.cooldownRemainingMs, 0);
  });

  it('uses visible-text topic overlap when metadata is too weak', () => {
    let state = recordIntentPageVisit(null, pageSignal({
      url: 'https://example.com/a',
      hostname: 'example.com',
      title: 'Reference page',
      text: {
        sampleLength: 1000,
        wordCount: 140,
        emojiCount: 0,
        topTokens: ['pde5', 'inhibitor', 'mechanism', 'sildenafil']
      }
    }), { now: () => 1000 });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://other.example.org/b',
      hostname: 'other.example.org',
      title: 'Different page',
      text: {
        sampleLength: 1000,
        wordCount: 140,
        emojiCount: 0,
        topTokens: ['pde5', 'mechanism', 'sildenafil', 'dosage']
      }
    }), { now: () => 2000 });

    const activeSession = getActiveIntentSession(state);
    assert.ok(activeSession.metrics.textOriginSimilarity > activeSession.metrics.metadataOriginSimilarity);
    assert.ok(activeSession.coherenceScore >= 60);
  });

  it('reduces coherence for passive scrolling and click pressure', () => {
    const calmScore = calculateIntentCoherence({
      originSimilarity: 0.8,
      localSimilarity: 0.8,
      domainEntropy: 0,
      passiveMediaLoad: 0,
      passiveInteractionLoad: 0,
      linkDensity: 0.1,
      domainChanges: 0,
      visitCount: 1
    });
    const loopScore = calculateIntentCoherence({
      originSimilarity: 0.8,
      localSimilarity: 0.8,
      domainEntropy: 0,
      passiveMediaLoad: 0,
      passiveInteractionLoad: 1,
      linkDensity: 0.1,
      domainChanges: 0,
      visitCount: 1
    });

    assert.equal(loopScore, calmScore - 10);
  });

  it('reduces coherence for sustained active time on passive pages', () => {
    const calmScore = calculateIntentCoherence({
      originSimilarity: 0.8,
      localSimilarity: 0.8,
      domainEntropy: 0,
      passiveMediaLoad: 0,
      passiveInteractionLoad: 0,
      passiveTimeLoad: 0,
      linkDensity: 0.1,
      domainChanges: 0,
      visitCount: 1
    });
    const sustainedPassiveScore = calculateIntentCoherence({
      originSimilarity: 0.8,
      localSimilarity: 0.8,
      domainEntropy: 0,
      passiveMediaLoad: 0,
      passiveInteractionLoad: 0,
      passiveTimeLoad: 1,
      linkDensity: 0.1,
      domainChanges: 0,
      visitCount: 1
    });

    assert.equal(sustainedPassiveScore, calmScore - 8);
  });

  it('reduces coherence for high interaction velocity', () => {
    const calmScore = calculateIntentCoherence({
      originSimilarity: 0.8,
      localSimilarity: 0.8,
      domainEntropy: 0,
      passiveMediaLoad: 0,
      passiveInteractionLoad: 0,
      passiveTimeLoad: 0,
      interactionVelocityLoad: 0,
      linkDensity: 0.1,
      domainChanges: 0,
      visitCount: 1
    });
    const highVelocityScore = calculateIntentCoherence({
      originSimilarity: 0.8,
      localSimilarity: 0.8,
      domainEntropy: 0,
      passiveMediaLoad: 0,
      passiveInteractionLoad: 0,
      passiveTimeLoad: 0,
      interactionVelocityLoad: 1,
      linkDensity: 0.1,
      domainChanges: 0,
      visitCount: 1
    });

    assert.equal(highVelocityScore, calmScore - 8);
  });

  it('reduces coherence for recommendation or feed click dependence', () => {
    const calmScore = calculateIntentCoherence({
      originSimilarity: 0.8,
      localSimilarity: 0.8,
      domainEntropy: 0,
      passiveMediaLoad: 0,
      passiveInteractionLoad: 0,
      passiveTimeLoad: 0,
      interactionVelocityLoad: 0,
      recommenderClickLoad: 0,
      linkDensity: 0.1,
      domainChanges: 0,
      visitCount: 1
    });
    const recommendationDrivenScore = calculateIntentCoherence({
      originSimilarity: 0.8,
      localSimilarity: 0.8,
      domainEntropy: 0,
      passiveMediaLoad: 0,
      passiveInteractionLoad: 0,
      passiveTimeLoad: 0,
      interactionVelocityLoad: 0,
      recommenderClickLoad: 1,
      linkDensity: 0.1,
      domainChanges: 0,
      visitCount: 1
    });

    assert.equal(recommendationDrivenScore, calmScore - 12);
  });

  it('reduces coherence for redirect-heavy navigation chains', () => {
    const calmScore = calculateIntentCoherence({
      originSimilarity: 0.8,
      localSimilarity: 0.8,
      domainEntropy: 0,
      passiveMediaLoad: 0,
      linkDensity: 0.1,
      domainChanges: 0,
      visitCount: 3,
      redirectTransitionLoad: 0
    });
    const redirectedScore = calculateIntentCoherence({
      originSimilarity: 0.8,
      localSimilarity: 0.8,
      domainEntropy: 0,
      passiveMediaLoad: 0,
      linkDensity: 0.1,
      domainChanges: 0,
      visitCount: 3,
      redirectTransitionLoad: 1
    });

    assert.equal(redirectedScore, calmScore - 5);
  });

  it('stores interaction velocity metrics for intent diagnostics', () => {
    let state = recordIntentPageVisit(null, pageSignal(), { now: () => 1000 });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://video.example.com/rapid-feed',
      hostname: 'video.example.com',
      title: 'Rapid clips feed',
      text: {
        sampleLength: 2000,
        wordCount: 220,
        emojiCount: 5,
        topTokens: ['rapid', 'clips', 'feed', 'reaction']
      },
      media: {
        imageCount: 35,
        videoCount: 4,
        audioCount: 0,
        gifCount: 5,
        iframeCount: 2
      },
      interaction: {
        linkCount: 220,
        buttonCount: 70,
        inputCount: 0,
        formCount: 0
      },
      structure: {
        elementCount: 300,
        feedCount: 2
      },
      activity: {
        pageAgeMs: 60 * 1000,
        activePageMs: 60 * 1000,
        scrollEvents: 90,
        clickEvents: 36,
        keyEvents: 0,
        inputEvents: 0,
        maxScrollDepthRatio: 0.95
      }
    }), { now: () => 2000 });

    const activeSession = getActiveIntentSession(state);

    assert.equal(activeSession.metrics.scrollRatePerMinute, 90);
    assert.equal(activeSession.metrics.clickRatePerMinute, 36);
    assert.ok(activeSession.metrics.interactionVelocityLoad >= 0.85);
    assert.ok(getIntentInterventionDecision(activeSession).reasonLines.includes(
      'High interaction velocity'
    ));
  });

  it('stores recommendation click metrics for intent diagnostics', () => {
    let state = recordIntentPageVisit(null, pageSignal(), { now: () => 1000 });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://video.example.com/recommended-chain',
      hostname: 'video.example.com',
      title: 'Recommended clips chain',
      text: {
        sampleLength: 1800,
        wordCount: 180,
        emojiCount: 4,
        topTokens: ['recommended', 'clips', 'chain', 'reaction']
      },
      media: {
        imageCount: 30,
        videoCount: 3,
        audioCount: 0,
        gifCount: 3,
        iframeCount: 2
      },
      interaction: {
        linkCount: 200,
        buttonCount: 60,
        inputCount: 0,
        formCount: 0
      },
      structure: {
        elementCount: 280,
        feedCount: 2
      },
      activity: {
        pageAgeMs: 60 * 1000,
        activePageMs: 60 * 1000,
        scrollEvents: 18,
        clickEvents: 5,
        recommenderClickEvents: 4,
        keyEvents: 0,
        inputEvents: 0,
        maxScrollDepthRatio: 0.8
      }
    }), { now: () => 2000 });

    const activeSession = getActiveIntentSession(state);

    assert.equal(activeSession.metrics.recommenderClickEvents, 4);
    assert.equal(activeSession.metrics.recommenderClickRatePerMinute, 4);
    assert.ok(activeSession.metrics.recommenderClickLoad >= 0.75);
    assert.ok(getIntentInterventionDecision(activeSession).reasonLines.includes(
      'Recommendation or feed clicks are driving the chain'
    ));
  });

  it('stores dwell and active-time metrics for intent diagnostics', () => {
    let state = recordIntentPageVisit(null, pageSignal(), { now: () => 1000 });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://video.example.com/celebrity-reaction-feed',
      hostname: 'video.example.com',
      title: 'Celebrity drama reaction clips',
      text: {
        sampleLength: 2000,
        wordCount: 300,
        emojiCount: 8,
        topTokens: ['celebrity', 'drama', 'reaction', 'clips']
      },
      media: {
        imageCount: 40,
        videoCount: 4,
        audioCount: 0,
        gifCount: 4,
        iframeCount: 2
      },
      interaction: {
        linkCount: 260,
        buttonCount: 80,
        inputCount: 0,
        formCount: 0
      },
      structure: {
        elementCount: 320,
        feedCount: 3
      },
      activity: {
        pageAgeMs: 12 * 60 * 1000,
        activePageMs: 10 * 60 * 1000,
        scrollEvents: 42,
        clickEvents: 16,
        keyEvents: 0,
        inputEvents: 0,
        maxScrollDepthRatio: 0.9
      }
    }), { now: () => 12 * 60 * 1000 });

    const activeSession = getActiveIntentSession(state);
    const latestVisit = activeSession.visits.at(-1);

    assert.equal(latestVisit.dwellMs, 12 * 60 * 1000);
    assert.equal(latestVisit.activeMs, 10 * 60 * 1000);
    assert.equal(activeSession.metrics.latestDwellMs, 12 * 60 * 1000);
    assert.equal(activeSession.metrics.latestActiveMs, 10 * 60 * 1000);
    assert.equal(activeSession.metrics.totalActiveMs, 10 * 60 * 1000);
    assert.ok(activeSession.metrics.passiveTimeLoad > 0.5);
    assert.ok(getIntentInterventionDecision(activeSession).reasonLines.includes(
      'Sustained active time on a passive page'
    ));
  });

  it('bounds stored sessions and visits', () => {
    let state = createIntentTrajectoryState(1000);
    for (let index = 0; index < 5; index += 1) {
      state = recordIntentPageVisit(state, pageSignal({
        url: `https://example${index}.com/`,
        hostname: `example${index}.com`
      }), {
        now: () => 1000 + index * 10000,
        idleResetMs: 1000,
        maxSessions: 3,
        maxVisitsPerSession: 2
      });
    }

    assert.equal(state.sessions.length, 3);
    assert.equal(state.sessions[0].origin.hostname, 'example2.com');
  });

  it('prunes intent diagnostic sessions outside configured retention', () => {
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
    let state = recordIntentPageVisit(null, pageSignal({
      url: 'https://old.example.com/',
      hostname: 'old.example.com'
    }), {
      now: () => 1000,
      intentSettings: {
        diagnosticsRetentionDays: 1
      }
    });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://new.example.com/',
      hostname: 'new.example.com'
    }), {
      now: () => 1000 + twoDaysMs,
      forceNewSession: true,
      intentSettings: {
        diagnosticsRetentionDays: 1
      }
    });

    assert.equal(state.sessions.length, 1);
    assert.equal(state.sessions[0].origin.hostname, 'new.example.com');
  });

  it('records local intervention feedback against the active intent session', () => {
    let state = recordIntentPageVisit(null, pageSignal(), {
      now: () => 1000,
      tabId: 7
    });
    const activeSession = getActiveIntentSession(state);
    const activeVisit = activeSession.visits[0];

    state = recordIntentFeedback(state, {
      action: 'continue',
      interventionId: 'intent-session-1000:intervene:intent-visit-1000',
      coherenceScore: 33,
      riskState: 'intervene',
      policyAction: 'prompt'
    }, {
      now: () => 2000,
      tabId: 7
    });

    assert.equal(state.feedback.length, 1);
    assert.equal(state.feedback[0].action, 'continue');
    assert.equal(state.feedback[0].sessionId, activeSession.id);
    assert.equal(state.feedback[0].visitId, activeVisit.id);
    assert.equal(state.feedback[0].tabId, 7);
    assert.equal(state.feedback[0].riskState, 'intervene');
    assert.equal(state.feedback[0].coherenceScore, 33);
    assert.equal(state.feedback[0].policyAction, 'prompt');
    assert.equal(state.feedback[0].currentHostname, 'docs.example.com');
  });

  it('bounds stored intervention feedback entries', () => {
    let state = createIntentTrajectoryState(1000);
    for (let index = 0; index < 30; index += 1) {
      state = recordIntentFeedback(state, {
        action: 'isolate',
        interventionId: `feedback-${index}`
      }, {
        now: () => 1000 + index,
        maxFeedbackEntries: 12
      });
    }

    assert.equal(state.feedback.length, 12);
    assert.equal(state.feedback[0].interventionId, 'feedback-18');
    assert.equal(state.feedback[11].interventionId, 'feedback-29');
  });

  it('summarizes intervention feedback for calibration diagnostics', () => {
    let state = createIntentTrajectoryState(1000);
    ['return', 'return', 'return', 'isolate', 'continue'].forEach((action, index) => {
      state = recordIntentFeedback(state, {
        action,
        coherenceScore: 20 + index
      }, {
        now: () => 1000 + index
      });
    });

    const summary = summarizeIntentFeedback(state.feedback);

    assert.equal(summary.total, 5);
    assert.equal(summary.counts.return, 3);
    assert.equal(summary.counts.isolate, 1);
    assert.equal(summary.returnRate, 0.6);
    assert.equal(summary.isolateRate, 0.2);
    assert.equal(summary.continueRate, 0.2);
    assert.equal(summary.averageCoherenceScore, 22);
    assert.equal(summary.recommendation, 'interventionsHelpful');
  });

  it('flags repeated continue or isolate feedback as a sensitivity diagnostic', () => {
    let state = createIntentTrajectoryState(1000);
    ['isolate', 'continue', 'continue', 'isolate', 'continue'].forEach((action, index) => {
      state = recordIntentFeedback(state, { action }, { now: () => 1000 + index });
    });

    assert.equal(summarizeIntentFeedback(state.feedback).recommendation, 'tooSensitive');
  });

  it('derives conservative local calibration from intervention feedback', () => {
    let helpfulState = createIntentTrajectoryState(1000);
    ['return', 'return', 'return', 'return', 'continue'].forEach((action, index) => {
      helpfulState = recordIntentFeedback(helpfulState, { action }, { now: () => 1000 + index });
    });

    const helpfulSummary = summarizeIntentFeedback(helpfulState.feedback);
    const helpfulCalibration = deriveIntentFeedbackCalibration(helpfulSummary, {
      interventionThreshold: 40,
      lockedThreshold: 20
    });

    assert.equal(helpfulCalibration.applied, true);
    assert.equal(helpfulCalibration.thresholdDelta, 6);
    assert.equal(helpfulCalibration.effectiveInterventionThreshold, 46);

    let sensitiveState = createIntentTrajectoryState(1000);
    ['continue', 'continue', 'isolate', 'continue', 'acknowledge'].forEach((action, index) => {
      sensitiveState = recordIntentFeedback(sensitiveState, { action }, { now: () => 2000 + index });
    });

    const sensitiveSummary = summarizeIntentFeedback(sensitiveState.feedback);
    const calibratedSettings = applyIntentFeedbackCalibration({
      interventionThreshold: 40,
      lockedThreshold: 38
    }, sensitiveSummary);

    assert.equal(calibratedSettings.interventionThreshold, 39);
    assert.equal(calibratedSettings.lockedThreshold, 38);
    assert.equal(calibratedSettings.calibration.thresholdDelta, -1);
  });

  it('does not calibrate intent thresholds when auto calibration is disabled', () => {
    let state = createIntentTrajectoryState(1000);
    ['return', 'return', 'return', 'return', 'return'].forEach((action, index) => {
      state = recordIntentFeedback(state, { action }, { now: () => 1000 + index });
    });

    const calibratedSettings = applyIntentFeedbackCalibration({
      interventionThreshold: 40,
      lockedThreshold: 20,
      autoCalibration: false
    }, summarizeIntentFeedback(state.feedback));

    assert.equal(calibratedSettings.interventionThreshold, 40);
    assert.equal(calibratedSettings.autoCalibration, false);
    assert.equal(calibratedSettings.calibration.enabled, false);
    assert.equal(calibratedSettings.calibration.applied, false);
  });

  it('records active tab changes separately from page visits', () => {
    const state = recordIntentTabActivation(null, 42, { now: () => 1000 });

    assert.equal(state.activeTabId, 42);
    assert.equal(state.sessions.length, 0);
  });

  it('records tab lineage and connects a child tab to its opener session', () => {
    let state = recordIntentPageVisit(null, pageSignal(), {
      now: () => 1000,
      tabId: 1
    });
    const parentSession = getActiveIntentSession(state);
    const parentVisit = parentSession.visits[0];

    state = recordIntentTabCreated(state, {
      id: 2,
      openerTabId: 1
    }, { now: () => 1500 });

    const lineage = getIntentTabLineageEntry(state, 2);
    assert.equal(lineage.openerTabId, 1);
    assert.equal(lineage.rootTabId, 1);
    assert.equal(lineage.parentSessionId, parentSession.id);
    assert.equal(lineage.parentVisitId, parentVisit.id);
    assert.equal(getIntentSessionForTab(state, 2).id, parentSession.id);

    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://wikipedia.org/wiki/PDE5',
      hostname: 'wikipedia.org',
      title: 'PDE5 mechanism and sildenafil',
      text: {
        sampleLength: 1200,
        wordCount: 160,
        emojiCount: 0,
        topTokens: ['pde5', 'mechanism', 'sildenafil', 'inhibitor']
      }
    }), {
      now: () => 2000,
      tabId: 2
    });

    const activeSession = getActiveIntentSession(state);
    const childVisit = activeSession.visits[1];
    assert.equal(state.sessions.length, 1);
    assert.equal(childVisit.parentVisitId, parentVisit.id);
    assert.equal(childVisit.openerTabId, 1);
    assert.equal(childVisit.rootTabId, 1);
    assert.equal(activeSession.metrics.tabCount, 2);
    assert.equal(activeSession.metrics.branchCount, 1);
  });

  it('records top-frame navigation transitions and attaches matching visits', () => {
    let state = recordIntentPageVisit(null, pageSignal(), {
      now: () => 1000,
      tabId: 1
    });

    state = recordIntentNavigationTransition(state, {
      tabId: 1,
      frameId: 0,
      url: 'https://video.example.com/recommended-chain#comment',
      transitionType: 'link',
      transitionQualifiers: ['server_redirect', 'from_address_bar', 'unsupported']
    }, { now: () => 1500 });

    const lineage = getIntentTabLineageEntry(state, 1);
    assert.equal(lineage.transitionType, 'link');
    assert.deepEqual(lineage.transitionQualifiers, ['server_redirect', 'from_address_bar']);

    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://video.example.com/recommended-chain',
      hostname: 'video.example.com',
      title: 'Recommended clips chain'
    }), {
      now: () => 2000,
      tabId: 1
    });

    const activeSession = getActiveIntentSession(state);
    const latestVisit = activeSession.visits.at(-1);
    assert.equal(latestVisit.transitionType, 'link');
    assert.deepEqual(latestVisit.transitionQualifiers, ['server_redirect', 'from_address_bar']);
    assert.equal(activeSession.metrics.latestTransitionType, 'link');
    assert.equal(activeSession.metrics.redirectTransitionCount, 1);
    assert.ok(activeSession.metrics.redirectTransitionLoad > 0);
  });

  it('ignores non-top-frame navigation transitions', () => {
    const state = recordIntentNavigationTransition(null, {
      tabId: 5,
      frameId: 2,
      url: 'https://ads.example.com/',
      transitionType: 'link'
    }, { now: () => 1000 });

    assert.equal(getIntentTabLineageEntry(state, 5), null);
    assert.equal(state.sessions.length, 0);
  });

  it('marks child tabs opened from drifted visits as drift descendants', () => {
    let state = recordIntentPageVisit(null, pageSignal(), {
      now: () => 1000,
      tabId: 1
    });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://video.example.com/celebrity-reaction-feed',
      hostname: 'video.example.com',
      title: 'Celebrity drama reaction clips',
      text: {
        sampleLength: 2000,
        wordCount: 300,
        emojiCount: 8,
        topTokens: ['celebrity', 'drama', 'reaction', 'clips']
      },
      media: {
        imageCount: 40,
        videoCount: 4,
        audioCount: 0,
        gifCount: 4,
        iframeCount: 2
      },
      interaction: {
        linkCount: 260,
        buttonCount: 80,
        inputCount: 0,
        formCount: 0
      },
      structure: {
        elementCount: 320,
        feedCount: 3
      }
    }), {
      now: () => 2000,
      tabId: 1
    });

    state = recordIntentTabCreated(state, {
      id: 3,
      openerTabId: 1
    }, { now: () => 2500 });

    assert.equal(getIntentTabLineageEntry(state, 3).driftDescendant, true);

    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://video.example.com/next-reaction',
      hostname: 'video.example.com',
      title: 'Next celebrity reaction clip'
    }), {
      now: () => 3000,
      tabId: 3
    });

    const childVisit = getActiveIntentSession(state).visits.at(-1);
    assert.equal(childVisit.driftDescendant, true);
    assert.equal(getActiveIntentSession(state).metrics.latestIsDriftDescendant, true);
    assert.ok(getIntentInterventionDecision(getActiveIntentSession(state)).reasonLines.includes(
      'Current tab descends from an already drifted chain'
    ));
  });

  it('marks block-action drift descendants as chain quarantine targets', () => {
    let state = recordIntentPageVisit(null, pageSignal(), {
      now: () => 1000,
      tabId: 1
    });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://video.example.com/celebrity-reaction-feed',
      hostname: 'video.example.com',
      title: 'Celebrity drama reaction clips',
      text: {
        sampleLength: 2000,
        wordCount: 300,
        emojiCount: 8,
        topTokens: ['celebrity', 'drama', 'reaction', 'clips']
      },
      media: {
        imageCount: 40,
        videoCount: 4,
        audioCount: 0,
        gifCount: 4,
        iframeCount: 2
      },
      interaction: {
        linkCount: 260,
        buttonCount: 80,
        inputCount: 0,
        formCount: 0
      },
      structure: {
        elementCount: 320,
        feedCount: 3
      }
    }), {
      now: () => 2000,
      tabId: 1
    });
    state = recordIntentTabCreated(state, {
      id: 3,
      openerTabId: 1
    }, { now: () => 2500 });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://video.example.com/next-reaction',
      hostname: 'video.example.com',
      title: 'Next celebrity reaction clip'
    }), {
      now: () => 3000,
      tabId: 3
    });

    const intervention = getIntentInterventionDecision(getActiveIntentSession(state), {
      intentSettings: {
        action: INTENT_INTERVENTION_ACTIONS.BLOCK,
        interventionThreshold: 80,
        lockedThreshold: 10
      },
      chainBlockCooldownMs: 5000,
      now: () => 4000
    });

    assert.equal(intervention.shouldIntervene, true);
    assert.equal(intervention.hardBlocked, true);
    assert.equal(intervention.chainBlock.active, true);
    assert.equal(intervention.chainBlock.mode, 'driftDescendant');
    assert.equal(intervention.chainBlock.driftDescendant, true);
    assert.equal(intervention.chainBlock.startedAt, new Date(3000).toISOString());
    assert.equal(intervention.chainBlock.cooldownActive, true);
    assert.equal(intervention.chainBlock.cooldownRemainingMs, 4000);
    assert.ok(intervention.reasonLines.includes('Current tab descends from a drifted chain'));

    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://video.example.com/next-reaction',
      hostname: 'video.example.com',
      title: 'Next celebrity reaction clip'
    }), {
      now: () => 6000,
      tabId: 3
    });

    const afterRepeatedReport = getIntentInterventionDecision(getActiveIntentSession(state), {
      intentSettings: {
        action: INTENT_INTERVENTION_ACTIONS.BLOCK,
        interventionThreshold: 80,
        lockedThreshold: 10
      },
      chainBlockCooldownMs: 5000,
      now: () => 8000
    });

    assert.equal(afterRepeatedReport.chainBlock.active, true);
    assert.equal(afterRepeatedReport.chainBlock.startedAt, new Date(3000).toISOString());
    assert.equal(afterRepeatedReport.chainBlock.cooldownActive, false);
    assert.equal(afterRepeatedReport.chainBlock.cooldownRemainingMs, 0);
  });

  it('detaches a drift descendant from opener lineage when isolating the current tab', () => {
    let state = recordIntentPageVisit(null, pageSignal(), {
      now: () => 1000,
      tabId: 1
    });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://video.example.com/celebrity-reaction-feed',
      hostname: 'video.example.com',
      title: 'Celebrity drama reaction clips',
      text: {
        sampleLength: 2000,
        wordCount: 300,
        emojiCount: 8,
        topTokens: ['celebrity', 'drama', 'reaction', 'clips']
      },
      media: {
        imageCount: 40,
        videoCount: 4,
        audioCount: 0,
        gifCount: 4,
        iframeCount: 2
      },
      interaction: {
        linkCount: 260,
        buttonCount: 80,
        inputCount: 0,
        formCount: 0
      },
      structure: {
        elementCount: 320,
        feedCount: 3
      }
    }), {
      now: () => 2000,
      tabId: 1
    });
    state = recordIntentTabCreated(state, {
      id: 3,
      openerTabId: 1
    }, { now: () => 2500 });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://video.example.com/next-reaction',
      hostname: 'video.example.com',
      title: 'Next celebrity reaction clip'
    }), {
      now: () => 3000,
      tabId: 3
    });

    assert.equal(getIntentTabLineageEntry(state, 3).driftDescendant, true);

    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://docs.example.com/focused-note',
      hostname: 'docs.example.com',
      title: 'Focused note'
    }), {
      now: () => 4000,
      tabId: 3,
      forceNewSession: true,
      isolateTab: true
    });

    const isolatedSession = getActiveIntentSession(state);
    const isolatedVisit = isolatedSession.visits[0];
    assert.equal(getIntentTabLineageEntry(state, 3), null);
    assert.equal(isolatedSession.origin.hostname, 'docs.example.com');
    assert.equal(isolatedVisit.driftDescendant, false);
    assert.equal(isolatedVisit.parentVisitId, null);
    assert.equal(isolatedVisit.openerTabId, null);
    assert.equal(isolatedVisit.rootTabId, 3);
    assert.equal(isolatedSession.metrics.latestIsDriftDescendant, false);
    assert.equal(getIntentSessionForTab(state, 3).id, isolatedSession.id);
    assert.equal(getIntentInterventionDecision(isolatedSession).reasonLines.includes(
      'Current tab descends from an already drifted chain'
    ), false);
  });

  it('removes tab lineage when a tab closes', () => {
    let state = recordIntentTabCreated(null, {
      id: 4,
      openerTabId: 1
    }, { now: () => 1000 });

    assert.notEqual(getIntentTabLineageEntry(state, 4), null);
    state = recordIntentTabRemoved(state, 4, { now: () => 2000 });
    assert.equal(getIntentTabLineageEntry(state, 4), null);
  });

  it('selects only same-chain drift descendants for chain cleanup', () => {
    const state = {
      tabLineage: [
        { tabId: 1, rootTabId: 1, driftDescendant: false },
        { tabId: 2, rootTabId: 1, driftDescendant: true },
        { tabId: 3, rootTabId: 1, driftDescendant: true },
        { tabId: 4, rootTabId: 4, driftDescendant: true },
        { tabId: 5, rootTabId: 1, driftDescendant: false }
      ]
    };

    assert.deepEqual(getIntentDriftDescendantTabIds(state, { currentTabId: 2 }), [3]);
    assert.deepEqual(getIntentDriftDescendantTabIds(state, { currentTabId: 2, includeCurrent: true }), [2, 3]);
  });

  it('finds the latest session that belongs to a tab', () => {
    let state = recordIntentPageVisit(null, pageSignal({
      url: 'https://tab-one.example.com/',
      hostname: 'tab-one.example.com'
    }), {
      now: () => 1000,
      tabId: 1,
      idleResetMs: 1000
    });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://tab-two.example.com/',
      hostname: 'tab-two.example.com'
    }), {
      now: () => 3000,
      tabId: 2,
      idleResetMs: 1000
    });

    assert.equal(getIntentSessionForTab(state, 1).origin.hostname, 'tab-one.example.com');
    assert.equal(getIntentSessionForTab(state, 2).origin.hostname, 'tab-two.example.com');
  });

  it('keeps coherence scoring bounded', () => {
    assert.equal(calculateIntentCoherence({
      originSimilarity: 0,
      localSimilarity: 0,
      domainEntropy: 1,
      passiveMediaLoad: 1,
      linkDensity: 1,
      domainChanges: 20,
      visitCount: 10
    }), 15);
  });
});

describe('release backup notice helpers', () => {
  it('does not target fresh default configuration', () => {
    assert.equal(hasExistingConfiguration({}), false);
    assert.equal(hasExistingConfiguration({ whitelistedSites: ['example.com'] }), false);
  });

  it('targets existing user configuration', () => {
    assert.equal(hasExistingConfiguration({ group_1: { groupName: 'Focus' } }), true);
    assert.equal(hasExistingConfiguration({ plans: [{ name: 'Focus' }] }), true);
    assert.equal(hasExistingConfiguration({ schedules: [{ name: 'Work' }] }), true);
    assert.equal(hasExistingConfiguration({ whitelistedSites: ['example.com', 'school.edu'] }), true);
    assert.equal(hasExistingConfiguration({ 'elementBlockRule.abc': { name: 'button' } }), true);
    assert.equal(hasExistingConfiguration({ password: 'encrypted' }), true);
  });
});

describe('billing entitlement helpers', () => {
  it('keeps billing disabled by default', () => {
    assert.equal(isBillingEnabled(undefined), false);
    assert.deepEqual(normalizeBillingConfig({ provider: ' stripe ', enabled: true }), {
      enabled: true,
      provider: 'stripe',
      checkoutUrls: {
        supporterMonthly: '',
        lifetime: ''
      },
      portalUrl: '',
      entitlementApiBaseUrl: '',
      supportEmail: ''
    });
  });

  it('normalizes unsupported entitlement values to free inactive', () => {
    assert.deepEqual(normalizeBillingEntitlement({
      plan: 'enterprise',
      status: 'trialing',
      source: 'unknown',
      expiresAt: 'not a date',
      checkedAt: null
    }), {
      plan: 'free',
      status: 'inactive',
      source: 'local',
      expiresAt: null,
      checkedAt: null
    });
  });

  it('normalizes optional billing identity without requiring one', () => {
    assert.equal(hasBillingIdentity({}), false);
    assert.deepEqual(normalizeBillingIdentity({
      token: ' browser-token ',
      email: ' USER@Example.COM ',
      licenseKey: ' key ',
      createdAt: '2026-06-05T12:00:00.000Z'
    }), {
      token: 'browser-token',
      email: 'user@example.com',
      licenseKey: 'key',
      createdAt: '2026-06-05T12:00:00.000Z'
    });
    assert.equal(hasBillingIdentity({ licenseKey: 'key' }), true);
  });

  it('detects active paid entitlements and expired entitlements', () => {
    const now = new Date('2026-06-05T12:00:00.000Z');

    assert.equal(isEntitlementActive({
      plan: 'supporter_monthly',
      status: 'active',
      expiresAt: '2026-07-05T12:00:00.000Z'
    }, now), true);

    assert.equal(isEntitlementActive({
      plan: 'supporter_monthly',
      status: 'active',
      expiresAt: '2026-06-01T12:00:00.000Z'
    }, now), false);
  });

  it('labels entitlement states for dormant UI display', () => {
    assert.equal(getEntitlementLabel({ plan: 'lifetime', status: 'active' }), 'Lifetime supporter');
    assert.equal(getEntitlementLabel({ plan: 'supporter_monthly', status: 'past_due' }), 'Payment past due');
    assert.equal(getEntitlementLabel({ plan: 'free', status: 'inactive' }), 'Free');
  });

  it('builds backend entitlement check URLs without hard-coding a provider', () => {
    assert.equal(buildEntitlementCheckUrl({
      entitlementApiBaseUrl: 'https://billing.example.com/api/'
    }, 'browser-token'), 'https://billing.example.com/api/entitlement?token=browser-token');
  });
});
