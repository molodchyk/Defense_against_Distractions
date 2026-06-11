// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { getSync, removeSync, setSync } from '../../shared/storage/chromeStorage.js';
import { savePlansWithPriority } from '../../shared/storage/criticalScheduleStorage.js';
import {
  createDefaultPlanFromItems,
  getStoredGroupMap,
  normalizePlan,
  normalizePlans,
  PLAN_COUNTER_STORAGE_KEY,
  PLAN_MIGRATION_STORAGE_KEY,
  PLANS_STORAGE_KEY
} from '../../shared/plans.js';
import { normalizeUrl } from '../../shared/url.js';
import { SCHEDULE_GRID_DAYS } from '../../shared/schedules/scheduleGrid.js';
import { cloneSchedule } from '../schedules/scheduleBoard.js';
import { uniqueStrings } from './collections.js';
import { getPlanMessage } from './messages.js';
import {
  normalizePlanScheduleAnchorDate,
  normalizePlanScheduleWeekInterval
} from './scheduleModel.js';

export async function ensureDefaultPlan() {
  const items = await getSync(null);
  const plans = normalizePlans(items[PLANS_STORAGE_KEY]);
  const groups = Object.keys(getStoredGroupMap(items));
  const legacySchedules = Array.isArray(items.schedules) ? items.schedules : [];
  const legacyAllowedSites = Array.isArray(items.whitelistedSites) ? items.whitelistedSites : [];

  if (plans.length > 0) {
    await persistNormalizedPlansIfNeeded(items[PLANS_STORAGE_KEY], plans);
    await migrateStandaloneDataIntoPlans(items, plans);
    return;
  }

  if (groups.length === 0 && legacySchedules.length === 0 && legacyAllowedSites.length === 0) {
    return;
  }

  const defaultPlan = createDefaultPlanFromItems(items, getPlanMessage('defaultPlanName'));
  await savePlansWithPriority([defaultPlan]);
  await setSync({
    [PLAN_COUNTER_STORAGE_KEY]: 1,
    [PLAN_MIGRATION_STORAGE_KEY]: {
      legacySchedulesMovedToPlans: legacySchedules.length > 0,
      legacyWhitelistMovedToPlans: legacyAllowedSites.length > 0,
      legacyGroupsMovedToPlans: groups.length > 0
    },
    schedules: [],
    whitelistedSites: []
  });

  if (groups.length > 0) {
    await removeSync(groups);
  }
}

async function persistNormalizedPlansIfNeeded(storedPlans, normalizedPlans) {
  if (!Array.isArray(storedPlans)) {
    return;
  }

  if (JSON.stringify(storedPlans) === JSON.stringify(normalizedPlans)) {
    return;
  }

  await savePlansWithPriority(normalizedPlans);
}

async function migrateStandaloneDataIntoPlans(items, plans) {
  const migrationState = items[PLAN_MIGRATION_STORAGE_KEY] || {};
  const legacyGroupMap = getStoredGroupMap(items);
  const legacyGroupKeys = Object.keys(legacyGroupMap);
  const legacySchedules = Array.isArray(items.schedules) ? items.schedules : [];
  const legacyAllowedSites = Array.isArray(items.whitelistedSites)
    ? uniqueStrings(items.whitelistedSites.map(normalizeUrl).filter(Boolean))
    : [];
  let nextPlans = plans.map(normalizePlan);
  let plansChanged = false;
  const nextMigrationState = { ...migrationState };

  if (legacySchedules.length > 0 && !migrationState.legacySchedulesMovedToPlans) {
    const targetIndex = Math.max(0, nextPlans.findIndex(plan => plan.id === 'plan_1'));
    nextPlans[targetIndex] = {
      ...nextPlans[targetIndex],
      schedules: mergeSchedules(nextPlans[targetIndex].schedules, legacySchedules)
    };
    nextMigrationState.legacySchedulesMovedToPlans = true;
    plansChanged = true;
  }

  if (legacyAllowedSites.length > 0 && !migrationState.legacyWhitelistMovedToPlans) {
    nextPlans = nextPlans.map(plan => ({
      ...plan,
      allowedSites: uniqueStrings([...plan.allowedSites, ...legacyAllowedSites])
    }));
    nextMigrationState.legacyWhitelistMovedToPlans = true;
    plansChanged = true;
  }

  if (legacyGroupKeys.length > 0 && !migrationState.legacyGroupsMovedToPlans) {
    const assignedGroupIds = new Set();
    nextPlans = nextPlans.map(plan => {
      const referencedGroups = plan.groupIds
        .map(groupId => legacyGroupMap[groupId])
        .filter(Boolean);

      referencedGroups.forEach(group => assignedGroupIds.add(group.id));
      return {
        ...plan,
        groupIds: [],
        groups: mergePlanGroups(plan.groups, referencedGroups)
      };
    });

    const unassignedGroups = Object.values(legacyGroupMap)
      .filter(group => !assignedGroupIds.has(group.id));

    if (unassignedGroups.length > 0) {
      const targetIndex = Math.max(0, nextPlans.findIndex(plan => plan.id === 'plan_1'));
      nextPlans[targetIndex] = {
        ...nextPlans[targetIndex],
        groups: mergePlanGroups(nextPlans[targetIndex].groups, unassignedGroups)
      };
    }

    nextMigrationState.legacyGroupsMovedToPlans = true;
    plansChanged = true;
  }

  if (plansChanged) {
    await savePlansWithPriority(nextPlans.map(normalizePlan));
  }

  if (plansChanged || legacySchedules.length > 0 || legacyAllowedSites.length > 0 || legacyGroupKeys.length > 0) {
    await setSync({
      [PLAN_MIGRATION_STORAGE_KEY]: nextMigrationState,
      schedules: [],
      whitelistedSites: []
    });
  }

  if (legacyGroupKeys.length > 0 && nextMigrationState.legacyGroupsMovedToPlans) {
    await removeSync(legacyGroupKeys);
  }
}

function mergeSchedules(existingSchedules, migratedSchedules) {
  const seen = new Set();
  return [...existingSchedules, ...migratedSchedules].map(cloneSchedule).filter(schedule => {
    const key = [
      schedule.name,
      schedule.startTime,
      schedule.endTime,
      normalizePlanScheduleWeekInterval(schedule.weekInterval),
      normalizePlanScheduleAnchorDate(schedule.anchorDate),
      SCHEDULE_GRID_DAYS.filter(day => schedule.days.includes(day)).join(',')
    ].join('|').toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function mergePlanGroups(existingGroups, migratedGroups) {
  const seenIds = new Set();
  return [...existingGroups, ...migratedGroups].filter(group => {
    const groupId = group.id || group.groupName;
    if (seenIds.has(groupId)) {
      return false;
    }

    seenIds.add(groupId);
    return true;
  });
}
