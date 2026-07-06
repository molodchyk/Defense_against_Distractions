// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CONSUME_PENDING_SELECTED_TEXT_QUICK_ADD_ACTION,
  PENDING_SELECTED_TEXT_QUICK_ADD_KEY,
  PENDING_SELECTED_TEXT_QUICK_ADD_MAX_AGE_MS,
  SELECTED_TEXT_QUICK_ADD_MENU_ID,
  createSelectedTextQuickAddBackgroundRuntime
} from '../../../src/js/background/selectedTextQuickAdd.js';

function createRuntimeHarness(options = {}) {
  const storage = {};
  let popupOptions = null;

  const runtime = createSelectedTextQuickAddBackgroundRuntime({
    getLocalStorage: async key => ({ [key]: storage[key] }),
    now: () => options.now ?? 1000,
    openPopup: async options => {
      popupOptions = options;
      return true;
    },
    removeLocalStorage: async key => {
      delete storage[key];
    },
    setLocalStorage: async items => {
      Object.assign(storage, items);
    }
  });

  return {
    runtime,
    storage,
    get popupOptions() {
      return popupOptions;
    }
  };
}

describe('selected text quick-add background runtime', () => {
  it('registers one selection-only context menu item', async () => {
    let createdMenu = null;
    let clickedListener = null;
    let removedAll = false;
    let removedListener = false;

    const runtime = createSelectedTextQuickAddBackgroundRuntime({
      addClickedListener(listener) {
        clickedListener = listener;
        return () => {
          removedListener = true;
        };
      },
      canUseMenus: () => true,
      createMenu: async details => {
        createdMenu = details;
      },
      getMenuTitle: () => 'Add "%s" to DaD',
      removeAllMenus: async () => {
        removedAll = true;
      }
    });

    const cleanup = runtime.initialize();
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(removedAll, true);
    assert.deepEqual(createdMenu, {
      id: SELECTED_TEXT_QUICK_ADD_MENU_ID,
      title: 'Add "%s" to DaD',
      contexts: ['selection']
    });
    assert.equal(typeof clickedListener, 'function');

    cleanup();
    assert.equal(removedListener, true);
  });

  it('stores a bounded pending candidate and opens the popup after the menu click', async () => {
    const harness = createRuntimeHarness();
    const { runtime, storage } = harness;
    const url = 'https://mail.google.com/mail/u/0/#inbox';

    assert.equal(await runtime.handleContextMenuClicked({
      menuItemId: SELECTED_TEXT_QUICK_ADD_MENU_ID,
      pageUrl: url,
      selectionText: '  Rama Aurora thread  '
    }, {
      id: 7,
      url,
      windowId: 3
    }), true);

    const pending = storage[PENDING_SELECTED_TEXT_QUICK_ADD_KEY];
    assert.equal(pending.tabId, 7);
    assert.equal(pending.url, url);
    assert.equal(pending.candidate.text, 'Rama Aurora thread');
    assert.equal(pending.candidate.host, 'mail.google.com');
    assert.equal(pending.candidate.source, 'contextMenuSelection');
    assert.deepEqual(harness.popupOptions, { windowId: 3 });
  });

  it('ignores unrelated menu clicks and invalid selected text', async () => {
    const { runtime, storage } = createRuntimeHarness();

    assert.equal(await runtime.handleContextMenuClicked({
      menuItemId: 'other-menu',
      selectionText: 'Rama Aurora'
    }, { id: 7 }), false);
    assert.equal(storage[PENDING_SELECTED_TEXT_QUICK_ADD_KEY], undefined);

    assert.equal(await runtime.handleContextMenuClicked({
      menuItemId: SELECTED_TEXT_QUICK_ADD_MENU_ID,
      selectionText: ' ... / -- '
    }, { id: 7 }), false);
    assert.equal(storage[PENDING_SELECTED_TEXT_QUICK_ADD_KEY], undefined);
  });

  it('consumes a matching pending candidate once', async () => {
    const { runtime, storage } = createRuntimeHarness();
    const url = 'https://example.com/page';

    await runtime.handleContextMenuClicked({
      menuItemId: SELECTED_TEXT_QUICK_ADD_MENU_ID,
      pageUrl: url,
      selectionText: 'target phrase'
    }, {
      id: 11,
      url
    });

    const response = await runtime.consumePendingCandidate({
      tabId: 11,
      url
    });

    assert.deepEqual(response, {
      candidate: {
        text: 'target phrase',
        estimatedScore100: 28,
        insideEditable: false
      },
      source: 'contextMenuSelection',
      tab: {
        id: 11,
        url
      }
    });
    assert.equal(storage[PENDING_SELECTED_TEXT_QUICK_ADD_KEY], undefined);
  });

  it('keeps mismatched pending candidates and removes expired ones', async () => {
    const { runtime, storage } = createRuntimeHarness();

    storage[PENDING_SELECTED_TEXT_QUICK_ADD_KEY] = {
      candidate: {
        text: 'target phrase',
        estimatedScore100: 28
      },
      createdAt: 1000,
      tabId: 4,
      url: 'https://example.com/page'
    };

    assert.deepEqual(await runtime.consumePendingCandidate({ tabId: 5, url: 'https://example.com/other' }), {
      candidate: null
    });
    assert.ok(storage[PENDING_SELECTED_TEXT_QUICK_ADD_KEY]);

    const expiredHarness = createRuntimeHarness({
      now: 1000 + PENDING_SELECTED_TEXT_QUICK_ADD_MAX_AGE_MS + 1
    });
    expiredHarness.storage[PENDING_SELECTED_TEXT_QUICK_ADD_KEY] = {
      candidate: {
        text: 'target phrase',
        estimatedScore100: 28
      },
      createdAt: 1000,
      tabId: 4,
      url: 'https://example.com/page'
    };

    assert.deepEqual(await expiredHarness.runtime.consumePendingCandidate({ tabId: 4, url: 'https://example.com/page' }), {
      candidate: null
    });
    assert.equal(expiredHarness.storage[PENDING_SELECTED_TEXT_QUICK_ADD_KEY], undefined);
  });

  it('answers the popup consume runtime message asynchronously', async () => {
    const { runtime } = createRuntimeHarness();
    const url = 'https://example.com/page';
    let sentResponse = null;

    await runtime.handleContextMenuClicked({
      menuItemId: SELECTED_TEXT_QUICK_ADD_MENU_ID,
      pageUrl: url,
      selectionText: 'target phrase'
    }, {
      id: 12,
      url
    });

    const keepChannelOpen = runtime.handleRuntimeMessage({
      action: CONSUME_PENDING_SELECTED_TEXT_QUICK_ADD_ACTION,
      tabId: 12,
      url
    }, {}, response => {
      sentResponse = response;
    });
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.equal(keepChannelOpen, true);
    assert.equal(sentResponse.candidate.text, 'target phrase');
    assert.equal(runtime.handleRuntimeMessage({ action: 'other' }), false);
  });
});
