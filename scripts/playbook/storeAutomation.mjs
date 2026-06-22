// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  chromeWebStoreFieldLimit,
  privacyCertificationKeys,
  privacyDataUsageKeys,
  repositoryUrl,
  storeCategories
} from './constants.mjs';
import { getDuplicateKeyedBlockFields, parseKeyedBlock } from '../playbook-utils.mjs';

export function getStoreAutomationFailures({ storePrivacyForm, storeAdditionalFields, storeCategory, manifestPermissions }) {
  const failures = [];
  const assertCondition = (condition, message) => {
    if (!condition) failures.push(message);
  };

  const storePrivacyFields = parseKeyedBlock(storePrivacyForm, 'privacy');
  const duplicateStorePrivacyFields = getDuplicateKeyedBlockFields(storePrivacyForm, 'privacy');
  assertCondition(duplicateStorePrivacyFields.length === 0, `StorePilot privacy form has duplicate keys: ${duplicateStorePrivacyFields.join(', ')}.`);
  for (const [field, value] of storePrivacyFields) {
    assertCondition(
      value.length <= chromeWebStoreFieldLimit,
      `StorePilot privacy field ${field} is ${value.length} characters; Chrome Web Store fields must be ${chromeWebStoreFieldLimit} characters or fewer.`
    );
  }
  for (const field of ['single_purpose', 'host_permission', 'remote_code', 'privacy_policy_url']) {
    assertCondition(storePrivacyFields.has(field), `StorePilot privacy form is missing ${field}.`);
  }
  for (const permission of manifestPermissions) {
    assertCondition(
      storePrivacyFields.has(`permission.${permission}`),
      `StorePilot privacy form is missing permission.${permission}.`
    );
  }
  for (const field of privacyDataUsageKeys) {
    assertCondition(storePrivacyFields.get(field) === 'no', `StorePilot privacy form must set ${field}: no.`);
  }
  for (const field of privacyCertificationKeys) {
    assertCondition(storePrivacyFields.get(field) === 'yes', `StorePilot privacy form must set ${field}: yes.`);
  }
  assertCondition(storePrivacyFields.get('remote_code') === 'no' && !storePrivacyFields.has('remote_code_justification'), 'StorePilot privacy form must set remote_code: no and omit remote_code_justification.');
  assertCondition(/<all_urls>/.test(storePrivacyFields.get('host_permission') || ''), 'StorePilot privacy form must name exact <all_urls> host access.');
  assertCondition(
    storePrivacyFields.get('privacy_policy_url') === `${repositoryUrl}/blob/main/PRIVACY.md`,
    'StorePilot privacy form must point to the repository privacy policy.'
  );

  const additionalFields = parseKeyedBlock(storeAdditionalFields, 'additional_fields');
  const duplicateAdditionalFields = getDuplicateKeyedBlockFields(storeAdditionalFields, 'additional_fields');
  assertCondition(duplicateAdditionalFields.length === 0, `StorePilot additional fields document has duplicate keys: ${duplicateAdditionalFields.join(', ')}.`);
  assertCondition(additionalFields.get('official_url') === 'none', 'StorePilot additional fields must set official_url: none.');
  assertCondition(additionalFields.get('homepage_url') === repositoryUrl, 'StorePilot additional fields must set homepage_url to the repository URL.');
  assertCondition(additionalFields.get('support_url') === `${repositoryUrl}/issues`, 'StorePilot additional fields must set support_url to repository issues.');
  assertCondition(additionalFields.get('mature_content') === 'no', 'StorePilot additional fields must set mature_content: no.');

  const categoryMatch = storeCategory.match(/^Selected category:\s*(.+)$/m);
  assertCondition(Boolean(categoryMatch), 'StorePilot category document must include a Selected category line.');
  assertCondition(
    categoryMatch ? storeCategories.includes(categoryMatch[1].trim()) : false,
    'StorePilot category document must use a visible Chrome Web Store category label.'
  );

  return failures;
}
