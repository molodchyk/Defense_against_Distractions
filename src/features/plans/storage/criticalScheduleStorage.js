// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { getSync, removeSync, setSync } from '../../../platform/chrome/storage.js';
import { sanitizePlansForStorage } from '../core/index.js';

const LEGACY_ELEMENT_RULES_STORAGE_KEY = 'elementBlockRules';
const ELEMENT_RULE_IDS_STORAGE_KEY = 'elementBlockRuleIds';
const ELEMENT_RULE_ITEM_PREFIX = 'elementBlockRule.';

function isQuotaError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('quota') || message.includes('max') || message.includes('storage');
}

function getElementRuleStorageKey(ruleId) {
  return `${ELEMENT_RULE_ITEM_PREFIX}${ruleId}`;
}

async function getElementRuleStorageKeys() {
  const result = await getSync(null);
  const indexedRuleKeys = Object.keys(result)
    .filter(key => key.startsWith(ELEMENT_RULE_ITEM_PREFIX));
  const ruleIds = Array.isArray(result[ELEMENT_RULE_IDS_STORAGE_KEY])
    ? result[ELEMENT_RULE_IDS_STORAGE_KEY]
    : [];
  const knownRuleKeys = ruleIds.map(getElementRuleStorageKey);

  return Array.from(new Set([
    LEGACY_ELEMENT_RULES_STORAGE_KEY,
    ELEMENT_RULE_IDS_STORAGE_KEY,
    ...indexedRuleKeys,
    ...knownRuleKeys
  ]));
}

async function removeElementRules() {
  await removeSync(await getElementRuleStorageKeys());
}

function setSchedules(schedules) {
  return setSync({ schedules });
}

function setPlans(plans) {
  const sanitizedPlans = sanitizePlansForStorage(plans);
  return setSync({ plans: sanitizedPlans });
}

export async function saveSchedulesWithPriority(schedules) {
  try {
    await setSchedules(schedules);
  } catch (error) {
    if (!isQuotaError(error)) {
      throw error;
    }

    console.warn('Schedule save hit sync quota. Removing non-critical UI element rules and retrying.', error);
    await removeElementRules();
    await setSchedules(schedules);
  }
}

export async function savePlansWithPriority(plans) {
  try {
    await setPlans(plans);
  } catch (error) {
    if (!isQuotaError(error)) {
      throw error;
    }

    console.warn('Plan save hit sync quota. Removing non-critical UI element rules and retrying.', error);
    await removeElementRules();
    await setPlans(plans);
  }
}
