// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  addContextMenuClickedListener,
  canUseContextMenus,
  createContextMenu,
  removeAllContextMenus
} from '../../../../src/platform/chrome/contextMenus.js';

describe('Chrome contextMenus platform wrapper', () => {
  const originalChrome = globalThis.chrome;

  afterEach(() => {
    globalThis.chrome = originalChrome;
  });

  it('reports whether context menus are available', () => {
    globalThis.chrome = {
      contextMenus: {
        create() {},
        onClicked: {}
      }
    };

    assert.equal(canUseContextMenus(), true);

    globalThis.chrome = {};
    assert.equal(canUseContextMenus(), false);
  });

  it('creates and removes context menus with lastError handling', async () => {
    let createDetails = null;
    let removedAll = false;

    globalThis.chrome = {
      runtime: {},
      contextMenus: {
        create(details, callback) {
          createDetails = details;
          callback();
          return details.id;
        },
        removeAll(callback) {
          removedAll = true;
          callback();
        }
      }
    };

    assert.equal(await createContextMenu({ id: 'menu-1', contexts: ['selection'] }), 'menu-1');
    assert.deepEqual(createDetails, { id: 'menu-1', contexts: ['selection'] });
    await removeAllContextMenus();
    assert.equal(removedAll, true);
  });

  it('rejects context menu operations when Chrome reports lastError', async () => {
    const createError = new Error('create failed');
    const removeError = new Error('remove failed');

    globalThis.chrome = {
      runtime: {
        lastError: createError
      },
      contextMenus: {
        create(_details, callback) {
          callback();
          return 'menu-1';
        },
        removeAll(callback) {
          globalThis.chrome.runtime.lastError = removeError;
          callback();
        }
      }
    };

    await assert.rejects(() => createContextMenu({ id: 'menu-1' }), createError);
    await assert.rejects(() => removeAllContextMenus(), removeError);
  });

  it('adds and removes clicked listeners', () => {
    let listener = null;
    let removedListener = null;

    globalThis.chrome = {
      contextMenus: {
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
    addContextMenuClickedListener(onClicked)();

    assert.equal(listener, onClicked);
    assert.equal(removedListener, onClicked);
  });
});
