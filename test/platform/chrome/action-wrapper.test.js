// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { addActionClickedListener, setBadgeText } from '../../../src/platform/chrome/action.js';

describe('Chrome action platform wrapper', () => {
  const originalChrome = globalThis.chrome;

  afterEach(() => {
    globalThis.chrome = originalChrome;
  });

  it('adds and removes action click listeners', () => {
    let listener = null;
    let removedListener = null;

    globalThis.chrome = {
      action: {
        onClicked: {
          addListener(callback) {
            listener = callback;
          },
          removeListener(callback) {
            removedListener = callback;
          }
        }
      }
    };

    const onClicked = () => {};
    addActionClickedListener(onClicked)();

    assert.equal(listener, onClicked);
    assert.equal(removedListener, onClicked);
  });

  it('sets badge text and reports whether the call succeeded', () => {
    let badgeDetails = null;

    globalThis.chrome = {
      action: {
        setBadgeText(details) {
          badgeDetails = details;
        }
      }
    };

    assert.equal(setBadgeText({ text: '42', tabId: 9 }), true);
    assert.deepEqual(badgeDetails, { text: '42', tabId: 9 });
  });

  it('reports badge update failures without throwing', () => {
    globalThis.chrome = {
      action: {
        setBadgeText() {
          throw new Error('Badge unavailable.');
        }
      }
    };

    assert.equal(setBadgeText({ text: '42', tabId: 9 }), false);
  });
});
