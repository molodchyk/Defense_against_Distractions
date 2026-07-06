// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { TRIGGERED_ACTION_TRIGGER_TYPES } from '../../../features/triggered-actions/core/index.js';
import {
  parseKeywordForScanning,
  parseStructuralKeywordCondition
} from '../../shared/keywords.js';

export function collectPlanTriggerFilterOptions(plan = {}, triggerType = TRIGGERED_ACTION_TRIGGER_TYPES.BLOCK_SCORE) {
  if (triggerType === TRIGGERED_ACTION_TRIGGER_TYPES.KEYWORD_BLOCK) {
    return collectPlanTriggerKeywords(plan).filter(keyword => !parseStructuralKeywordCondition(keyword));
  }

  if (triggerType === TRIGGERED_ACTION_TRIGGER_TYPES.STRUCTURAL) {
    return collectPlanTriggerKeywords(plan).filter(keyword => Boolean(parseStructuralKeywordCondition(keyword)));
  }

  return [];
}

function collectPlanTriggerKeywords(plan = {}) {
  const seen = new Set();
  const keywords = [];

  (Array.isArray(plan.groups) ? plan.groups : []).forEach(group => {
    (Array.isArray(group?.keywords) ? group.keywords : []).forEach(entry => {
      const keyword = parseKeywordForScanning(String(entry || '')).keyword.trim();
      const key = keyword.toLowerCase();
      if (!keyword || keyword.includes(',') || seen.has(key)) {
        return;
      }

      seen.add(key);
      keywords.push(keyword);
    });
  });

  return keywords;
}
