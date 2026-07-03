// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  isPlanActive,
  normalizePlan,
  normalizePlans
} from '../../shared/plans.js';
import {
  parseKeywordForEditing
} from '../../shared/keywords.js';
import {
  normalizeUrl
} from '../../shared/url.js';
import {
  normalizeSelectedTextCandidate
} from '../pageSignalsPanel.js';

export const QUICK_ADD_CREATE_ENTRY_VALUE = '__dad_quick_add_create_entry__';
export const QUICK_ADD_DEFAULT_ENTRY_NAME = 'Quick add';

export function normalizeQuickAddScore(value, fallback = 25) {
  const score = Number(value);
  const fallbackScore = Number(fallback);
  const nextScore = Number.isFinite(score)
    ? score
    : (Number.isFinite(fallbackScore) ? fallbackScore : 25);
  return Math.min(Math.max(Math.round(nextScore), 1), 100);
}

export function getQuickAddHostPattern(url = '') {
  try {
    return normalizeUrl(new URL(String(url || '')).hostname);
  } catch (error) {
    return normalizeUrl(String(url || '')).split(/[/?#]/)[0] || '';
  }
}

export function quickAddGroupMatchesUrl(group = {}, url = '') {
  const normalizedUrl = normalizeUrl(String(url || ''));
  if (!normalizedUrl) {
    return false;
  }

  return (Array.isArray(group.websites) ? group.websites : [])
    .map(site => normalizeUrl(String(site || '')))
    .some(site => site && normalizedUrl.includes(site));
}

export function getDefaultQuickAddTarget(plans = [], url = '', now = new Date()) {
  const normalizedPlans = normalizePlans(plans);
  const activePlans = normalizedPlans.filter(plan => isPlanActive(plan, now));
  const preferredPlan = activePlans.find(plan => (
    plan.groups.some(group => quickAddGroupMatchesUrl(group, url))
  )) || activePlans[0] || normalizedPlans[0] || null;

  if (!preferredPlan) {
    return {
      planId: '',
      groupId: QUICK_ADD_CREATE_ENTRY_VALUE
    };
  }

  return {
    planId: preferredPlan.id,
    groupId: getDefaultQuickAddGroupId(preferredPlan, url)
  };
}

export function getDefaultQuickAddGroupId(plan = null, url = '') {
  const normalizedPlan = normalizePlan(plan || {});
  const preferredGroup = normalizedPlan.groups.find(group => quickAddGroupMatchesUrl(group, url));
  return preferredGroup?.id || QUICK_ADD_CREATE_ENTRY_VALUE;
}

export function formatQuickAddKeywordLine(candidate = null, score = null) {
  const normalizedCandidate = normalizeSelectedTextCandidate(candidate);
  if (!normalizedCandidate) {
    return '';
  }

  return `${escapeQuickAddKeywordPhrase(normalizedCandidate.text)}, ${normalizeQuickAddScore(
    score,
    normalizedCandidate.estimatedScore100
  )}/100`;
}

export function upsertQuickAddKeyword(keywords = [], keywordLine = '') {
  const normalizedKeywords = Array.isArray(keywords)
    ? keywords.map(keyword => String(keyword || '').trim()).filter(Boolean)
    : [];
  const [nextKeyword, , nextValue] = parseKeywordForEditing(keywordLine);
  const normalizedNextKeyword = String(nextKeyword || '').trim().toLowerCase();

  if (!normalizedNextKeyword || nextValue === null) {
    return {
      changed: false,
      keywords: normalizedKeywords,
      reason: 'invalid'
    };
  }

  const existingIndex = normalizedKeywords.findIndex(keyword => {
    const [existingKeyword] = parseKeywordForEditing(keyword);
    return String(existingKeyword || '').trim().toLowerCase() === normalizedNextKeyword;
  });

  if (existingIndex === -1) {
    return {
      changed: true,
      keywords: [...normalizedKeywords, keywordLine],
      reason: 'added'
    };
  }

  const [, existingSign, existingValue] = parseKeywordForEditing(normalizedKeywords[existingIndex]);
  if (existingValue === null || existingSign === '*' || existingValue >= nextValue) {
    return {
      changed: false,
      keywords: normalizedKeywords,
      reason: 'alreadyCovered'
    };
  }

  return {
    changed: true,
    keywords: normalizedKeywords.map((keyword, index) => index === existingIndex ? keywordLine : keyword),
    reason: 'raised'
  };
}

export function applySelectedTextQuickAdd(plans = [], options = {}) {
  const normalizedPlans = normalizePlans(plans);
  const selectedPlanId = String(options.planId || '').trim();
  const planIndex = normalizedPlans.findIndex(plan => plan.id === selectedPlanId);
  if (planIndex === -1) {
    return {
      changed: false,
      status: 'noPlan',
      plans: normalizedPlans
    };
  }

  const candidate = normalizeSelectedTextCandidate(options.candidate);
  const keywordLine = formatQuickAddKeywordLine(candidate, options.score);
  if (!candidate || !keywordLine) {
    return {
      changed: false,
      status: 'noCandidate',
      plans: normalizedPlans
    };
  }

  const originalPlan = normalizedPlans[planIndex];
  const groupId = String(options.groupId || '').trim();
  const targetGroupIndex = originalPlan.groups.findIndex(group => group.id === groupId);
  const createsEntry = targetGroupIndex === -1 || groupId === QUICK_ADD_CREATE_ENTRY_VALUE;
  const hostPattern = getQuickAddHostPattern(options.url);
  const score100 = normalizeQuickAddScore(options.score, candidate.estimatedScore100);
  const group = createsEntry
    ? {
        id: createQuickAddGroupId(originalPlan.id, options.now),
        groupName: options.createEntryName || QUICK_ADD_DEFAULT_ENTRY_NAME,
        websites: hostPattern ? [hostPattern] : [],
        keywords: []
      }
    : originalPlan.groups[targetGroupIndex];
  const upserted = upsertQuickAddKeyword(group.keywords, keywordLine);
  const nextGroup = {
    ...group,
    keywords: upserted.keywords
  };
  const nextGroups = createsEntry
    ? [...originalPlan.groups, nextGroup]
    : originalPlan.groups.map((candidateGroup, index) => index === targetGroupIndex ? nextGroup : candidateGroup);
  const nextPlan = normalizePlan({
    ...originalPlan,
    groupIds: [],
    groups: nextGroups
  });
  const nextPlans = normalizedPlans.map((plan, index) => index === planIndex ? nextPlan : plan);
  const matchesCurrentPage = quickAddGroupMatchesUrl(nextGroup, options.url);

  return {
    changed: createsEntry || upserted.changed,
    status: createsEntry ? 'created' : upserted.reason,
    plans: nextPlans,
    plan: nextPlan,
    group: nextGroup,
    keywordLine,
    score100,
    createdEntry: createsEntry,
    currentPage: {
      matches: matchesCurrentPage,
      wouldBlockByKeywordAlone: matchesCurrentPage && score100 >= 100
    }
  };
}

function createQuickAddGroupId(planId, now = new Date()) {
  const suffix = now instanceof Date && Number.isFinite(now.getTime())
    ? now.getTime().toString(36)
    : Date.now().toString(36);
  return `${planId || 'plan'}_quick_add_${suffix}`;
}

function escapeQuickAddKeywordPhrase(value) {
  return String(value || '').replace(/,/g, '\\,');
}
