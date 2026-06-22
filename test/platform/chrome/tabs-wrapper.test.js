// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  addTabActivatedListener,
  addTabCreatedListener,
  addTabRemovedListener,
  addTabUpdatedListener,
  createTab,
  discardTab,
  getActiveCurrentWindowTab,
  getTab,
  moveTabToWindow,
  removeTabs,
  sendTabMessage,
  updateTab
} from '../../../src/platform/chrome/tabs.js';

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

  it('gets a tab by id', async () => {
    let requestedTabId = null;

    globalThis.chrome = {
      runtime: { lastError: null },
      tabs: {
        get(tabId, callback) {
          requestedTabId = tabId;
          callback({ id: tabId, mutedInfo: { muted: false } });
        }
      }
    };

    assert.deepEqual(await getTab(7), { id: 7, mutedInfo: { muted: false } });
    assert.equal(requestedTabId, 7);
  });

  it('resolves null on tab get runtime errors', async () => {
    globalThis.chrome = {
      runtime: { lastError: new Error('Tab unavailable.') },
      tabs: {
        get(_tabId, callback) {
          callback(undefined);
        }
      }
    };

    assert.equal(await getTab(7), null);
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

  it('resolves null when tab update support is unavailable', async () => {
    globalThis.chrome = {
      runtime: { lastError: null },
      tabs: {}
    };

    assert.equal(await updateTab(7, { url: 'https://example.test/' }), null);
  });

  it('removes, moves, and discards tabs through Chrome callbacks', async () => {
    const removedTabIds = [];
    const movedTabs = [];
    const discardedTabs = [];

    globalThis.chrome = {
      runtime: { lastError: null },
      tabs: {
        remove(tabIds, callback) {
          removedTabIds.push(...tabIds);
          callback();
        },
        move(tabId, moveProperties, callback) {
          movedTabs.push([tabId, moveProperties]);
          callback({ id: tabId, windowId: moveProperties.windowId });
        },
        discard(tabId, callback) {
          discardedTabs.push(tabId);
          callback({ id: tabId, discarded: true });
        }
      }
    };

    await removeTabs([4, 9]);
    assert.deepEqual(await moveTabToWindow(9, 12), { id: 9, windowId: 12 });
    assert.deepEqual(await discardTab(9), { id: 9, discarded: true });

    assert.deepEqual(removedTabIds, [4, 9]);
    assert.deepEqual(movedTabs, [[9, { windowId: 12, index: -1 }]]);
    assert.deepEqual(discardedTabs, [9]);
  });

  it('rejects tab remove, move, and discard runtime errors', async () => {
    const tabError = new Error('Tab operation failed.');

    globalThis.chrome = {
      runtime: { lastError: tabError },
      tabs: {
        remove(_tabIds, callback) {
          callback();
        },
        move(_tabId, _moveProperties, callback) {
          callback(null);
        },
        discard(_tabId, callback) {
          callback(null);
        }
      }
    };

    await assert.rejects(() => removeTabs([4]), tabError);
    await assert.rejects(() => moveTabToWindow(4, 12), tabError);
    await assert.rejects(() => discardTab(4), tabError);
  });

  it('adds and removes tab lifecycle listeners', () => {
    const activated = createEvent();
    const created = createEvent();
    const removed = createEvent();
    const updated = createEvent();

    globalThis.chrome = {
      tabs: {
        onActivated: activated.event,
        onCreated: created.event,
        onRemoved: removed.event,
        onUpdated: updated.event
      }
    };

    const onActivated = () => {};
    const onCreated = () => {};
    const onRemoved = () => {};
    const onUpdated = () => {};

    addTabActivatedListener(onActivated)();
    addTabCreatedListener(onCreated)();
    addTabRemovedListener(onRemoved)();
    addTabUpdatedListener(onUpdated)();

    assert.equal(activated.listener, onActivated);
    assert.equal(activated.removedListener, onActivated);
    assert.equal(created.listener, onCreated);
    assert.equal(created.removedListener, onCreated);
    assert.equal(removed.listener, onRemoved);
    assert.equal(removed.removedListener, onRemoved);
    assert.equal(updated.listener, onUpdated);
    assert.equal(updated.removedListener, onUpdated);
  });
});
