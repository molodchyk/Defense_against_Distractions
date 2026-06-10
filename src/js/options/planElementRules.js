// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { getSync } from '../shared/chromeStorage.js';

export const ELEMENT_RULE_IDS_STORAGE_KEY = 'elementBlockRuleIds';
export const ELEMENT_RULE_ITEM_PREFIX = 'elementBlockRule.';

export async function getElementRuleSummaries(items) {
  const ruleIds = Array.isArray(items[ELEMENT_RULE_IDS_STORAGE_KEY]) ? items[ELEMENT_RULE_IDS_STORAGE_KEY] : [];
  if (ruleIds.length === 0) {
    return [];
  }

  const ruleKeys = ruleIds.map(ruleId => `${ELEMENT_RULE_ITEM_PREFIX}${ruleId}`);
  const ruleItems = await getSync(ruleKeys);
  return ruleIds.map(ruleId => {
    const rule = ruleItems[`${ELEMENT_RULE_ITEM_PREFIX}${ruleId}`];
    return rule ? {
      id: ruleId,
      name: rule.name || rule.urlPattern || ruleId
    } : null;
  }).filter(Boolean);
}
