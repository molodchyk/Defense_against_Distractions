// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

import { storageKeyFamilies } from '../../../scripts/playbook/constants.mjs';
import { getStorageOwnershipFailures } from '../../../scripts/playbook/storageOwnership.mjs';

async function readStorageOwnership() {
  return readFile('docs/storage-ownership.md', 'utf8');
}

describe('storage ownership checks', () => {
  it('accepts the current storage ownership document', async () => {
    const storageOwnership = await readStorageOwnership();

    assert.deepEqual(getStorageOwnershipFailures({ storageOwnership, storageKeyFamilies }), []);
  });

  it('rejects key families without a documented ownership section', async () => {
    const storageOwnership = await readStorageOwnership();
    const weakenedStorageOwnership = storageOwnership.replace(
      '- Keys: `plans`, `planCounter`, `planMigrationState`.',
      '- Keys: `plans`, `planCounter`.'
    );

    assert.deepEqual(getStorageOwnershipFailures({
      storageOwnership: weakenedStorageOwnership,
      storageKeyFamilies
    }), ['Storage ownership document must cover planMigrationState.']);
  });

  it('rejects key sections that lose required ownership fields', async () => {
    const storageOwnership = await readStorageOwnership();
    const weakenedStorageOwnership = storageOwnership.replace(
      '- Migration path: `src/js/options/plans/migration.js` creates and normalizes plan records, moves legacy standalone schedules and whitelists into plans, and records one-way migration flags in `planMigrationState`.',
      '- Migration note: `src/js/options/plans/migration.js` creates and normalizes plan records, moves legacy standalone schedules and whitelists into plans, and records one-way migration flags in `planMigrationState`.'
    );

    assert.deepEqual(getStorageOwnershipFailures({
      storageOwnership: weakenedStorageOwnership,
      storageKeyFamilies
    }), [
      'Storage ownership section "Plans" for plans is missing required fields: Migration path.',
      'Storage ownership section "Plans" for planCounter is missing required fields: Migration path.',
      'Storage ownership section "Plans" for planMigrationState is missing required fields: Migration path.'
    ]);
  });
});
