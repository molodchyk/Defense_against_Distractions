// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  isExtensionContextAvailable,
  safeRuntimeSendMessage,
  safeStorageOnChangedAddListener,
  safeSyncStorageGet
} from '../../../../src/features/content-blocking/blocked-page/chromeApi.js';

function waitForCallback(start) {
  return new Promise(resolve => {
    const started = start(resolve);
    assert.equal(started, true);
  });
}

describe('blocked-page Chrome API facade', () => {
  const originalChrome = globalThis.chrome;

  afterEach(() => {
    globalThis.chrome = originalChrome;
  });

  it('routes storage, runtime messages, and storage listeners through Chrome wrappers', async () => {
    let storageKeys = null;
    let runtimeMessage = null;
    let storageListener = null;

    globalThis.chrome = {
      runtime: {
        id: 'extension-id',
        lastError: null,
        sendMessage(message, callback) {
          runtimeMessage = message;
          callback({ status: 'ok' });
        }
      },
      storage: {
        sync: {
          get(keys, callback) {
            storageKeys = keys;
            callback({ uiLanguage: 'fa' });
          }
        },
        onChanged: {
          addListener(listener) {
            storageListener = listener;
          },
          removeListener() {}
        }
      }
    };

    assert.equal(isExtensionContextAvailable(), true);
    assert.deepEqual(
      await waitForCallback(resolve => safeSyncStorageGet({ uiLanguage: 'system' }, resolve)),
      { uiLanguage: 'fa' }
    );
    assert.deepEqual(
      await waitForCallback(resolve => safeRuntimeSendMessage({ action: 'getPomodoroState' }, resolve)),
      { status: 'ok' }
    );
    assert.equal(safeStorageOnChangedAddListener(() => {}), true);

    assert.deepEqual(storageKeys, { uiLanguage: 'system' });
    assert.deepEqual(runtimeMessage, { action: 'getPomodoroState' });
    assert.equal(typeof storageListener, 'function');
  });

  it('fails closed when the extension runtime context is unavailable', async () => {
    globalThis.chrome = { runtime: {} };

    assert.equal(isExtensionContextAvailable(), false);
    assert.equal(
      await new Promise(resolve => {
        const started = safeSyncStorageGet({ uiLanguage: 'system' }, resolve);
        assert.equal(started, false);
      }),
      null
    );
    assert.equal(
      await new Promise(resolve => {
        const started = safeRuntimeSendMessage({ action: 'getPomodoroState' }, resolve);
        assert.equal(started, false);
      }),
      null
    );
    assert.equal(safeStorageOnChangedAddListener(() => {}), false);
  });

  it('passes null to callbacks when platform wrappers report Chrome runtime errors', async () => {
    globalThis.chrome = {
      runtime: {
        id: 'extension-id',
        lastError: new Error('Chrome unavailable.'),
        sendMessage(_message, callback) {
          callback(undefined);
        }
      },
      storage: {
        sync: {
          get(_keys, callback) {
            callback(undefined);
          }
        },
        onChanged: {
          addListener() {
            throw new Error('Listener failed.');
          },
          removeListener() {}
        }
      }
    };

    assert.equal(
      await waitForCallback(resolve => safeSyncStorageGet({ uiLanguage: 'system' }, resolve)),
      null
    );
    assert.equal(
      await waitForCallback(resolve => safeRuntimeSendMessage({ action: 'getPomodoroState' }, resolve)),
      null
    );
    assert.equal(safeStorageOnChangedAddListener(() => {}), false);
  });
});
