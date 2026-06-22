// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import vm from 'node:vm';

const CONTENT_BRIDGE_PATH = 'src/platform/chrome/contentBridge.js';

function loadContentBridge(windowOverrides = {}) {
  const window = {
    DAD: {},
    ...windowOverrides
  };
  window.window = window;

  vm.createContext(window);
  vm.runInContext(readFileSync(CONTENT_BRIDGE_PATH, 'utf8'), window);
  return window;
}

describe('content-script Chrome platform bridge', () => {
  it('wraps runtime, i18n, and storage APIs for classic content scripts', () => {
    const runtimeListeners = [];
    const storageListeners = [];
    const sentMessages = [];
    const window = loadContentBridge({
      chrome: {
        i18n: {
          getMessage(key, substitutions) {
            return substitutions ? `${key}:${substitutions.join(',')}` : key;
          },
          getUILanguage() {
            return 'fa';
          }
        },
        runtime: {
          id: 'extension-id',
          lastError: null,
          getURL(path) {
            return `chrome-extension://abc/${path}`;
          },
          onMessage: {
            addListener(listener) {
              runtimeListeners.push(listener);
            }
          },
          sendMessage(message, callback) {
            sentMessages.push(message);
            callback({ ok: true });
          }
        },
        storage: {
          onChanged: {
            addListener(listener) {
              storageListeners.push(listener);
            }
          },
          local: {
            get(_keys, callback) {
              callback({ panel: 'open' });
            },
            set(_items, callback) {
              callback();
            }
          },
          sync: {
            QUOTA_BYTES: 1024,
            get(_keys, callback) {
              callback({ uiLanguage: 'fa' });
            },
            getBytesInUse(_keys, callback) {
              callback(256);
            },
            remove(_keys, callback) {
              callback();
            },
            set(_items, callback) {
              callback();
            }
          }
        }
      }
    });

    const platform = window.DAD.ChromePlatform;
    let runtimeResponse = null;
    let syncResult = null;
    let localResult = null;
    let bytesInUse = null;
    let didSetSync = null;

    assert.equal(platform.isExtensionContextAvailable(), true);
    assert.equal(platform.getExtensionUrl('src/options.html'), 'chrome-extension://abc/src/options.html');
    assert.equal(platform.getI18nMessage('blockedTitle', ['x']), 'blockedTitle:x');
    assert.equal(platform.getUiLanguage(), 'fa');
    assert.equal(platform.addRuntimeMessageListener(() => {}), true);
    assert.equal(platform.addStorageChangeListener(() => {}), true);
    assert.equal(platform.sendRuntimeMessage({ action: 'ping' }, response => { runtimeResponse = response; }), true);
    assert.equal(platform.getSync({ uiLanguage: 'system' }, result => { syncResult = result; }), true);
    assert.equal(platform.getLocal({ panel: null }, result => { localResult = result; }), true);
    assert.equal(platform.getBytesInUseSync(null, result => { bytesInUse = result; }), true);
    assert.equal(platform.setSync({ uiLanguage: 'fa' }, result => { didSetSync = result; }), true);

    assert.deepEqual(sentMessages, [{ action: 'ping' }]);
    assert.deepEqual(runtimeResponse, { ok: true });
    assert.deepEqual(syncResult, { uiLanguage: 'fa' });
    assert.deepEqual(localResult, { panel: 'open' });
    assert.equal(bytesInUse, 256);
    assert.equal(didSetSync, true);
    assert.equal(platform.getSyncQuotaBytes(64), 1024);
    assert.equal(runtimeListeners.length, 1);
    assert.equal(storageListeners.length, 1);
  });

  it('fails closed when the extension context is unavailable', () => {
    const window = loadContentBridge({ chrome: { runtime: {} } });
    const platform = window.DAD.ChromePlatform;
    let runtimeResponse = 'not-called';
    let syncResult = 'not-called';

    assert.equal(platform.isExtensionContextAvailable(), false);
    assert.equal(platform.sendRuntimeMessage({ action: 'ping' }, response => { runtimeResponse = response; }), false);
    assert.equal(platform.getSync({ uiLanguage: 'system' }, result => { syncResult = result; }), false);
    assert.equal(platform.addRuntimeMessageListener(() => {}), false);
    assert.equal(platform.addStorageChangeListener(() => {}), false);
    assert.equal(platform.getExtensionUrl('src/options.html'), 'src/options.html');
    assert.equal(platform.getSyncQuotaBytes(64), 64);
    assert.equal(runtimeResponse, null);
    assert.equal(syncResult, null);
  });
});
