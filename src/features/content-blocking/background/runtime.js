// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { createBlockedTabMuteController } from './tabMute.js';

export function createContentBlockingBackgroundRuntime(chromeApi, {
  logger = console,
  tabMuteController = createBlockedTabMuteController(chromeApi)
} = {}) {
  function updateBadge(message, sender) {
    const tabId = sender.tab?.id;
    if (tabId === undefined) {
      return;
    }

    chromeApi.action.setBadgeText({ text: String(message.score), tabId });
  }

  function requestTopFrameBlock(message, sender) {
    const tabId = sender.tab?.id;
    if (tabId === undefined) {
      return;
    }

    chromeApi.tabs.sendMessage(tabId, {
      action: 'forceBlockPage',
      diagnostics: message.diagnostics || null
    }, { frameId: 0 }, () => {
      if (chromeApi.runtime.lastError) {
        logger.error('Failed to request top-frame block:', chromeApi.runtime.lastError);
      }
    });
  }

  function handleRuntimeMessage(message, sender, sendResponse) {
    if (!message || typeof message !== 'object') {
      return;
    }

    if (message.action === 'updateBadge') {
      updateBadge(message, sender);
    }

    if (message.action === 'muteBlockedTab') {
      const tabId = sender.tab?.id;
      if (tabId !== undefined) {
        tabMuteController.muteBlockedTab(tabId);
      }
    }

    if (message.action === 'restoreBlockedTabMute') {
      const tabId = sender.tab?.id;
      if (tabId !== undefined) {
        tabMuteController.restoreBlockedTabMuteState(tabId);
      }
    }

    if (message.action === 'getBlockedTabMuteDebugState') {
      sendResponse(tabMuteController.getBlockedTabMuteDebugState(sender.tab?.id));
    }

    if (message.action === 'blockTopFrame') {
      requestTopFrameBlock(message, sender);
    }
  }

  function handleTabUpdated(tabId, changeInfo) {
    if (changeInfo.status === 'loading') {
      tabMuteController.restoreBlockedTabMuteState(tabId);
    }
  }

  function handleTabRemoved(tabId) {
    tabMuteController.forgetBlockedTabMuteState(tabId);
  }

  return {
    handleRuntimeMessage,
    handleTabRemoved,
    handleTabUpdated
  };
}
