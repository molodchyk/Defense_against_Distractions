// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { getLocal, getSync, setLocal } from '../../../platform/chrome/storage.js';
import {
  canCreateTab,
  canDiscardTab,
  canMoveTab,
  canQueryTabs,
  canRemoveTabs,
  createTab,
  discardTab as discardChromeTab,
  moveTabToWindow as moveChromeTabToWindow,
  queryTabs,
  removeTabs as removeChromeTabs,
  updateTab as updateChromeTab
} from '../../../platform/chrome/tabs.js';
import { getExtensionUrl, openOptionsPage } from '../../../platform/chrome/runtime.js';
import { canCreateWindow, createWindow as createChromeWindow } from '../../../platform/chrome/windows.js';

export { getLocal, getSync, setLocal };

export async function openIntentDiagnosticsPage() {
  const url = getExtensionUrl('src/options.html#intentDiagnosticsPanel');
  if (!canCreateTab()) {
    openOptionsPage();
    return { status: 'opened', url };
  }

  const tab = await createTab({ url });
  if (!tab) {
    throw new Error('Intent diagnostics page could not be opened.');
  }

  return {
    status: 'opened',
    tabId: tab.id ?? null,
    url
  };
}

export async function getTabPressure() {
  if (!canQueryTabs()) {
    return {};
  }

  try {
    const tabs = await queryTabs({});

    return {
      tabCount: tabs.length,
      windowCount: new Set(tabs
        .map(tab => Number(tab.windowId))
        .filter(Number.isFinite)).size
    };
  } catch {
    return {};
  }
}

export async function getOpenTabIds() {
  if (!canQueryTabs()) {
    return null;
  }

  try {
    const tabs = await queryTabs({});
    return new Set(tabs.map(tab => Number(tab.id)).filter(Number.isFinite));
  } catch {
    return null;
  }
}

export function removeTabs(tabIds = []) {
  const normalizedTabIds = [...new Set(tabIds.map(Number).filter(Number.isFinite))];
  if (normalizedTabIds.length === 0 || !canRemoveTabs()) {
    return Promise.resolve();
  }

  return removeChromeTabs(normalizedTabIds);
}

export async function moveTabsToNewWindow(tabIds = []) {
  const normalizedTabIds = [...new Set(tabIds.map(Number).filter(Number.isFinite))];
  if (normalizedTabIds.length === 0) {
    return {
      movedTabIds: [],
      failedTabIds: [],
      windowId: null
    };
  }

  if (!canCreateWindow() || !canMoveTab()) {
    return {
      movedTabIds: [],
      failedTabIds: normalizedTabIds,
      windowId: null
    };
  }

  try {
    const createdWindow = await createChromeWindow({ tabId: normalizedTabIds[0], focused: false });
    const windowId = Number(createdWindow.id);
    const movedTabIds = [normalizedTabIds[0]];
    const failedTabIds = [];

    for (const tabId of normalizedTabIds.slice(1)) {
      try {
        await moveChromeTabToWindow(tabId, windowId);
        movedTabIds.push(tabId);
      } catch (error) {
        failedTabIds.push(tabId);
      }
    }

    return {
      movedTabIds,
      failedTabIds,
      windowId
    };
  } catch (error) {
    return {
      movedTabIds: [],
      failedTabIds: normalizedTabIds,
      windowId: null
    };
  }
}

export async function discardTabs(tabIds = []) {
  const normalizedTabIds = [...new Set(tabIds.map(Number).filter(Number.isFinite))];
  if (normalizedTabIds.length === 0 || !canDiscardTab()) {
    return {
      discardedTabIds: [],
      failedTabIds: normalizedTabIds
    };
  }

  const discardedTabIds = [];
  const failedTabIds = [];

  for (const tabId of normalizedTabIds) {
    try {
      await discardChromeTab(tabId);
      discardedTabIds.push(tabId);
    } catch (error) {
      failedTabIds.push(tabId);
    }
  }

  return {
    discardedTabIds,
    failedTabIds
  };
}

export async function updateTabsUrl(tabIds = [], url = '') {
  const normalizedTabIds = [...new Set(tabIds.map(Number).filter(Number.isFinite))];
  const normalizedUrl = String(url || '').trim();
  if (
    normalizedTabIds.length === 0
      || !isSafeTabUpdateUrl(normalizedUrl)
  ) {
    return {
      updatedTabIds: [],
      failedTabIds: normalizedTabIds
    };
  }

  const updatedTabIds = [];
  const failedTabIds = [];

  for (const tabId of normalizedTabIds) {
    try {
      const tab = await updateChromeTab(tabId, { url: normalizedUrl });
      if (!tab) {
        throw new Error('Tab could not be updated.');
      }
      updatedTabIds.push(tabId);
    } catch (error) {
      failedTabIds.push(tabId);
    }
  }

  return {
    updatedTabIds,
    failedTabIds
  };
}

function isSafeTabUpdateUrl(url) {
  try {
    return ['http:', 'https:'].includes(new URL(url).protocol);
  } catch (error) {
    return false;
  }
}
