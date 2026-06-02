// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { getSync, setSync } from '../shared/chromeStorage.js';
import {
  RELEASE_BACKUP_NOTICE_ELIGIBLE_KEY,
  RELEASE_BACKUP_NOTICE_SEEN_KEY,
  RELEASE_BACKUP_NOTICE_VERSION,
  hasExistingConfiguration
} from '../shared/releaseBackupNotice.js';

export function initializeReleaseBackupNoticeEligibility() {
  chrome.runtime.onInstalled.addListener(async details => {
    const currentVersion = chrome.runtime.getManifest().version;
    if (details.reason !== 'update' || currentVersion !== RELEASE_BACKUP_NOTICE_VERSION) {
      return;
    }

    try {
      const items = await getSync(null);
      if (items[RELEASE_BACKUP_NOTICE_SEEN_KEY] || items[RELEASE_BACKUP_NOTICE_ELIGIBLE_KEY]) {
        return;
      }

      if (hasExistingConfiguration(items)) {
        await setSync({ [RELEASE_BACKUP_NOTICE_ELIGIBLE_KEY]: true });
      }
    } catch (error) {
      console.error('Failed to stamp release backup notice eligibility:', error);
    }
  });
}
