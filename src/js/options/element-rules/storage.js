// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  getBytesInUseSync,
  getSyncQuotaBytes,
  getSync,
  removeSync,
  setSync
} from '../../../platform/chrome/storage.js';
import {
  savePlansWithPriority
} from '../../../features/plans/storage/criticalScheduleStorage.js';
import {
  isInProtectedSchedule,
  normalizePlans,
  PLANS_STORAGE_KEY
} from '../../shared/plans.js';
import {
  ELEMENT_RULE_IDS_STORAGE_KEY,
  ELEMENT_RULE_ITEM_PREFIX,
  ELEMENT_RULES_STORAGE_KEY,
  ELEMENT_RULE_MESSAGES,
  PROTECTED_SYNC_RESERVE_BYTES,
  SYNC_QUOTA_BYTES_FALLBACK
} from './constants.js';

export function isElementRulePatchAllowedDuringProtectedSchedule(rule = {}, patch = {}) {
  const isActiveRule = rule?.enabled !== false;
  return !(isActiveRule && patch?.enabled === false);
}

export function isElementRuleRemovalAllowedDuringProtectedSchedule(rule = {}) {
  return rule?.enabled === false;
}

function createLockedScheduleError() {
  return new Error(ELEMENT_RULE_MESSAGES.lockedScheduleErrorMessage);
}

export function getElementRuleStorageKey(ruleId) {
  return `${ELEMENT_RULE_ITEM_PREFIX}${ruleId}`;
}

function dedupeRules(rules) {
  const seenIds = new Set();
  return (rules || []).filter(rule => {
    if (!rule?.id || seenIds.has(rule.id)) return false;
    seenIds.add(rule.id);
    return true;
  });
}

function estimateSyncItemBytes(items) {
  return Object.entries(items).reduce((totalBytes, [key, value]) => {
    return totalBytes + key.length + String(JSON.stringify(value) || '').length;
  }, 0);
}

async function ensureElementRuleStorageBudget(items, replacingKeys) {
  const quotaBytes = getSyncQuotaBytes(SYNC_QUOTA_BYTES_FALLBACK);
  const protectedLimit = quotaBytes - PROTECTED_SYNC_RESERVE_BYTES;
  const [totalBytes, replacingBytes] = await Promise.all([
    getBytesInUseSync(null),
    getBytesInUseSync(replacingKeys)
  ]);
  const projectedBytes = totalBytes - replacingBytes + estimateSyncItemBytes(items);

  if (projectedBytes > protectedLimit && projectedBytes > totalBytes) {
    throw new Error('Cannot save this UI rule: sync storage reserve for locked schedules would be exceeded.');
  }
}

export async function getRules() {
  const result = await getSync({ [ELEMENT_RULES_STORAGE_KEY]: [], [ELEMENT_RULE_IDS_STORAGE_KEY]: [] });
  const legacyRules = Array.isArray(result[ELEMENT_RULES_STORAGE_KEY]) ? result[ELEMENT_RULES_STORAGE_KEY] : [];
  const ruleIds = Array.isArray(result[ELEMENT_RULE_IDS_STORAGE_KEY]) ? result[ELEMENT_RULE_IDS_STORAGE_KEY] : [];

  if (ruleIds.length === 0) {
    const rules = dedupeRules(legacyRules);
    if (rules.length > 0) {
      await saveRules(rules);
    }
    return rules;
  }

  const ruleKeys = ruleIds.map(getElementRuleStorageKey);
  const ruleItems = await getSync(ruleKeys);
  const indexedRules = ruleIds.map(ruleId => ruleItems[getElementRuleStorageKey(ruleId)]).filter(Boolean);
  const rules = dedupeRules([...indexedRules, ...legacyRules]);

  if (legacyRules.length > 0) {
    await saveRules(rules);
  }

  return rules;
}

export async function saveRules(rules) {
  const current = await getSync({ [ELEMENT_RULE_IDS_STORAGE_KEY]: [] });
  const previousIds = Array.isArray(current[ELEMENT_RULE_IDS_STORAGE_KEY]) ? current[ELEMENT_RULE_IDS_STORAGE_KEY] : [];
  const nextRules = dedupeRules(rules);
  const nextIds = nextRules.map(rule => rule.id);
  const items = {
    [ELEMENT_RULE_IDS_STORAGE_KEY]: nextIds
  };

  nextRules.forEach(rule => {
    items[getElementRuleStorageKey(rule.id)] = rule;
  });

  const removedKeys = previousIds
    .filter(ruleId => !nextIds.includes(ruleId))
    .map(getElementRuleStorageKey);
  const replacingKeys = [
    ELEMENT_RULES_STORAGE_KEY,
    ELEMENT_RULE_IDS_STORAGE_KEY,
    ...previousIds.map(getElementRuleStorageKey),
    ...nextIds.map(getElementRuleStorageKey)
  ];

  await ensureElementRuleStorageBudget(items, replacingKeys);
  await setSync(items);
  await removeSync([ELEMENT_RULES_STORAGE_KEY, ...removedKeys]);
}

export async function updateRule(ruleId, patch) {
  const rules = await getRules();
  const items = await getSync({ [PLANS_STORAGE_KEY]: [], schedules: [] });
  const rule = rules.find(candidate => candidate.id === ruleId);

  if (
    rule
      && isInProtectedSchedule(items)
      && !isElementRulePatchAllowedDuringProtectedSchedule(rule, patch)
  ) {
    throw createLockedScheduleError();
  }

  await saveRules(rules.map(rule => {
    return rule.id === ruleId ? { ...rule, ...patch } : rule;
  }));
}

export async function removeRule(ruleId) {
  const rules = await getRules();
  const items = await getSync({ [PLANS_STORAGE_KEY]: [], schedules: [] });
  const plans = normalizePlans(items[PLANS_STORAGE_KEY]);
  const rule = rules.find(candidate => candidate.id === ruleId);

  if (
    rule
      && isInProtectedSchedule(items)
      && !isElementRuleRemovalAllowedDuringProtectedSchedule(rule)
  ) {
    throw createLockedScheduleError();
  }

  await saveRules(rules.filter(rule => rule.id !== ruleId));

  if (plans.length > 0) {
    await savePlansWithPriority(plans.map(plan => ({
      ...plan,
      uiRuleIds: plan.uiRuleIds.filter(candidateId => candidateId !== ruleId)
    })));
  }
}

export async function getElementRuleStorageUsage(rules) {
  const ruleKeys = [
    ELEMENT_RULE_IDS_STORAGE_KEY,
    ...rules.map(rule => getElementRuleStorageKey(rule.id))
  ];
  const [ruleBytes, totalBytes] = await Promise.all([
    getBytesInUseSync(ruleKeys),
    getBytesInUseSync(null)
  ]);

  return {
    quotaBytes: getSyncQuotaBytes(SYNC_QUOTA_BYTES_FALLBACK),
    ruleBytes,
    totalBytes
  };
}
