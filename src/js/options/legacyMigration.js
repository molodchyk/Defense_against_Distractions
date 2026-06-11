// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { createLegacyWebsiteGroupsMigration } from '../shared/legacyMigration.js';
import { getSync, removeSync, setSync } from '../shared/storage/chromeStorage.js';
import { debugLog } from '../shared/logger.js';

export async function migrateLegacyWebsiteGroupsStorage() {
  const items = await getSync(null);
  const migration = createLegacyWebsiteGroupsMigration(items);

  if (!migration.changed) {
    debugLog('No legacy websiteGroups storage to migrate.');
    return migration;
  }

  if (Object.keys(migration.setItems).length > 0) {
    await setSync(migration.setItems);
  }

  if (migration.removeKeys.length > 0) {
    await removeSync(migration.removeKeys);
  }

  debugLog(`Migrated ${migration.migratedGroups.length} legacy websiteGroups entries.`);
  return migration;
}
