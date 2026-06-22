// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { getTab as getChromeTab, updateTab as updateChromeTab } from '../../../platform/chrome/tabs.js';

export function createBlockedTabMuteController({
  getTab = getChromeTab,
  updateTab = updateChromeTab
} = {}, { now = () => new Date() } = {}) {
  const extensionMutedTabs = new Map();
  const extensionMutedTabEvents = new Map();

  function getTimestamp() {
    return now().toISOString();
  }

  async function muteBlockedTab(tabId) {
    if (tabId === undefined) {
      return;
    }

    const tab = await getTab(tabId);
    if (!tab) {
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
    await updateTab(tabId, { muted: true });
  }

  async function restoreBlockedTabMuteState(tabId) {
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
    await updateTab(tabId, { muted: wasMuted });
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
