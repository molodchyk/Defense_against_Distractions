// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { debugLog } from '../shared/logger.js';
import { addInstalledListener } from '../../platform/chrome/runtime.js';
import { setSync } from '../../platform/chrome/storage.js';

export function initializeDefaultSettings() {
  addInstalledListener(details => {
    if (details.reason !== 'install') {
      return;
    }

    const defaultWhitelistedSites = ['example.com'];
    setSync({ whitelistedSites: defaultWhitelistedSites }).then(() => {
      debugLog('Default whitelisted sites added on first install');
    }).catch(error => {
      console.error('Failed to add default whitelisted sites:', error);
    });
  });
}
