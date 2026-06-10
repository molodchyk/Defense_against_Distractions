// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { isCurrentTimeInAnySchedule } from './scheduleTime.js';
import { normalizeUrl } from './url.js';
import { normalizePomodoroSettings } from './pomodoro.js';
import {
  DEFAULT_INTENT_SETTINGS,
  INTENT_INTERVENTION_ACTIONS,
  INTENT_POMODORO_INFLUENCE_MODES,
  normalizeIntentSettings
} from './intentCoherence.js';

export const PLANS_STORAGE_KEY = 'plans';
export const PLAN_COUNTER_STORAGE_KEY = 'planCounter';
export const PLAN_MIGRATION_STORAGE_KEY = 'planMigrationState';
export const DEFAULT_PLAN_ID = 'plan_1';

export function normalizePlan(plan = {}) {
  return {
    id: typeof plan.id === 'string' && plan.id ? plan.id : DEFAULT_PLAN_ID,
    name: typeof plan.name === 'string' && plan.name.trim() ? plan.name.trim() : 'Default plan',
    enabled: plan.enabled !== false,
    groupIds: normalizeStringArray(plan.groupIds),
    groups: Array.isArray(plan.groups) ? plan.groups.map(normalizePlanGroup) : [],
    allowedSites: normalizeStringArray(plan.allowedSites).map(normalizeUrl),
    uiRuleIds: normalizeStringArray(plan.uiRuleIds),
    schedules: Array.isArray(plan.schedules) ? plan.schedules.map(normalizePlanSchedule).filter(hasScheduleDays) : [],
    pomodoro: normalizePomodoroSettings(plan.pomodoro),
    intent: normalizeIntentSettings(plan.intent)
  };
}

export function normalizePlans(plans) {
  if (!Array.isArray(plans)) {
    return [];
  }

  const seenIds = new Set();
  return plans.map(normalizePlan).filter(plan => {
    if (seenIds.has(plan.id)) {
      return false;
    }

    seenIds.add(plan.id);
    return true;
  });
}

export function sanitizePlansForStorage(plans) {
  return normalizePlans(plans);
}

export function createDefaultPlanFromItems(items = {}, name = 'Default plan') {
  const groups = Object.values(getStoredGroupMap(items));

  return normalizePlan({
    id: DEFAULT_PLAN_ID,
    name,
    enabled: true,
    groupIds: [],
    groups,
    allowedSites: Array.isArray(items.whitelistedSites) ? items.whitelistedSites : [],
    uiRuleIds: [],
    schedules: Array.isArray(items.schedules) ? items.schedules : [],
    pomodoro: {},
    intent: {}
  });
}

export function hasPlanConfiguration(items = {}) {
  return normalizePlans(items[PLANS_STORAGE_KEY]).length > 0;
}

export function getStoredGroupMap(items = {}) {
  return Object.entries(items).reduce((groups, [key, value]) => {
    if (key.startsWith('group_') && Array.isArray(value?.websites) && Array.isArray(value?.keywords)) {
      const id = value.id || key;
      groups[id] = { ...value, id };
    }

    return groups;
  }, {});
}

export function isPlanActive(plan, now = new Date()) {
  const normalizedPlan = normalizePlan(plan);
  if (!normalizedPlan.enabled) {
    return false;
  }

  if (normalizedPlan.schedules.length === 0) {
    return true;
  }

  return isCurrentTimeInAnySchedule(normalizedPlan.schedules, now);
}

export function getProtectedSchedules(items = {}) {
  const legacySchedules = Array.isArray(items.schedules) ? items.schedules : [];
  const planSchedules = normalizePlans(items[PLANS_STORAGE_KEY])
    .filter(plan => plan.enabled)
    .flatMap(plan => plan.schedules);

  return [...legacySchedules, ...planSchedules];
}

export function isInProtectedSchedule(items = {}, now = new Date()) {
  return isCurrentTimeInAnySchedule(getProtectedSchedules(items), now);
}

export function getEffectiveGroupsForUrl(items = {}, normalizedUrl, now = new Date()) {
  const groupsById = getStoredGroupMap(items);
  const plans = normalizePlans(items[PLANS_STORAGE_KEY]);

  if (plans.length === 0) {
    return Object.values(groupsById).filter(group => groupMatchesUrl(group, normalizedUrl));
  }

  const selectedGroups = [];
  const selectedGroupIds = new Set();

  plans.forEach(plan => {
    if (!isPlanActive(plan, now) || isUrlAllowedByPlan(plan, normalizedUrl)) {
      return;
    }

    getPlanGroups(plan, groupsById).forEach(group => {
      const groupId = group.id || `${plan.id}:${group.groupName || selectedGroups.length}`;
      if (selectedGroupIds.has(groupId) || !groupMatchesUrl(group, normalizedUrl)) {
        return;
      }

      selectedGroupIds.add(groupId);
      selectedGroups.push(group);
    });
  });

  return selectedGroups;
}

