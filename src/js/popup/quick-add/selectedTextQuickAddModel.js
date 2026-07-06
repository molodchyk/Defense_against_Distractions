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
export const QUICK_ADD_ACTION_PRESETS = Object.freeze({
  KEYWORD_ONLY: 'keywordOnly',
  BLOCK_PAGE: 'blockPage',
  HIDE_IMAGES: 'hideImages',
  DISABLE_CONTROLS: 'disableControls',
  ACTION_CHAIN: 'actionChain'
});

const QUICK_ADD_ELEMENT_ACTION_PRESETS = new Set([
  QUICK_ADD_ACTION_PRESETS.HIDE_IMAGES,
  QUICK_ADD_ACTION_PRESETS.DISABLE_CONTROLS
]);
const QUICK_ADD_ELEMENT_RULE_STRATEGIES = new Set(['samePosition', 'sameText', 'similar', 'exact']);
const QUICK_ADD_ELEMENT_RULE_LABEL_MATCHES = new Set(['prefer', 'ignore', 'require']);

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

export function normalizeQuickAddActionPreset(value = '') {
  const preset = String(value || '').trim();
  return Object.values(QUICK_ADD_ACTION_PRESETS).includes(preset)
    ? preset
    : QUICK_ADD_ACTION_PRESETS.KEYWORD_ONLY;
}

