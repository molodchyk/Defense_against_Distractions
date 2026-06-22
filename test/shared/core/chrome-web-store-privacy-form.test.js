// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  chromeWebStoreFieldLimit,
  privacyCertificationKeys,
  privacyDataUsageKeys,
  repositoryUrl,
  storeCategories
} from '../../../scripts/playbook/constants.mjs';
import { getDuplicateKeyedBlockFields, parseKeyedBlock } from '../../../scripts/playbook-utils.mjs';

const PRIVACY_FORM_PATH = 'docs/chrome-web-store-privacy-form.md';
const ADDITIONAL_FIELDS_PATH = 'docs/chrome-web-store-additional-fields.md';
const CATEGORY_PATH = 'docs/chrome-web-store-category.md';
const MANIFEST_PATH = 'manifest.json';

describe('Chrome Web Store privacy form', () => {
  it('keeps every privacy justification within the dashboard character limit', () => {
    const markdown = readFileSync(PRIVACY_FORM_PATH, 'utf8');
    const fields = parseKeyedBlock(markdown, 'privacy');

    assert.notEqual(fields.size, 0, 'No privacy fields found');
    assert.deepEqual(getDuplicateKeyedBlockFields(markdown, 'privacy'), []);

    for (const [key, value] of fields) {
      assert.ok(
        value.length <= chromeWebStoreFieldLimit,
        `${key} is ${value.length} characters; Chrome Web Store fields must be ${chromeWebStoreFieldLimit} characters or fewer`
      );
    }
  });

  it('uses StorePilot canonical privacy keys for the current manifest', () => {
    const markdown = readFileSync(PRIVACY_FORM_PATH, 'utf8');
    const fields = parseKeyedBlock(markdown, 'privacy');
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));

    for (const key of ['single_purpose', 'host_permission', 'remote_code', 'privacy_policy_url']) {
      assert.ok(fields.has(key), `Missing ${key}`);
    }

    for (const permission of manifest.permissions) {
      assert.ok(fields.has(`permission.${permission}`), `Missing permission.${permission}`);
    }

    assert.equal(fields.get('remote_code'), 'no');
    assert.equal(fields.get('privacy_policy_url'), `${repositoryUrl}/blob/main/PRIVACY.md`);
    assert.equal(fields.has('remote_code_justification'), false);

    for (const key of privacyDataUsageKeys) {
      assert.equal(fields.get(key), 'no', `${key} should be no for local-only processing`);
    }

    for (const key of privacyCertificationKeys) {
      assert.equal(fields.get(key), 'yes', `${key} should be yes`);
    }
  });
});

describe('Chrome Web Store automation fields', () => {
  it('keeps additional fields in StorePilot import shape', () => {
    const markdown = readFileSync(ADDITIONAL_FIELDS_PATH, 'utf8');
    const fields = parseKeyedBlock(markdown, 'additional_fields');

    assert.deepEqual(getDuplicateKeyedBlockFields(markdown, 'additional_fields'), []);
    assert.equal(fields.get('official_url'), 'none');
    assert.equal(fields.get('homepage_url'), repositoryUrl);
    assert.equal(fields.get('support_url'), `${repositoryUrl}/issues`);
    assert.equal(fields.get('mature_content'), 'no');
  });

  it('uses a visible Chrome Web Store category label', () => {
    const markdown = readFileSync(CATEGORY_PATH, 'utf8');
    const match = markdown.match(/^Selected category:\s*(.+)$/m);

    assert.ok(match, 'Missing Selected category line');
    assert.ok(storeCategories.includes(match[1].trim()), 'Unknown Chrome Web Store category');
  });
});
