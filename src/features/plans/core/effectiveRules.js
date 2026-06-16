// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { normalizeUrl } from '../../../js/shared/url.js';
import { PLANS_STORAGE_KEY } from './constants.js';
import {
  getStoredGroupMap,
  isUrlAllowedByPlan,
  normalizePlan,
  normalizePlans
} from './model.js';
import { isPlanActive } from './activity.js';

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
