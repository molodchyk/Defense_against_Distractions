// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { sendRuntimeMessage } from '../../../src/platform/chrome/runtimeMessages.js';

describe('Chrome runtime messages platform wrapper', () => {
  const originalChrome = globalThis.chrome;

  afterEach(() => {
    globalThis.chrome = originalChrome;
  });

  it('resolves the background response', async () => {
    let requestedMessage = null;

    globalThis.chrome = {
      runtime: {
        lastError: null,
        sendMessage(message, callback) {
          requestedMessage = message;
          callback({ status: 'ok' });
        }
      }
    };

    const response = await sendRuntimeMessage({ action: 'getUsageStats' });

    assert.deepEqual(requestedMessage, { action: 'getUsageStats' });
    assert.deepEqual(response, { status: 'ok' });
  });

  it('resolves null on Chrome runtime errors', async () => {
    globalThis.chrome = {
      runtime: {
        lastError: new Error('Receiver unavailable.'),
        sendMessage(_message, callback) {
          callback(undefined);
        }
      }
    };

    assert.equal(await sendRuntimeMessage({ action: 'getUsageStats' }), null);
  });
});
