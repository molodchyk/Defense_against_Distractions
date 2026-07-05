// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};

  function normalizeArray(value) {
    return Array.isArray(value)
      ? value.map(item => String(item || '').trim()).filter(Boolean)
      : [];
  }

  function normalizePlan(plan) {
    return {
      id: typeof plan?.id === 'string' ? plan.id : '',
      name: typeof plan?.name === 'string' ? plan.name : '',
      enabled: plan?.enabled !== false,
      groupIds: normalizeArray(plan?.groupIds),
      groups: Array.isArray(plan?.groups) ? plan.groups.map(normalizePlanGroup) : [],
      allowedSites: normalizeArray(plan?.allowedSites).map(global.DAD.normalizeUrl),
      uiRuleIds: normalizeArray(plan?.uiRuleIds),
      triggeredActionChains: Array.isArray(plan?.triggeredActionChains) ? plan.triggeredActionChains : [],
      schedules: Array.isArray(plan?.schedules) ? plan.schedules : []
    };
  }

  function normalizePlans(plans) {
    return Array.isArray(plans) ? plans.map(normalizePlan).filter(plan => plan.id) : [];
  }

  function timeStringToMinutes(time) {
    const [hours, minutes] = String(time || '00:00').split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  }

  function isScheduleActive(schedule, now) {
    if (!schedule?.isActive || !Array.isArray(schedule.days)) {
      return false;
    }

    const day = now.toLocaleString('en-US', { weekday: 'short' });
    if (!schedule.days.includes(day)) {
      return false;
    }

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return currentMinutes >= timeStringToMinutes(schedule.startTime)
      && currentMinutes <= timeStringToMinutes(schedule.endTime);
  }

  function isPlanActive(plan, now) {
    const normalizedPlan = normalizePlan(plan);
    if (!normalizedPlan.enabled) {
      return false;
    }

    if (normalizedPlan.schedules.length === 0) {
      return true;
    }

    return normalizedPlan.schedules.some(schedule => isScheduleActive(schedule, now));
  }

  function getStoredGroupMap(items) {
    return Object.entries(items || {}).reduce((groups, [key, value]) => {
      if (key.startsWith('group_') && Array.isArray(value?.websites) && Array.isArray(value?.keywords)) {
        const id = value.id || key;
        groups[id] = { ...value, id };
      }

      return groups;
    }, {});
  }

  function groupMatchesUrl(group, normalizedUrl) {
    return (group.websites || [])
      .map(global.DAD.normalizeUrl)
      .some(site => normalizedUrl.includes(site));
  }

  function isUrlAllowedByPlan(plan, normalizedUrl) {
    return normalizePlan(plan).allowedSites.some(site => normalizedUrl.includes(site));
  }

  function getEffectiveGroupsForUrl(items, normalizedUrl, now = new Date()) {
    const groupsById = getStoredGroupMap(items);
    const plans = normalizePlans(items?.plans);

    if (plans.length === 0) {
      return Object.values(groupsById).filter(group => groupMatchesUrl(group, normalizedUrl));
    }

    const selectedGroups = [];
    const selectedGroupIds = new Set();

    plans.forEach(plan => {
      if (!isPlanActive(plan, now) || isUrlAllowedByPlan(plan, normalizedUrl)) {
        return;
      }

      plan.groupIds.forEach(groupId => {
        addMatchedGroup(groupsById[groupId], groupId);
      });

      plan.groups.forEach(group => {
        addMatchedGroup(group, group.id);
      });

      function addMatchedGroup(group, fallbackId) {
        const groupId = group?.id || fallbackId;
        if (!group || selectedGroupIds.has(groupId) || !groupMatchesUrl(group, normalizedUrl)) {
          return;
        }

        selectedGroupIds.add(groupId);
        selectedGroups.push(group);
      }
    });

    return selectedGroups;
  }

  function normalizePlanGroup(group) {
    return {
      id: typeof group?.id === 'string' ? group.id : '',
      groupName: typeof group?.groupName === 'string' ? group.groupName : '',
      websites: normalizeArray(group?.websites).map(global.DAD.normalizeUrl),
      keywords: normalizeArray(group?.keywords)
    };
  }

  function getEffectiveKeywordsForUrl(items, normalizedUrl, now = new Date()) {
    return getEffectiveGroupsForUrl(items, normalizedUrl, now)
      .flatMap(group => Array.isArray(group.keywords) ? group.keywords : []);
  }

  function getEffectiveTriggeredActionChainsForUrl(items, normalizedUrl, now = new Date()) {
    const plans = normalizePlans(items?.plans);
    if (plans.length === 0) {
      return [];
    }

    return plans
      .filter(plan => isPlanActive(plan, now) && !isUrlAllowedByPlan(plan, normalizedUrl))
      .flatMap(plan => plan.triggeredActionChains.map(chain => ({
        ...chain,
        planId: plan.id,
        planName: plan.name
      })));
  }

  function filterElementRulesForActivePlans(rules, items, now = new Date()) {
    const plans = normalizePlans(items?.plans);
    if (plans.length === 0) {
      return rules || [];
    }

    const activePlanIds = new Set(plans.filter(plan => isPlanActive(plan, now)).map(plan => plan.id));
    const assignedRuleIds = new Set(plans.flatMap(plan => plan.uiRuleIds));

    return (rules || []).filter(rule => {
      if (!assignedRuleIds.has(rule?.id)) {
        return true;
      }

      return plans.some(plan => activePlanIds.has(plan.id) && plan.uiRuleIds.includes(rule.id));
    });
  }

  global.DAD.Plans = {
    filterElementRulesForActivePlans,
    getEffectiveGroupsForUrl,
    getEffectiveKeywordsForUrl,
    getEffectiveTriggeredActionChainsForUrl,
    isPlanActive
  };
})(window);
