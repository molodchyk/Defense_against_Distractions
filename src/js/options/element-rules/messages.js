// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  getUiMessage
} from '../../shared/ui/uiLanguage.js';
import {
  ELEMENT_RULE_MESSAGES
} from './constants.js';

export function getElementRuleMessage(key, fallback = '') {
  return getUiMessage(key, ELEMENT_RULE_MESSAGES[key] || fallback || key);
}
