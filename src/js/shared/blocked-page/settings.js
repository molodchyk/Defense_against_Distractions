// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export const BLOCKED_PAGE_SETTINGS_STORAGE_KEY = 'blockedPageSettings';
export const BLOCKED_PAGE_CUSTOM_MESSAGE_MAX_LENGTH = 280;

export const DEFAULT_BLOCKED_PAGE_SETTINGS = Object.freeze({
  customMessage: ''
});

export function normalizeBlockedPageCustomMessage(value) {
  return String(value || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, BLOCKED_PAGE_CUSTOM_MESSAGE_MAX_LENGTH);
}

export function normalizeBlockedPageSettings(settings = {}) {
  return {
    customMessage: normalizeBlockedPageCustomMessage(settings?.customMessage)
  };
}

export function getBlockedPageSettingsStorageDefaults() {
  return {
    [BLOCKED_PAGE_SETTINGS_STORAGE_KEY]: DEFAULT_BLOCKED_PAGE_SETTINGS
  };
}
