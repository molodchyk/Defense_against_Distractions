// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { debugLog } from '../shared/logger.js';

export function initializeDefaultSettings() {
  chrome.runtime.onInstalled.addListener(details => {
    if (details.reason !== 'install') {
      return;
    }

    const defaultWhitelistedSites = ['example.com'];
    chrome.storage.sync.set({ whitelistedSites: defaultWhitelistedSites }, () => {
      debugLog('Default whitelisted sites added on first install');
    });
  });
}
