// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { download } from '../../../src/platform/chrome/downloads.js';

describe('Chrome downloads platform wrapper', () => {
  const originalChrome = globalThis.chrome;

  afterEach(() => {
    globalThis.chrome = originalChrome;
  });

  it('resolves the created download id', async () => {
    let requestedOptions = null;

    globalThis.chrome = {
      runtime: { lastError: null },
      downloads: {
        download(options, callback) {
          requestedOptions = options;
          callback(42);
        }
      }
    };

    const downloadId = await download({
      filename: 'dad-export.json',
      url: 'data:text/json,%7B%7D'
    });

    assert.equal(downloadId, 42);
    assert.deepEqual(requestedOptions, {
      filename: 'dad-export.json',
      url: 'data:text/json,%7B%7D'
    });
  });

  it('rejects Chrome runtime download errors', async () => {
    const downloadError = new Error('Download denied.');

    globalThis.chrome = {
      runtime: { lastError: downloadError },
      downloads: {
        download(_options, callback) {
          callback(undefined);
        }
      }
    };

    await assert.rejects(
      () => download({
        filename: 'dad-export.json',
        url: 'data:text/json,%7B%7D'
      }),
      downloadError
    );
  });
});
