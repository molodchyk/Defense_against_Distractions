// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  BLOCKED_PAGE_SETTINGS_STORAGE_KEY,
  getBlockedPageSettingsStorageDefaults,
  normalizeBlockedPageSettings
} from '../shared/blocked-page/settings.js';

export function initBlockedPageCustomMessage({
  safeSyncStorageGet,
  safeStorageOnChangedAddListener
}) {
  function render(settingsValue) {
    const customMessage = document.getElementById('customMessage');
    if (!customMessage) {
      return;
    }

    const settings = normalizeBlockedPageSettings(settingsValue);
    customMessage.textContent = settings.customMessage;
    customMessage.hidden = !settings.customMessage;
  }

  function load() {
    safeSyncStorageGet(getBlockedPageSettingsStorageDefaults(), result => {
      render(result?.[BLOCKED_PAGE_SETTINGS_STORAGE_KEY]);
    });
  }

  load();

  safeStorageOnChangedAddListener((changes, areaName) => {
    if (areaName === 'sync' && changes[BLOCKED_PAGE_SETTINGS_STORAGE_KEY]) {
      render(changes[BLOCKED_PAGE_SETTINGS_STORAGE_KEY].newValue);
    }
  });

  return {
    load,
    render
  };
}
