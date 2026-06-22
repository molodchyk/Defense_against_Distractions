// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export function getUILanguage() {
  try {
    return chrome.i18n?.getUILanguage?.() || '';
  } catch (error) {
    return '';
  }
}

export function getMessage(messageKey, substitutions) {
  try {
    return chrome.i18n?.getMessage?.(messageKey, substitutions) || '';
  } catch (error) {
    return '';
  }
}
