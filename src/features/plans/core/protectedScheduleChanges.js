// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  areKeywordChangesValid,
  areWebsiteChangesValid,
  validateKeywordEntry
} from '../../../js/shared/groupRules.js';
import { isIntentSettingsAtLeastAsStrict } from '../../../js/shared/intentCoherence.js';
import { isPomodoroSettingsAtLeastAsStrict } from '../../../js/shared/pomodoro.js';
import { normalizePlan } from './model.js';

function indexGroupsById(groups = []) {
  return new Map(groups.map(group => [group.id, group]));
}

function arePlanGroupsAtLeastAsStrict(originalGroups = [], nextGroups = []) {
  const nextGroupMap = indexGroupsById(nextGroups);

  for (const originalGroup of originalGroups) {
    const nextGroup = nextGroupMap.get(originalGroup.id);
    if (!nextGroup) {
      return false;
    }

    if (!areWebsiteChangesValid(originalGroup.websites, nextGroup.websites)) {
      return false;
    }

    if (!areKeywordChangesValid(originalGroup.keywords, nextGroup.keywords)) {
      return false;
    }
  }

  return nextGroups.every(group => group.keywords.every(keyword => validateKeywordEntry(keyword, true)));
}

export function isPlanChangeAllowedDuringProtectedSchedule(originalPlan = {}, nextPlan = {}) {
  const original = normalizePlan(originalPlan);
  const next = normalizePlan(nextPlan);

  if (original.enabled && !next.enabled) {
    return false;
  }

  if (!original.groupIds.every(groupId => next.groupIds.includes(groupId))) {
    return false;
  }

  if (!arePlanGroupsAtLeastAsStrict(original.groups, next.groups)) {
    return false;
  }

  if (next.allowedSites.some(site => !original.allowedSites.includes(site))) {
    return false;
  }

  if (!original.uiRuleIds.every(ruleId => next.uiRuleIds.includes(ruleId))) {
    return false;
  }

  if (
    JSON.stringify(original.pomodoro) !== JSON.stringify(next.pomodoro)
      && !isPomodoroSettingsAtLeastAsStrict(original.pomodoro, next.pomodoro)
  ) {
    return false;
  }

  if (
    JSON.stringify(original.intent) !== JSON.stringify(next.intent)
      && !isIntentSettingsAtLeastAsStrict(original.intent, next.intent)
  ) {
    return false;
  }

  return true;
}