export function compileQuickAddActionPreset(options = {}) {
  const preset = normalizeQuickAddActionPreset(options.actionPreset);
  const candidate = normalizeSelectedTextCandidate(options.candidate);
  const score100 = preset === QUICK_ADD_ACTION_PRESETS.BLOCK_PAGE
    ? 100
    : normalizeQuickAddScore(options.score, candidate?.estimatedScore100);
  const requiresElementScope = QUICK_ADD_ELEMENT_ACTION_PRESETS.has(preset);

  if (!requiresElementScope) {
    return {
      status: 'compiled',
      preset,
      score100,
      requiresElementScope: false,
      elementRules: []
    };
  }

  const elementRule = createQuickAddElementRule(options.scopeRule, {
    action: preset,
    planId: options.planId,
    url: options.url,
    now: options.now
  });

  return {
    status: elementRule ? 'compiled' : 'needsElementScope',
    preset,
    score100,
    requiresElementScope: true,
    elementRules: elementRule ? [elementRule] : []
  };
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
  if (!candidate) {
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
  const actionPreset = compileQuickAddActionPreset({
    actionPreset: options.actionPreset,
    candidate,
    planId: selectedPlanId,
    scopeRule: options.scopeRule,
    score: options.score,
    url: options.url,
    now: options.now
  });
  if (actionPreset.status !== 'compiled') {
    return {
      changed: false,
      status: actionPreset.status,
      plans: normalizedPlans,
      actionPreset
    };
  }

  const score100 = actionPreset.score100;
  const normalizedKeywordLine = formatQuickAddKeywordLine(candidate, score100);
  const group = createsEntry
    ? {
        id: createQuickAddGroupId(originalPlan.id, options.now),
        groupName: options.createEntryName || QUICK_ADD_DEFAULT_ENTRY_NAME,
        websites: hostPattern ? [hostPattern] : [],
        keywords: []
      }
    : originalPlan.groups[targetGroupIndex];
  const upserted = upsertQuickAddKeyword(group.keywords, normalizedKeywordLine);
  const nextGroup = {
    ...group,
    keywords: upserted.keywords
  };
  const nextGroups = createsEntry
    ? [...originalPlan.groups, nextGroup]
    : originalPlan.groups.map((candidateGroup, index) => index === targetGroupIndex ? nextGroup : candidateGroup);
  const elementRuleIds = actionPreset.elementRules.map(rule => rule.id);
  const nextPlan = normalizePlan({
    ...originalPlan,
    groupIds: [],
    groups: nextGroups,
    uiRuleIds: [...originalPlan.uiRuleIds, ...elementRuleIds.filter(ruleId => !originalPlan.uiRuleIds.includes(ruleId))]
  });
  const nextPlans = normalizedPlans.map((plan, index) => index === planIndex ? nextPlan : plan);
  const matchesCurrentPage = quickAddGroupMatchesUrl(nextGroup, options.url);

  return {
    changed: createsEntry || upserted.changed || actionPreset.elementRules.length > 0,
    status: createsEntry ? 'created' : upserted.reason,
    plans: nextPlans,
    plan: nextPlan,
    group: nextGroup,
    keywordLine: normalizedKeywordLine,
    score100,
    createdEntry: createsEntry,
    actionPreset,
    elementRules: actionPreset.elementRules,
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

function createQuickAddElementRule(scopeRule = null, options = {}) {
  const fingerprint = scopeRule?.fingerprint;
  if (!fingerprint || typeof fingerprint !== 'object') {
    return null;
  }

  const hostPattern = getQuickAddHostPattern(options.url || scopeRule.urlPattern);
  const createdAt = getQuickAddIsoTimestamp(options.now);

  return {
    ...scopeRule,
    id: getQuickAddElementRuleId(scopeRule.id, options),
    version: normalizeInteger(scopeRule.version, 1, 1, 1),
    enabled: true,
    strategy: normalizeElementRuleStrategy(scopeRule.strategy),
    minScore: normalizeInteger(scopeRule.minScore, 12, 6, 24),
    ancestorDepth: normalizeInteger(scopeRule.ancestorDepth, 2, 0, 6),
    labelMatch: normalizeElementRuleLabelMatch(scopeRule.labelMatch),
    action: options.action,
    name: String(scopeRule.name || '').trim() || getQuickAddElementRuleName(options.action),
    urlPattern: String(scopeRule.urlPattern || hostPattern).trim() || hostPattern,
    urlScope: scopeRule.urlScope === 'pattern' ? 'pattern' : 'host',
    createdAt: typeof scopeRule.createdAt === 'string' && scopeRule.createdAt.trim()
      ? scopeRule.createdAt.trim()
      : createdAt,
    fingerprint: { ...fingerprint }
  };
}

function getQuickAddElementRuleId(existingId, options = {}) {
  const normalizedExistingId = String(existingId || '').trim();
  if (normalizedExistingId) {
    return normalizedExistingId;
  }

  const suffix = options.now instanceof Date && Number.isFinite(options.now.getTime())
    ? options.now.getTime().toString(36)
    : Date.now().toString(36);
  const action = String(options.action || 'action').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
  const planId = String(options.planId || 'plan').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
  return `${planId}_quick_add_${action}_${suffix}`;
}

function getQuickAddIsoTimestamp(now = new Date()) {
  return now instanceof Date && Number.isFinite(now.getTime())
    ? now.toISOString()
    : new Date().toISOString();
}

function normalizeInteger(value, fallback, min, max) {
  const number = Number.parseInt(value, 10);
  const normalized = Number.isFinite(number) ? number : fallback;
  return Math.min(Math.max(normalized, min), max);
}

function normalizeElementRuleStrategy(value) {
  const strategy = String(value || '').trim();
  return QUICK_ADD_ELEMENT_RULE_STRATEGIES.has(strategy) ? strategy : 'samePosition';
}

function normalizeElementRuleLabelMatch(value) {
  const labelMatch = String(value || '').trim();
  return QUICK_ADD_ELEMENT_RULE_LABEL_MATCHES.has(labelMatch) ? labelMatch : 'prefer';
}

function getQuickAddElementRuleName(action) {
  if (action === QUICK_ADD_ACTION_PRESETS.HIDE_IMAGES) {
    return 'DaD Select - hide images';
  }

  if (action === QUICK_ADD_ACTION_PRESETS.DISABLE_CONTROLS) {
    return 'DaD Select - disable controls';
  }

  return 'DaD Select action';
}

function escapeQuickAddKeywordPhrase(value) {
  return String(value || '').replace(/,/g, '\\,');
}
