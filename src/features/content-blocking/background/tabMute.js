// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export function createBlockedTabMuteController(chromeApi, { now = () => new Date() } = {}) {
  const extensionMutedTabs = new Map();
  const extensionMutedTabEvents = new Map();

  function getTimestamp() {
    return now().toISOString();
  }

  function muteBlockedTab(tabId) {
    if (tabId === undefined) {
      return;
    }

    chromeApi.tabs.get(tabId, tab => {
      if (chromeApi.runtime.lastError || !tab) {
        return;
      }

      const originalMuted = extensionMutedTabs.has(tabId)
        ? extensionMutedTabs.get(tabId)
        : Boolean(tab.mutedInfo?.muted);

      extensionMutedTabs.set(tabId, originalMuted);
      extensionMutedTabEvents.set(tabId, {
        originalMuted,
        mutedAt: getTimestamp(),
        restoredAt: extensionMutedTabEvents.get(tabId)?.restoredAt || null,
        lastAction: 'muted'
      });
      chromeApi.tabs.update(tabId, { muted: true });
    });
  }

  function restoreBlockedTabMuteState(tabId) {
    if (tabId === undefined) {
      return;
    }

    if (!extensionMutedTabs.has(tabId)) {
      extensionMutedTabEvents.set(tabId, {
        ...(extensionMutedTabEvents.get(tabId) || {}),
        restoredAt: getTimestamp(),
        lastAction: 'restoreSkipped'
      });
      return;
    }

    const wasMuted = extensionMutedTabs.get(tabId);
    extensionMutedTabs.delete(tabId);
    extensionMutedTabEvents.set(tabId, {
      ...(extensionMutedTabEvents.get(tabId) || {}),
      restoredAt: getTimestamp(),
      restoredMutedState: wasMuted,
      lastAction: 'restored'
    });
    chromeApi.tabs.update(tabId, { muted: wasMuted });
  }

  function forgetBlockedTabMuteState(tabId) {
    extensionMutedTabs.delete(tabId);
    extensionMutedTabEvents.delete(tabId);
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

  return {
    forgetBlockedTabMuteState,
    getBlockedTabMuteDebugState,
    muteBlockedTab,
    restoreBlockedTabMuteState
  };
}
