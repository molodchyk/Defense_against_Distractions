// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { isCurrentTimeInAnySchedule } from '../schedules/scheduleTime.js';
import { PLANS_STORAGE_KEY } from './constants.js';
import { normalizePlan, normalizePlans } from './model.js';

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
