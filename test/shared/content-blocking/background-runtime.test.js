// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createContentBlockingBackgroundRuntime } from '../../../src/features/content-blocking/background/runtime.js';

function createFakeRuntimeDependencies() {
  const badgeUpdates = [];
  const sentTabMessages = [];

  return {
    setBadgeText(payload) {
      badgeUpdates.push(payload);
    },
    async sendTabMessage(tabId, message, options) {
      sentTabMessages.push({ tabId, message, options });
      return { status: 'sent' };
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
    const dependencies = createFakeRuntimeDependencies();
    const runtime = createContentBlockingBackgroundRuntime({
      ...dependencies,
      tabMuteController: createTabMuteController()
    });

    runtime.handleRuntimeMessage({ action: 'updateBadge', score: 42 }, { tab: { id: 9 } }, () => {});

    assert.deepEqual(dependencies.badgeUpdates, [
      { text: '42', tabId: 9 }
    ]);
  });

  it('routes blocked tab mute messages through the mute controller', () => {
    const dependencies = createFakeRuntimeDependencies();
    const tabMuteController = createTabMuteController();
    const runtime = createContentBlockingBackgroundRuntime({ ...dependencies, tabMuteController });
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

  it('requests top-frame blocking with bounded diagnostics', async () => {
    const dependencies = createFakeRuntimeDependencies();
    const runtime = createContentBlockingBackgroundRuntime({
      ...dependencies,
      tabMuteController: createTabMuteController()
    });

    runtime.handleRuntimeMessage({
      action: 'blockTopFrame',
      diagnostics: { trigger: 'keyword' }
    }, { tab: { id: 9 } }, () => {});

    await Promise.resolve();

    assert.deepEqual(dependencies.sentTabMessages, [
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
    const dependencies = createFakeRuntimeDependencies();
    const tabMuteController = createTabMuteController();
    const runtime = createContentBlockingBackgroundRuntime({ ...dependencies, tabMuteController });

    runtime.handleTabUpdated(9, { status: 'complete' });
    runtime.handleTabUpdated(9, { status: 'loading' });

    assert.deepEqual(tabMuteController.calls, [
      ['restore', 9]
    ]);
  });

  it('forgets mute state when a tab is removed', () => {
    const dependencies = createFakeRuntimeDependencies();
    const tabMuteController = createTabMuteController();
    const runtime = createContentBlockingBackgroundRuntime({ ...dependencies, tabMuteController });

    runtime.handleTabRemoved(9);

    assert.deepEqual(tabMuteController.calls, [
      ['forget', 9]
    ]);
  });

  it('ignores malformed runtime messages', () => {
    const dependencies = createFakeRuntimeDependencies();
    const tabMuteController = createTabMuteController();
    const runtime = createContentBlockingBackgroundRuntime({ ...dependencies, tabMuteController });

    runtime.handleRuntimeMessage(null, { tab: { id: 9 } }, () => {});

    assert.deepEqual(dependencies.badgeUpdates, []);
    assert.deepEqual(dependencies.sentTabMessages, []);
    assert.deepEqual(tabMuteController.calls, []);
  });
});