export function getEffectiveKeywordsForUrl(items = {}, normalizedUrl, now = new Date()) {
  return getEffectiveGroupsForUrl(items, normalizedUrl, now)
    .flatMap(group => Array.isArray(group.keywords) ? group.keywords : []);
}

export function filterElementRulesForActivePlans(rules = [], items = {}, now = new Date()) {
  const plans = normalizePlans(items[PLANS_STORAGE_KEY]);
  if (plans.length === 0) {
    return rules;
  }

  const activePlanIds = new Set(plans.filter(plan => isPlanActive(plan, now)).map(plan => plan.id));
  const assignedRuleIds = new Set(plans.flatMap(plan => plan.uiRuleIds));

  return rules.filter(rule => {
    if (!assignedRuleIds.has(rule?.id)) {
      return true;
    }

    return plans.some(plan => activePlanIds.has(plan.id) && plan.uiRuleIds.includes(rule.id));
  });
}

export function getEffectiveIntentPolicyForUrl(items = {}, url = '', options = {}) {
  const normalizedUrl = normalizeUrl(url);
  const plans = normalizePlans(items[PLANS_STORAGE_KEY]);
  const now = options.now instanceof Date ? options.now : new Date();
  const runtime = options.pomodoroRuntime || {};

  if (plans.length === 0) {
    return {
      settings: normalizeIntentSettings(DEFAULT_INTENT_SETTINGS),
      planIds: [],
      planNames: [],
      source: 'default'
    };
  }

  const contributingPlans = plans.filter(plan => (
    isPlanActive(plan, now)
      && !isUrlAllowedByPlan(plan, normalizedUrl)
      && plan.intent.enabled
  ));

  if (contributingPlans.length === 0) {
    return {
      settings: normalizeIntentSettings({ ...DEFAULT_INTENT_SETTINGS, enabled: false }),
      planIds: [],
      planNames: [],
      source: 'plans'
    };
  }

  const settings = normalizeIntentSettings(contributingPlans.reduce((current, plan) => ({
    enabled: true,
    action: getStricterIntentAction(current.action, plan.intent.action),
    interventionThreshold: Math.max(current.interventionThreshold, plan.intent.interventionThreshold),
    lockedThreshold: Math.max(current.lockedThreshold, plan.intent.lockedThreshold),
    pomodoroInfluence: getCombinedPomodoroInfluence(current.pomodoroInfluence, plan.intent.pomodoroInfluence),
    diagnosticsRetentionDays: Math.min(current.diagnosticsRetentionDays, plan.intent.diagnosticsRetentionDays),
    autoCalibration: current.autoCalibration && plan.intent.autoCalibration !== false
  }), {
    ...DEFAULT_INTENT_SETTINGS,
    enabled: true,
    action: INTENT_INTERVENTION_ACTIONS.WARN,
    interventionThreshold: 0,
    lockedThreshold: 0,
    pomodoroInfluence: INTENT_POMODORO_INFLUENCE_MODES.IGNORE,
    diagnosticsRetentionDays: DEFAULT_INTENT_SETTINGS.diagnosticsRetentionDays,
    autoCalibration: DEFAULT_INTENT_SETTINGS.autoCalibration
  }));

  return {
    settings: applyPomodoroIntentInfluence(settings, runtime, contributingPlans),
    planIds: contributingPlans.map(plan => plan.id),
    planNames: contributingPlans.map(plan => plan.name),
    source: 'plans'
  };
}

export function isUrlAllowedByPlan(plan, normalizedUrl) {
  return normalizePlan(plan).allowedSites.some(site => normalizedUrl.includes(site));
}

export function getNextPlanName(plans, prefix = 'Plan ') {
  const existingNames = new Set(normalizePlans(plans).map(plan => plan.name.toLowerCase()));
  let index = 1;

  while (existingNames.has(`${prefix}${index}`.toLowerCase())) {
    index++;
  }

  return `${prefix}${index}`;
}

function normalizePlanSchedule(schedule = {}) {
  return {
    ...schedule,
    name: typeof schedule.name === 'string' && schedule.name.trim() ? schedule.name.trim() : 'Schedule',
    days: normalizeStringArray(schedule.days),
    startTime: typeof schedule.startTime === 'string' ? schedule.startTime : '00:00',
    endTime: typeof schedule.endTime === 'string' ? schedule.endTime : '23:59',
    weekInterval: normalizeScheduleWeekInterval(schedule.weekInterval),
    anchorDate: typeof schedule.anchorDate === 'string' ? schedule.anchorDate : '',
    isActive: true
  };
}

