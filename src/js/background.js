// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { initializeDefaultSettings } from './background/defaults.js';
import { initializeIntentCoherence } from './background/intentCoherence.js';
import { initializePomodoroRuntime } from './background/pomodoro.js';
import { initializeReleaseBackupNoticeEligibility } from './background/releaseNotice.js';
import { initializeScheduleMonitor } from './background/scheduleMonitor.js';

const extensionMutedTabs = new Map();
const extensionMutedTabEvents = new Map();

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/options.html') });
});

function muteBlockedTab(tabId) {
  chrome.tabs.get(tabId, tab => {
    if (chrome.runtime.lastError || !tab) {
      return;
    }

    const originalMuted = extensionMutedTabs.has(tabId)
      ? extensionMutedTabs.get(tabId)
      : Boolean(tab.mutedInfo?.muted);

    extensionMutedTabs.set(tabId, originalMuted);
    extensionMutedTabEvents.set(tabId, {
      originalMuted,
      mutedAt: new Date().toISOString(),
      restoredAt: extensionMutedTabEvents.get(tabId)?.restoredAt || null,
      lastAction: 'muted'
    });
    chrome.tabs.update(tabId, { muted: true });
  });
}

function restoreTabMuteState(tabId) {
  if (!extensionMutedTabs.has(tabId)) {
    extensionMutedTabEvents.set(tabId, {
      ...(extensionMutedTabEvents.get(tabId) || {}),
      restoredAt: new Date().toISOString(),
      lastAction: 'restoreSkipped'
    });
    return;
  }

  const wasMuted = extensionMutedTabs.get(tabId);
  extensionMutedTabs.delete(tabId);
  extensionMutedTabEvents.set(tabId, {
    ...(extensionMutedTabEvents.get(tabId) || {}),
    restoredAt: new Date().toISOString(),
    restoredMutedState: wasMuted,
    lastAction: 'restored'
  });
  chrome.tabs.update(tabId, { muted: wasMuted });
}

function getBlockedTabMuteDebugState(tabId) {
  if (tabId === undefined) {
    return {
      tracked: false,
      tabId: null,
      reason: 'No sender tab.'
    };
  }

  const eventState = extensionMutedTabEvents.get(tabId) || {};
  return {
    tracked: extensionMutedTabs.has(tabId),
    tabId,
    originalMuted: extensionMutedTabs.has(tabId) ? extensionMutedTabs.get(tabId) : eventState.originalMuted ?? null,
    ...eventState
  };
}

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
      muteBlockedTab(tabId);
    }
  }

  if (message.action === 'restoreBlockedTabMute') {
    const tabId = sender.tab?.id;
    if (tabId !== undefined) {
      restoreTabMuteState(tabId);
    }
  }

  if (message.action === 'getBlockedTabMuteDebugState') {
    sendResponse(getBlockedTabMuteDebugState(sender.tab?.id));
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
  extensionMutedTabEvents.delete(tabId);
});

initializeDefaultSettings();
initializeIntentCoherence();
initializePomodoroRuntime();
initializeReleaseBackupNoticeEligibility();
initializeScheduleMonitor();

