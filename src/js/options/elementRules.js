// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  isInProtectedSchedule,
  normalizePlans,
  PLANS_STORAGE_KEY
} from '../shared/plans.js';
import {
  getSync
} from '../../platform/chrome/storage.js';
import {
  ELEMENT_RULE_IDS_STORAGE_KEY,
  ELEMENT_RULE_ITEM_PREFIX,
  ELEMENT_RULES_STORAGE_KEY,
  PROTECTED_SYNC_RESERVE_BYTES
} from './element-rules/constants.js';
import {
  formatBytes
} from './element-rules/format.js';
import {
  getElementRuleMessage
} from './element-rules/messages.js';
import {
  createRuleItem
} from './element-rules/ruleItem.js';
import {
  getElementRuleStorageUsage,
  getRules
} from './element-rules/storage.js';

async function renderStorageUsage(rules) {
  const storageUsage = document.getElementById('elementRuleStorageUsage');
  if (!storageUsage) return;

  const { quotaBytes, ruleBytes, totalBytes } = await getElementRuleStorageUsage(rules);
  const protectedLimit = quotaBytes - PROTECTED_SYNC_RESERVE_BYTES;
  const reserveLabel = `Locked schedule reserve ${formatBytes(PROTECTED_SYNC_RESERVE_BYTES)}`;
  const reserveStatus = totalBytes > protectedLimit ? `${reserveLabel} low` : reserveLabel;

  storageUsage.textContent = [
    `${rules.length} UI ${rules.length === 1 ? 'rule' : 'rules'}`,
    `UI rules ${formatBytes(ruleBytes)}`,
    `Sync ${formatBytes(totalBytes)} / ${formatBytes(quotaBytes)}`,
    reserveStatus
  ].join(' · ');
}

export async function renderElementRules() {
  const list = document.getElementById('elementRuleList');
  if (!list) {
    return;
  }

  const [rules, items] = await Promise.all([
    getRules(),
    getSync({ [PLANS_STORAGE_KEY]: [], schedules: [] })
  ]);
  const plans = normalizePlans(items[PLANS_STORAGE_KEY]);
  const isLocked = isInProtectedSchedule(items);
  list.innerHTML = '';
  renderStorageUsage(rules).catch(error => {
    console.error('Failed to render element rule storage usage:', error);
  });

  if (rules.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'element-rule-empty';
    emptyItem.textContent = getElementRuleMessage('noElementRulesLabel');
    list.appendChild(emptyItem);
    return;
  }

  rules.forEach(rule => {
    list.appendChild(createRuleItem(rule, plans, isLocked, {
      onRefresh: renderElementRules
    }));
  });
}

export function initializeElementRulesSync() {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    const hasElementRuleChange = Boolean(
      changes[ELEMENT_RULES_STORAGE_KEY]
        || changes[ELEMENT_RULE_IDS_STORAGE_KEY]
        || Object.keys(changes).some(key => key.startsWith(ELEMENT_RULE_ITEM_PREFIX))
    );

    if (areaName === 'sync' && (hasElementRuleChange || changes[PLANS_STORAGE_KEY])) {
      renderElementRules().catch(error => {
        console.error('Failed to sync element blocking rules:', error);
      });
    }
  });
}
