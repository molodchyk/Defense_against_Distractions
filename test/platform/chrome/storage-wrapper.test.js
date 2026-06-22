// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { getSyncQuotaBytes } from '../../../src/platform/chrome/storage.js';

describe('Chrome storage platform wrapper', () => {
  const originalChrome = globalThis.chrome;

  afterEach(() => {
    globalThis.chrome = originalChrome;
  });

  it('wraps sync quota access with a fallback', () => {
    globalThis.chrome = {
      storage: {
        sync: {
          QUOTA_BYTES: 2048
        }
      }
    };

    assert.equal(getSyncQuotaBytes(1024), 2048);
  });

  it('returns the fallback when sync quota access is unavailable', () => {
    globalThis.chrome = {};

    assert.equal(getSyncQuotaBytes(1024), 1024);
  });
});
