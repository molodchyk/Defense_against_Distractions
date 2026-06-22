// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  addInstalledListener,
  addRuntimeMessageListener,
  addStartupListener,
  getExtensionUrl,
  getManifest,
  isExtensionContextAvailable,
  openOptionsPage
} from '../../../src/platform/chrome/runtime.js';

function createEvent() {
  let listener = null;
  let removedListener = null;

  return {
    event: {
      addListener(callback) {
        listener = callback;
      },
      removeListener(callback) {
        removedListener = callback;
      }
    },
    get listener() {
      return listener;
    },
    get removedListener() {
      return removedListener;
    }
  };
}

describe('Chrome runtime platform wrapper', () => {
  const originalChrome = globalThis.chrome;

  afterEach(() => {
    globalThis.chrome = originalChrome;
  });

  it('wraps runtime URL, manifest, and options-page helpers', () => {
    let openedOptions = false;

    globalThis.chrome = {
      runtime: {
        getURL(path) {
          return `chrome-extension://abc/${path}`;
        },
        getManifest() {
          return { version: '1.6.1' };
        },
        openOptionsPage() {
          openedOptions = true;
        }
      }
    };

    assert.equal(getExtensionUrl('src/options.html'), 'chrome-extension://abc/src/options.html');
    assert.deepEqual(getManifest(), { version: '1.6.1' });
    openOptionsPage();
    assert.equal(openedOptions, true);
  });

  it('reports whether the extension runtime context is available', () => {
    globalThis.chrome = { runtime: { id: 'extension-id' } };
    assert.equal(isExtensionContextAvailable(), true);

    globalThis.chrome = { runtime: {} };
    assert.equal(isExtensionContextAvailable(), false);
  });

  it('falls back to the original path when runtime URL access is unavailable', () => {
    globalThis.chrome = {};

    assert.equal(getExtensionUrl('_locales/de/messages.json'), '_locales/de/messages.json');
  });

  it('adds and removes installed, startup, and message listeners', () => {
    const installed = createEvent();
    const startup = createEvent();
    const message = createEvent();

    globalThis.chrome = {
      runtime: {
        onInstalled: installed.event,
        onStartup: startup.event,
        onMessage: message.event
      }
    };

    const onInstalled = () => {};
    const onStartup = () => {};
    const onMessage = () => {};

    addInstalledListener(onInstalled)();
    addStartupListener(onStartup)();
    addRuntimeMessageListener(onMessage)();

    assert.equal(installed.listener, onInstalled);
    assert.equal(installed.removedListener, onInstalled);
    assert.equal(startup.listener, onStartup);
    assert.equal(startup.removedListener, onStartup);
    assert.equal(message.listener, onMessage);
    assert.equal(message.removedListener, onMessage);
  });
});
