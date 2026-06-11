// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export const ELEMENT_RULES_STORAGE_KEY = 'elementBlockRules';
export const ELEMENT_RULE_IDS_STORAGE_KEY = 'elementBlockRuleIds';
export const ELEMENT_RULE_ITEM_PREFIX = 'elementBlockRule.';
export const SYNC_QUOTA_BYTES_FALLBACK = 102400;
export const PROTECTED_SYNC_RESERVE_BYTES = 20480;

export const STRATEGIES = [
  ['samePosition', 'Same position'],
  ['sameText', 'Same text or label'],
  ['similar', 'Similar structure'],
  ['exact', 'Closest match']
];

export const LABEL_MATCHES = [
  ['prefer', 'Prefer label'],
  ['ignore', 'Ignore label'],
  ['require', 'Require label']
];

export const FINGERPRINT_FIELDS = [
  ['tag', 'Tag'],
  ['role', 'Role'],
  ['inputType', 'Input type'],
  ['parentTag', 'Parent tag'],
  ['parentRole', 'Parent role'],
  ['childCount', 'Child count'],
  ['tagIndex', 'Tag index'],
  ['positionPath', 'Position path'],
  ['ancestorSignature', 'Ancestors'],
  ['childSignature', 'Children'],
  ['classTokens', 'Class tokens'],
  ['labelTokens', 'Label tokens'],
  ['directTextTokens', 'Direct text tokens']
];

export const ELEMENT_RULE_MESSAGES = {
  lockedScheduleErrorMessage: 'Cannot weaken protection during an active protected schedule.',
  noElementRulesLabel: 'No blocked UI elements'
};
