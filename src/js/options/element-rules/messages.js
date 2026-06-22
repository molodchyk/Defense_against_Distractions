// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  getUiMessage
} from '../../shared/ui/uiLanguage.js';
import {
  ELEMENT_RULE_MESSAGES
} from './constants.js';

export function getElementRuleMessage(key, fallbackOrSubstitutions = '', maybeSubstitutions) {
  const hasExplicitFallback = maybeSubstitutions !== undefined;
  const fallback = hasExplicitFallback ? fallbackOrSubstitutions : (ELEMENT_RULE_MESSAGES[key] || key);
  const substitutions = hasExplicitFallback ? maybeSubstitutions : fallbackOrSubstitutions;
  return getUiMessage(key, ELEMENT_RULE_MESSAGES[key] || fallback || key, substitutions);
}

export function getElementRuleOptionLabel(option = []) {
  const [, messageKey, fallback] = option;
  return getElementRuleMessage(messageKey, fallback || messageKey);
}
