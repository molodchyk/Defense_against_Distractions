// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const PRIVACY_FORM_PATH = 'docs/chrome-web-store-privacy-form.md';
const ADDITIONAL_FIELDS_PATH = 'docs/chrome-web-store-additional-fields.md';
const CATEGORY_PATH = 'docs/chrome-web-store-category.md';
const MANIFEST_PATH = 'manifest.json';
const CHROME_WEB_STORE_FIELD_LIMIT = 1000;
const REPOSITORY_URL = 'https://github.com/molodchyk/Defense_against_Distractions';
const DATA_USAGE_KEYS = [
  'data_usage.personally_identifiable_information',
  'data_usage.health_information',
  'data_usage.financial_payment_information',
  'data_usage.authentication_information',
  'data_usage.personal_communications',
  'data_usage.location',
  'data_usage.web_history',
  'data_usage.user_activity',
  'data_usage.website_content'
];
const CERTIFICATION_KEYS = [
  'certification.no_sell_or_transfer',
  'certification.no_unrelated_use',
  'certification.no_creditworthiness'
];
const STORE_CATEGORIES = [
  'Communication',
  'Developer Tools',
  'Education',
  'Tools',
  'Workflow and planning',
  'Art & Design',
  'Entertainment',
  'Games',
  'Household',
  'Just for fun',
  'News & Weather',
  'Shopping',
  'Social Networking',
  'Travel',
  'Wellbeing',
  'Accessibility',
  'Functionality and UI',
  'Privacy & Security'
];

function getBracketBlock(markdown, blockName) {
  const blockMarker = `[${blockName}]`;
  const blockStart = markdown.indexOf(blockMarker);
  assert.notEqual(blockStart, -1, `Missing [${blockName}] block`);

  const afterBlockHeading = markdown.slice(blockStart + blockMarker.length);
  const nextHeading = afterBlockHeading.search(/^##\s+/m);
  return nextHeading === -1 ? afterBlockHeading : afterBlockHeading.slice(0, nextHeading);
}

function parseFields(markdown, blockName) {
  const block = getBracketBlock(markdown, blockName);
  const fieldPattern = /^([A-Za-z0-9_.-]+):[ \t]*\r?\n([\s\S]*?)(?=^[A-Za-z0-9_.-]+:[ \t]*\r?\n|\s*$)/gm;
  const fields = new Map();

  for (const match of block.matchAll(fieldPattern)) {
    fields.set(match[1], match[2].trim());
  }

  return fields;
}

describe('Chrome Web Store privacy form', () => {
  it('keeps every privacy justification within the dashboard character limit', () => {
    const markdown = readFileSync(PRIVACY_FORM_PATH, 'utf8');
    const fields = parseFields(markdown, 'privacy');

    assert.notEqual(fields.size, 0, 'No privacy fields found');

    for (const [key, value] of fields) {
      assert.ok(
        value.length <= CHROME_WEB_STORE_FIELD_LIMIT,
        `${key} is ${value.length} characters; Chrome Web Store fields must be ${CHROME_WEB_STORE_FIELD_LIMIT} characters or fewer`
      );
    }
  });

  it('uses StorePilot canonical privacy keys for the current manifest', () => {
    const markdown = readFileSync(PRIVACY_FORM_PATH, 'utf8');
    const fields = parseFields(markdown, 'privacy');
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));

    for (const key of ['single_purpose', 'host_permission', 'remote_code', 'privacy_policy_url']) {
      assert.ok(fields.has(key), `Missing ${key}`);
    }

    for (const permission of manifest.permissions) {
      assert.ok(fields.has(`permission.${permission}`), `Missing permission.${permission}`);
    }

    assert.equal(fields.get('remote_code'), 'no');
    assert.equal(fields.get('privacy_policy_url'), `${REPOSITORY_URL}/blob/main/PRIVACY.md`);
    assert.equal(fields.has('remote_code_justification'), false);

    for (const key of DATA_USAGE_KEYS) {
      assert.equal(fields.get(key), 'no', `${key} should be no for local-only processing`);
    }

    for (const key of CERTIFICATION_KEYS) {
      assert.equal(fields.get(key), 'yes', `${key} should be yes`);
    }
  });
});

describe('Chrome Web Store automation fields', () => {
  it('keeps additional fields in StorePilot import shape', () => {
    const markdown = readFileSync(ADDITIONAL_FIELDS_PATH, 'utf8');
    const fields = parseFields(markdown, 'additional_fields');

    assert.equal(fields.get('official_url'), 'none');
    assert.equal(fields.get('homepage_url'), REPOSITORY_URL);
    assert.equal(fields.get('support_url'), `${REPOSITORY_URL}/issues`);
    assert.equal(fields.get('mature_content'), 'no');
  });

  it('uses a visible Chrome Web Store category label', () => {
    const markdown = readFileSync(CATEGORY_PATH, 'utf8');
    const match = markdown.match(/^Selected category:\s*(.+)$/m);

    assert.ok(match, 'Missing Selected category line');
    assert.ok(STORE_CATEGORIES.includes(match[1].trim()), 'Unknown Chrome Web Store category');
  });
});
