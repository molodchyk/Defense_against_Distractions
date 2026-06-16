// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { normalizeUrl } from '../../../js/shared/url.js';
import { normalizePomodoroSettings } from '../../../js/shared/pomodoro.js';
import { normalizeIntentSettings } from '../../../js/shared/intentCoherence.js';
import {
  DEFAULT_PLAN_ID,
  PLANS_STORAGE_KEY
} from './constants.js';

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

export function normalizeStringArray(value) {
  return Array.isArray(value)
    ? value.map(item => String(item || '').trim()).filter(Boolean)
    : [];
}
