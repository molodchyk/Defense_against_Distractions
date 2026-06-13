// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  BLOCKED_PAGE_CUSTOM_MESSAGE_MAX_LENGTH,
  BLOCKED_PAGE_SETTINGS_STORAGE_KEY,
  DEFAULT_BLOCKED_PAGE_SETTINGS,
  getBlockedPageSettingsStorageDefaults,
  normalizeBlockedPageCustomMessage,
  normalizeBlockedPageSettings
} from '../../../src/js/shared/blocked-page/settings.js';

describe('blocked page settings helpers', () => {
  it('normalizes custom blocked-page notes into bounded plain text', () => {
    assert.equal(
      normalizeBlockedPageCustomMessage('  Return to plan.\r\n\r\n\r\nDo the next step.  '),
      'Return to plan.\n\nDo the next step.'
    );

    assert.equal(
      normalizeBlockedPageCustomMessage('line with spaces   \nnext'),
      'line with spaces\nnext'
    );
  });

  it('limits custom blocked-page notes to the storage budget', () => {
    const longMessage = 'x'.repeat(BLOCKED_PAGE_CUSTOM_MESSAGE_MAX_LENGTH + 50);
    assert.equal(
      normalizeBlockedPageCustomMessage(longMessage).length,
      BLOCKED_PAGE_CUSTOM_MESSAGE_MAX_LENGTH
    );
  });

  it('returns defaults and normalized settings under the expected storage key', () => {
    assert.deepEqual(getBlockedPageSettingsStorageDefaults(), {
      [BLOCKED_PAGE_SETTINGS_STORAGE_KEY]: DEFAULT_BLOCKED_PAGE_SETTINGS
    });

    assert.deepEqual(normalizeBlockedPageSettings({ customMessage: 42 }), {
      customMessage: '42'
    });
  });
});
