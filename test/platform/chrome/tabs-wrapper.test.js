// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  createTab,
  getActiveCurrentWindowTab,
  sendTabMessage,
  updateTab
} from '../../../src/platform/chrome/tabs.js';

describe('Chrome tabs platform wrapper', () => {
  const originalChrome = globalThis.chrome;

  afterEach(() => {
    globalThis.chrome = originalChrome;
  });

  it('resolves the active current-window tab', async () => {
    let requestedQuery = null;

    globalThis.chrome = {
      runtime: { lastError: null },
      tabs: {
        query(queryInfo, callback) {
          requestedQuery = queryInfo;
          callback([{ id: 7, url: 'https://example.test/' }]);
        }
      }
    };

    const tab = await getActiveCurrentWindowTab();

    assert.deepEqual(requestedQuery, { active: true, currentWindow: true });
    assert.deepEqual(tab, { id: 7, url: 'https://example.test/' });
  });

  it('creates a tab with the requested URL', async () => {
    let requestedProperties = null;

    globalThis.chrome = {
      runtime: { lastError: null },
      tabs: {
        create(createProperties, callback) {
          requestedProperties = createProperties;
          callback({ id: 8, url: createProperties.url });
        }
      }
    };

    const tab = await createTab({ url: 'src/options.html#settingsPanel' });

    assert.deepEqual(requestedProperties, { url: 'src/options.html#settingsPanel' });
    assert.deepEqual(tab, { id: 8, url: 'src/options.html#settingsPanel' });
  });

  it('resolves tab-message responses with and without options', async () => {
    const calls = [];

    globalThis.chrome = {
      runtime: { lastError: null },
      tabs: {
        sendMessage(...args) {
          calls.push(args.slice(0, -1));
          args.at(-1)({ status: 'ok' });
        }
      }
    };

    assert.deepEqual(await sendTabMessage(7, { action: 'ping' }), { status: 'ok' });
    assert.deepEqual(await sendTabMessage(7, { action: 'ping' }, { frameId: 0 }), { status: 'ok' });
    assert.deepEqual(calls, [
      [7, { action: 'ping' }],
      [7, { action: 'ping' }, { frameId: 0 }]
    ]);
  });

  it('resolves null on tab-message and tab-update runtime errors', async () => {
    globalThis.chrome = {
      runtime: { lastError: new Error('Receiver unavailable.') },
      tabs: {
        sendMessage(_tabId, _message, callback) {
          callback(undefined);
        },
        update(_tabId, _updateProperties, callback) {
          callback(undefined);
        }
      }
    };

    assert.equal(await sendTabMessage(7, { action: 'ping' }), null);
    assert.equal(await updateTab(7, { url: 'https://example.test/' }), null);
  });
});
