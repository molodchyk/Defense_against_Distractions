// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createLegacyWebsiteGroupsMigration
} from '../../../src/js/shared/legacyMigration.js';

describe('legacy migration helpers', () => {
  it('turns legacy websiteGroups into group records and removes the legacy key', () => {
    const migration = createLegacyWebsiteGroupsMigration({
      groupCounter: 1,
      websiteGroups: [{
        groupName: 'Legacy',
        websites: ['example.com'],
        keywords: ['news, 50']
      }]
    });

    assert.equal(migration.changed, true);
    assert.deepEqual(migration.removeKeys, ['websiteGroups']);
    assert.equal(migration.setItems.groupCounter, 2);
    assert.deepEqual(migration.setItems.group_2, {
      id: 'group_2',
      groupName: 'Legacy',
      websites: ['example.com'],
      keywords: ['news, 50']
    });
  });

  it('skips occupied group ids during legacy migration', () => {
    const migration = createLegacyWebsiteGroupsMigration({
      groupCounter: 1,
      group_2: { id: 'group_2' },
      websiteGroups: [{
        groupName: 'Legacy',
        websites: [],
        keywords: []
      }]
    });

    assert.equal(migration.setItems.groupCounter, 3);
    assert.equal(migration.setItems.group_3.id, 'group_3');
  });

  it('does nothing when legacy websiteGroups storage is absent', () => {
    assert.deepEqual(createLegacyWebsiteGroupsMigration({}), {
      changed: false,
      setItems: {},
      removeKeys: [],
      migratedGroups: []
    });
  });
});
