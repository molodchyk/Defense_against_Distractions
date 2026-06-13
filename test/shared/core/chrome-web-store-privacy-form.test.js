// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const PRIVACY_FORM_PATH = 'docs/chrome-web-store-privacy-form.md';
const CHROME_WEB_STORE_FIELD_LIMIT = 1000;

function getPrivacyBlock(markdown) {
  const privacyStart = markdown.indexOf('[privacy]');
  assert.notEqual(privacyStart, -1, 'Missing [privacy] block');

  const afterPrivacyHeading = markdown.slice(privacyStart + '[privacy]'.length);
  const nextHeading = afterPrivacyHeading.search(/^##\s+/m);
  return nextHeading === -1 ? afterPrivacyHeading : afterPrivacyHeading.slice(0, nextHeading);
}

function parsePrivacyFields(markdown) {
  const block = getPrivacyBlock(markdown);
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
    const fields = parsePrivacyFields(markdown);

    assert.notEqual(fields.size, 0, 'No privacy fields found');

    for (const [key, value] of fields) {
      assert.ok(
        value.length <= CHROME_WEB_STORE_FIELD_LIMIT,
        `${key} is ${value.length} characters; Chrome Web Store fields must be ${CHROME_WEB_STORE_FIELD_LIMIT} characters or fewer`
      );
    }
  });
});
