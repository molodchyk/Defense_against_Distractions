// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createContentBlockingBackgroundRuntime } from '../../../src/features/content-blocking/background/runtime.js';

function createFakeChrome() {
  const badgeUpdates = [];
  const sentTabMessages = [];

  return {
    action: {
      setBadgeText(payload) {
        badgeUpdates.push(payload);
      }
    },
    runtime: {
      lastError: null
    },
    tabs: {
      sendMessage(tabId, message, options, callback) {
        sentTabMessages.push({ tabId, message, options });
        callback?.();
      }
    },
    badgeUpdates,
    sentTabMessages
  };
}

function createTabMuteController() {
  const calls = [];

  return {
    calls,
    forgetBlockedTabMuteState(tabId) {
      calls.push(['forget', tabId]);
    },
    getBlockedTabMuteDebugState(tabId) {
      calls.push(['debug', tabId]);
      return { tracked: false, tabId };
    },
    muteBlockedTab(tabId) {
      calls.push(['mute', tabId]);
    },
    restoreBlockedTabMuteState(tabId) {
      calls.push(['restore', tabId]);
    }
  };
}

describe('content-blocking background runtime', () => {
  it('updates the extension badge for sender tabs', () => {
    const chromeApi = createFakeChrome();
    const runtime = createContentBlockingBackgroundRuntime(chromeApi, {
      tabMuteController: createTabMuteController()
    });

    runtime.handleRuntimeMessage({ action: 'updateBadge', score: 42 }, { tab: { id: 9 } }, () => {});

    assert.deepEqual(chromeApi.badgeUpdates, [
      { text: '42', tabId: 9 }
    ]);
  });

  it('routes blocked tab mute messages through the mute controller', () => {
    const chromeApi = createFakeChrome();
    const tabMuteController = createTabMuteController();
    const runtime = createContentBlockingBackgroundRuntime(chromeApi, { tabMuteController });
    const responses = [];

    runtime.handleRuntimeMessage({ action: 'muteBlockedTab' }, { tab: { id: 9 } }, () => {});
    runtime.handleRuntimeMessage({ action: 'restoreBlockedTabMute' }, { tab: { id: 9 } }, () => {});
    runtime.handleRuntimeMessage({ action: 'getBlockedTabMuteDebugState' }, { tab: { id: 9 } }, response => {
      responses.push(response);
    });

    assert.deepEqual(tabMuteController.calls, [
      ['mute', 9],
      ['restore', 9],
      ['debug', 9]
    ]);
    assert.deepEqual(responses, [
      { tracked: false, tabId: 9 }
    ]);
  });

  it('requests top-frame blocking with bounded diagnostics', () => {
    const chromeApi = createFakeChrome();
    const runtime = createContentBlockingBackgroundRuntime(chromeApi, {
      tabMuteController: createTabMuteController()
    });

    runtime.handleRuntimeMessage({
      action: 'blockTopFrame',
      diagnostics: { trigger: 'keyword' }
    }, { tab: { id: 9 } }, () => {});

    assert.deepEqual(chromeApi.sentTabMessages, [
      {
        tabId: 9,
        message: {
          action: 'forceBlockPage',
          diagnostics: { trigger: 'keyword' }
        },
        options: { frameId: 0 }
      }
    ]);
  });

  it('restores mute state only when a tab starts loading', () => {
    const chromeApi = createFakeChrome();
    const tabMuteController = createTabMuteController();
    const runtime = createContentBlockingBackgroundRuntime(chromeApi, { tabMuteController });

    runtime.handleTabUpdated(9, { status: 'complete' });
    runtime.handleTabUpdated(9, { status: 'loading' });

    assert.deepEqual(tabMuteController.calls, [
      ['restore', 9]
    ]);
  });

  it('forgets mute state when a tab is removed', () => {
    const chromeApi = createFakeChrome();
    const tabMuteController = createTabMuteController();
    const runtime = createContentBlockingBackgroundRuntime(chromeApi, { tabMuteController });

    runtime.handleTabRemoved(9);

    assert.deepEqual(tabMuteController.calls, [
      ['forget', 9]
    ]);
  });

  it('ignores malformed runtime messages', () => {
    const chromeApi = createFakeChrome();
    const tabMuteController = createTabMuteController();
    const runtime = createContentBlockingBackgroundRuntime(chromeApi, { tabMuteController });

    runtime.handleRuntimeMessage(null, { tab: { id: 9 } }, () => {});

    assert.deepEqual(chromeApi.badgeUpdates, []);
    assert.deepEqual(chromeApi.sentTabMessages, []);
    assert.deepEqual(tabMuteController.calls, []);
  });
});