function normalizeScheduleWeekInterval(value) {
  const interval = Number.parseInt(value, 10);
  return Number.isFinite(interval) ? Math.min(Math.max(interval, 1), 12) : 1;
}

function hasScheduleDays(schedule = {}) {
  return Array.isArray(schedule.days) && schedule.days.length > 0;
}

function normalizePlanGroup(group = {}, index = 0) {
  const id = typeof group.id === 'string' && group.id.trim()
    ? group.id.trim()
    : `plan_group_${index + 1}`;

  return {
    id,
    groupName: typeof group.groupName === 'string' && group.groupName.trim() ? group.groupName.trim() : 'Group',
    websites: normalizeStringArray(group.websites).map(normalizeUrl),
    keywords: normalizeStringArray(group.keywords)
  };
}

function normalizeStringArray(value) {
  return Array.isArray(value)
    ? value.map(item => String(item || '').trim()).filter(Boolean)
    : [];
}

function getStricterIntentAction(firstAction, secondAction) {
  const order = [
    INTENT_INTERVENTION_ACTIONS.WARN,
    INTENT_INTERVENTION_ACTIONS.GRAYSCALE,
    INTENT_INTERVENTION_ACTIONS.PROMPT,
    INTENT_INTERVENTION_ACTIONS.BLOCK
  ];
  const firstIndex = order.indexOf(firstAction);
  const secondIndex = order.indexOf(secondAction);
  return order[Math.max(firstIndex, secondIndex, 0)] || DEFAULT_INTENT_SETTINGS.action;
}

function getCombinedPomodoroInfluence(firstMode, secondMode) {
  if (firstMode === INTENT_POMODORO_INFLUENCE_MODES.BOTH || secondMode === INTENT_POMODORO_INFLUENCE_MODES.BOTH) {
    return INTENT_POMODORO_INFLUENCE_MODES.BOTH;
  }

  const hasWorkStricter = [firstMode, secondMode].includes(INTENT_POMODORO_INFLUENCE_MODES.WORK_STRICTER);
  const hasBreakLenient = [firstMode, secondMode].includes(INTENT_POMODORO_INFLUENCE_MODES.BREAK_LENIENT);

  if (hasWorkStricter && hasBreakLenient) {
    return INTENT_POMODORO_INFLUENCE_MODES.BOTH;
  }

  if (hasWorkStricter) {
    return INTENT_POMODORO_INFLUENCE_MODES.WORK_STRICTER;
  }

  if (hasBreakLenient) {
    return INTENT_POMODORO_INFLUENCE_MODES.BREAK_LENIENT;
  }

  return INTENT_POMODORO_INFLUENCE_MODES.IGNORE;
}

function applyPomodoroIntentInfluence(settings, runtime, contributingPlans) {
  const normalizedSettings = normalizeIntentSettings(settings);
  const activePlanIds = new Set(contributingPlans.map(plan => plan.id));
  if (!activePlanIds.has(runtime?.activePlanId)) {
    return normalizedSettings;
  }

  const phase = runtime?.phase;
  const shouldStrictenWork = [
    INTENT_POMODORO_INFLUENCE_MODES.WORK_STRICTER,
    INTENT_POMODORO_INFLUENCE_MODES.BOTH
  ].includes(normalizedSettings.pomodoroInfluence);
  const shouldSoftenBreak = [
    INTENT_POMODORO_INFLUENCE_MODES.BREAK_LENIENT,
    INTENT_POMODORO_INFLUENCE_MODES.BOTH
  ].includes(normalizedSettings.pomodoroInfluence);
  const adjustment = phase === 'work' && shouldStrictenWork
    ? 10
    : (phase === 'shortBreak' || phase === 'longBreak') && shouldSoftenBreak
        ? -10
        : 0;

  return normalizeIntentSettings({
    ...normalizedSettings,
    interventionThreshold: normalizedSettings.interventionThreshold + adjustment,
    lockedThreshold: normalizedSettings.lockedThreshold + adjustment
  });
}

function getPlanGroups(plan, groupsById) {
  const normalizedPlan = normalizePlan(plan);
  const groups = [];
  const seenIds = new Set();

  normalizedPlan.groups.forEach(group => {
    if (seenIds.has(group.id)) {
      return;
    }

    seenIds.add(group.id);
    groups.push(group);
  });

  normalizedPlan.groupIds.forEach(groupId => {
    const group = groupsById[groupId];
    if (!group || seenIds.has(group.id || groupId)) {
      return;
    }

    seenIds.add(group.id || groupId);
    groups.push(group);
  });

  return groups;
}

function groupMatchesUrl(group, normalizedUrl) {
  return (group.websites || [])
    .map(site => normalizeUrl(site))
    .some(site => normalizedUrl.includes(site));
}
