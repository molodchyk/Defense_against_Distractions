// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { initializeDefaultSettings } from './background/defaults.js';
import { initializeReleaseBackupNoticeEligibility } from './background/releaseNotice.js';
import { initializeScheduleMonitor } from './background/scheduleMonitor.js';

const extensionMutedTabs = new Map();

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/options.html') });
});

function muteBlockedTab(tabId) {
  chrome.tabs.get(tabId, tab => {
    if (chrome.runtime.lastError || !tab) {
      return;
    }

    extensionMutedTabs.set(tabId, Boolean(tab.mutedInfo?.muted));
    chrome.tabs.update(tabId, { muted: true });
  });
}

function restoreTabMuteState(tabId) {
  if (!extensionMutedTabs.has(tabId)) {
    return;
  }

  const wasMuted = extensionMutedTabs.get(tabId);
  extensionMutedTabs.delete(tabId);
  chrome.tabs.update(tabId, { muted: wasMuted });
}

chrome.runtime.onMessage.addListener((message, sender) => {
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
      muteBlockedTab(tabId);
    }
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
    restoreTabMuteState(tabId);
  }
});

chrome.tabs.onRemoved.addListener(tabId => {
  extensionMutedTabs.delete(tabId);
});

initializeDefaultSettings();
initializeReleaseBackupNoticeEligibility();
initializeScheduleMonitor();

