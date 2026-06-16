// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { initializeDefaultSettings } from './background/defaults.js';
import { initializeIntentCoherence } from './background/intentCoherence.js';
import { initializePomodoroRuntime } from './background/pomodoro.js';
import { initializeReleaseBackupNoticeEligibility } from './background/releaseNotice.js';
import { initializeScheduleMonitor } from './background/scheduleMonitor.js';
import { createBlockedTabMuteController } from '../features/content-blocking/background/tabMute.js';

const blockedTabMuteController = createBlockedTabMuteController(chrome);

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/options.html') });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateBadge') {
    const tabId = sender.tab?.id;
    if (tabId === undefined) {
      return;
    }

    chrome.action.setBadgeText({ text: String(message.score), tabId });
  }

  if (message.action === 'muteBlockedTab') {
    const tabId = sender.tab?.id;
    if (tabId !== undefined) {
      blockedTabMuteController.muteBlockedTab(tabId);
    }
  }

  if (message.action === 'restoreBlockedTabMute') {
    const tabId = sender.tab?.id;
    if (tabId !== undefined) {
      blockedTabMuteController.restoreBlockedTabMuteState(tabId);
    }
  }

  if (message.action === 'getBlockedTabMuteDebugState') {
    sendResponse(blockedTabMuteController.getBlockedTabMuteDebugState(sender.tab?.id));
  }

  if (message.action === 'blockTopFrame') {
    const tabId = sender.tab?.id;
    if (tabId === undefined) {
      return;
    }

    chrome.tabs.sendMessage(tabId, {
      action: 'forceBlockPage',
      diagnostics: message.diagnostics || null
    }, { frameId: 0 }, () => {
      if (chrome.runtime.lastError) {
        console.error('Failed to request top-frame block:', chrome.runtime.lastError);
      }
    });
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    blockedTabMuteController.restoreBlockedTabMuteState(tabId);
  }
});

chrome.tabs.onRemoved.addListener(tabId => {
  blockedTabMuteController.forgetBlockedTabMuteState(tabId);
});

initializeDefaultSettings();
initializeIntentCoherence();
initializePomodoroRuntime();
initializeReleaseBackupNoticeEligibility();
initializeScheduleMonitor();

