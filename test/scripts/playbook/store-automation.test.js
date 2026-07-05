// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

import { manifestPermissions } from '../../../scripts/playbook/constants.mjs';
import { getStoreAutomationFailures } from '../../../scripts/playbook/store/automation.mjs';

async function readStoreAutomationDocs() {
  const [
    storePrivacyForm,
    storeAdditionalFields,
    storeCategory,
    storeAutomationIndex
  ] = await Promise.all([
    readFile('docs/chrome-web-store-privacy-form.md', 'utf8'),
    readFile('docs/chrome-web-store-additional-fields.md', 'utf8'),
    readFile('docs/chrome-web-store-category.md', 'utf8'),
    readFile('docs/storepilot-automation.md', 'utf8')
  ]);

  return {
    manifestPermissions,
    storeAdditionalFields,
    storeAutomationIndex,
    storeCategory,
    storePrivacyForm
  };
}

describe('StorePilot automation checks', () => {
  it('accepts the current StorePilot automation documents', async () => {
    assert.deepEqual(getStoreAutomationFailures(await readStoreAutomationDocs()), []);
  });

  it('rejects stale privacy-form permission keys that are not in the manifest', async () => {
    const docs = await readStoreAutomationDocs();
    const stalePrivacyForm = docs.storePrivacyForm.replace(
      'host_permission:',
      'permission.contextMenus:\nLegacy right-click menu justification.\n\nhost_permission:'
    );

    assert.deepEqual(getStoreAutomationFailures({
      ...docs,
      storePrivacyForm: stalePrivacyForm
    }), [
      'StorePilot privacy permission fields must exactly match manifest permissions. Expected: activeTab, alarms, downloads, idle, storage, webNavigation. Found: activeTab, alarms, contextMenus, downloads, idle, storage, webNavigation.'
    ]);
  });

  it('rejects stale StorePilot index permission keys that are not in the manifest', async () => {
    const docs = await readStoreAutomationDocs();
    const staleStoreAutomationIndex = docs.storeAutomationIndex.replace(
      '- `permission.webNavigation`',
      '- `permission.webNavigation`\n- `permission.contextMenus`'
    );

    assert.deepEqual(getStoreAutomationFailures({
      ...docs,
      storeAutomationIndex: staleStoreAutomationIndex
    }), [
      'StorePilot automation index permission keys must exactly match manifest permissions. Expected: activeTab, alarms, downloads, idle, storage, webNavigation. Found: activeTab, alarms, contextMenus, downloads, idle, storage, webNavigation.'
    ]);
  });
});
