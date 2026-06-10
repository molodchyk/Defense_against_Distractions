// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { sanitizePlansForStorage } from './plans.js';

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

function getElementRuleStorageKeys() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(null, result => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      const indexedRuleKeys = Object.keys(result)
        .filter(key => key.startsWith(ELEMENT_RULE_ITEM_PREFIX));
      const ruleIds = Array.isArray(result[ELEMENT_RULE_IDS_STORAGE_KEY])
        ? result[ELEMENT_RULE_IDS_STORAGE_KEY]
        : [];
      const knownRuleKeys = ruleIds.map(getElementRuleStorageKey);

      resolve(Array.from(new Set([
        LEGACY_ELEMENT_RULES_STORAGE_KEY,
        ELEMENT_RULE_IDS_STORAGE_KEY,
        ...indexedRuleKeys,
        ...knownRuleKeys
      ])));
    });
  });
}

function removeElementRules() {
  return getElementRuleStorageKeys().then(keys => {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.remove(keys, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }

        resolve();
      });
    });
  });
}

function setSchedules(schedules) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ schedules }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve();
    });
  });
}

function setPlans(plans) {
  const sanitizedPlans = sanitizePlansForStorage(plans);

  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ plans: sanitizedPlans }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve();
    });
  });
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
