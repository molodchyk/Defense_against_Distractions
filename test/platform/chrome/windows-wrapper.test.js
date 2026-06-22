// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  addWindowFocusChangedListener,
  createWindow,
  getNoFocusedWindowId
} from '../../../src/platform/chrome/windows.js';

describe('Chrome windows platform wrapper', () => {
  const originalChrome = globalThis.chrome;

  afterEach(() => {
    globalThis.chrome = originalChrome;
  });

  it('returns the Chrome no-focused-window id', () => {
    globalThis.chrome = {
      windows: {
        WINDOW_ID_NONE: -1
      }
    };

    assert.equal(getNoFocusedWindowId(), -1);
  });

  it('adds and removes window focus listeners', () => {
    let listener = null;
    let removedListener = null;

    globalThis.chrome = {
      windows: {
        onFocusChanged: {
          addListener(callback) {
            listener = callback;
          },
          removeListener(callback) {
            removedListener = callback;
          }
        }
      }
    };

    const onFocusChanged = () => {};
    addWindowFocusChangedListener(onFocusChanged)();

    assert.equal(listener, onFocusChanged);
    assert.equal(removedListener, onFocusChanged);
  });

  it('creates windows with requested data', async () => {
    let requestedCreateData = null;

    globalThis.chrome = {
      runtime: { lastError: null },
      windows: {
        create(createData, callback) {
          requestedCreateData = createData;
          callback({ id: 12, focused: false });
        }
      }
    };

    const createdWindow = await createWindow({ tabId: 4, focused: false });

    assert.deepEqual(requestedCreateData, { tabId: 4, focused: false });
    assert.deepEqual(createdWindow, { id: 12, focused: false });
  });

  it('rejects window creation failures from Chrome runtime errors', async () => {
    const windowError = new Error('Window could not be created.');

    globalThis.chrome = {
      runtime: { lastError: windowError },
      windows: {
        create(_createData, callback) {
          callback(null);
        }
      }
    };

    await assert.rejects(() => createWindow({ tabId: 4, focused: false }), windowError);
  });

  it('returns a no-op unsubscriber when focus events are unavailable', () => {
    globalThis.chrome = {};

    assert.doesNotThrow(() => addWindowFocusChangedListener(() => {})());
  });
});
