// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  chromeWebStoreFieldLimit,
  manifestPermissions,
  privacyCertificationKeys,
  privacyDataUsageKeys,
  repositoryUrl,
  storeCategories
} from '../../../scripts/playbook/constants.mjs';
import { getDuplicateKeyedBlockFields, hasAll, parseKeyedBlock } from '../../../scripts/playbook-utils.mjs';

const PRIVACY_FORM_PATH = 'docs/chrome-web-store-privacy-form.md';
const ADDITIONAL_FIELDS_PATH = 'docs/chrome-web-store-additional-fields.md';
const CATEGORY_PATH = 'docs/chrome-web-store-category.md';
const STOREPILOT_INDEX_PATH = 'docs/storepilot-automation.md';
const RELEASE_CHECKLIST_PATH = 'docs/release-checklist.md';
const PERMISSION_AUDIT_PATH = 'docs/permission-audit.md';
const PRIVACY_PATH = 'PRIVACY.md';
const SELECTED_TEXT_QUICK_ADD_PATH = 'docs/selected-text-quick-add.md';
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

  it('preserves specific idle and webNavigation permission justifications', () => {
    const markdown = readFileSync(PRIVACY_FORM_PATH, 'utf8');
    const fields = parseKeyedBlock(markdown, 'privacy');

    assert.match(fields.get('permission.idle') || '', /active, idle, or locked/i);
    assert.match(fields.get('permission.idle') || '', /Pomodoro timing/i);
    assert.match(fields.get('permission.idle') || '', /credit .*away time.*required rest period/i);
    assert.match(fields.get('permission.idle') || '', /not sent to a server/i);

    assert.match(fields.get('permission.webNavigation') || '', /top-frame navigation events and transition types/i);
    assert.match(fields.get('permission.webNavigation') || '', /link clicks, typed navigation, reloads, history-state changes, and redirects/i);
    assert.match(fields.get('permission.webNavigation') || '', /intent-coherence system, drift detection, recovery prompts, and diagnostics/i);
    assert.match(fields.get('permission.webNavigation') || '', /does not send navigation data to a server/i);
  });

  it('keeps manifest permissions synchronized across audited release surfaces', () => {
    const privacyForm = readFileSync(PRIVACY_FORM_PATH, 'utf8');
    const privacyFields = parseKeyedBlock(privacyForm, 'privacy');
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
    const permissionAudit = readFileSync(PERMISSION_AUDIT_PATH, 'utf8');
    const privacyPolicy = readFileSync(PRIVACY_PATH, 'utf8');
    const storePilotIndex = readFileSync(STOREPILOT_INDEX_PATH, 'utf8');
    const selectedTextQuickAdd = readFileSync(SELECTED_TEXT_QUICK_ADD_PATH, 'utf8');

    const currentPermissionAuditSection = permissionAudit.match(/## Current Manifest Permissions([\s\S]*?)\n## Host Access Through Content Scripts/)?.[1] || '';
    const permissionAuditHeadings = [...currentPermissionAuditSection.matchAll(/^### `([^`]+)`$/gm)].map(match => match[1]);
    const privacyPermissionBullets = [...privacyPolicy.matchAll(/^- `([^`]+)`: /gm)].map(match => match[1]);
    const storePilotPermissionKeys = [...storePilotIndex.matchAll(/^- `permission\.([^`]+)`$/gm)].map(match => match[1]);
    const privacyFormPermissionKeys = [...privacyFields.keys()]
      .filter(key => key.startsWith('permission.'))
      .map(key => key.slice('permission.'.length))
      .sort();
    const expectedPermissionKeys = [...manifestPermissions].sort();

    assert.deepEqual(manifest.permissions, manifestPermissions, 'manifest permissions must exactly match the audited list');
    assert.deepEqual(permissionAuditHeadings, manifestPermissions, 'permission audit headings must exactly match manifest permissions');
    assert.deepEqual(privacyPermissionBullets, manifestPermissions, 'privacy permission bullets must exactly match manifest permissions');
    assert.deepEqual(storePilotPermissionKeys, manifestPermissions, 'StorePilot index permission keys must exactly match manifest permissions');
    assert.deepEqual(privacyFormPermissionKeys, expectedPermissionKeys, 'StorePilot privacy fields must exactly match manifest permissions');

    assert.equal(manifest.permissions.includes('contextMenus'), false);
    assert.equal(privacyFields.has('permission.contextMenus'), false);
    assert.match(permissionAudit, /`contextMenus`: not requested[\s\S]*right-click context-menu variant[\s\S]*StorePilot privacy permission keys/i);
    assert.match(selectedTextQuickAdd, /right-click context-menu variant adds `contextMenus`[\s\S]*StorePilot privacy form[\s\S]*Chrome Web Store permission justification/i);
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

  it('maps StorePilot import inputs for the current project shape', () => {
    const markdown = readFileSync(STOREPILOT_INDEX_PATH, 'utf8');
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));

    assert.ok(hasAll(markdown, [
      /# StorePilot Automation/,
      /store\/store-listing\/<locale>\.txt/,
      /docs\/chrome-web-store-privacy-form\.md/,
      /\[privacy\]/,
      /docs\/chrome-web-store-additional-fields\.md/,
      /\[additional_fields\]/,
      /docs\/chrome-web-store-category\.md/,
      /Selected category:/,
      /assets\/icons\/extension-icon-128\.png/,
      /store\/screenshots\//,
      /store\/promo\//,
      /docs\/store-media-review\.md/,
      /npm run verify:playbook/,
      /npm run verify:release/
    ]));

    for (const permission of manifest.permissions) {
      assert.match(markdown, new RegExp(`permission\\.${permission}`));
    }
  });

  it('keeps StorePilot dashboard files in the release checklist', () => {
    const checklist = readFileSync(RELEASE_CHECKLIST_PATH, 'utf8');

    assert.ok(hasAll(checklist, [
      /docs\/storepilot-automation\.md/,
      /docs\/chrome-web-store-privacy-form\.md/,
      /\[privacy\]/,
      /docs\/chrome-web-store-additional-fields\.md/,
      /\[additional_fields\]/,
      /docs\/chrome-web-store-category\.md/,
      /selected Chrome Web Store category/i
    ]));
  });
});
