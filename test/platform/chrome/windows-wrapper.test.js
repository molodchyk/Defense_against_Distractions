// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  addWindowFocusChangedListener,
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

  it('returns a no-op unsubscriber when focus events are unavailable', () => {
    globalThis.chrome = {};

    assert.doesNotThrow(() => addWindowFocusChangedListener(() => {})());
  });
});
