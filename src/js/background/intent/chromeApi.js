// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { getLocal, getSync, setLocal } from '../../../platform/chrome/storage.js';

export { getLocal, getSync, setLocal };

export function openIntentDiagnosticsPage() {
  const url = chrome.runtime.getURL('src/options.html#intentDiagnosticsPanel');
  if (!chrome.tabs?.create) {
    chrome.runtime.openOptionsPage();
    return Promise.resolve({ status: 'opened', url });
  }

  return new Promise((resolve, reject) => {
    chrome.tabs.create({ url }, tab => {
      if (chrome.runtime.lastError || !tab) {
        reject(chrome.runtime.lastError || new Error('Intent diagnostics page could not be opened.'));
        return;
      }

      resolve({
        status: 'opened',
        tabId: tab.id ?? null,
        url
      });
    });
  });
}

export function getTabPressure() {
  return new Promise(resolve => {
    if (!chrome.tabs?.query) {
      resolve({});
      return;
    }

    chrome.tabs.query({}, tabs => {
      if (chrome.runtime.lastError || !Array.isArray(tabs)) {
        resolve({});
        return;
      }

      resolve({
        tabCount: tabs.length,
        windowCount: new Set(tabs
          .map(tab => Number(tab.windowId))
          .filter(Number.isFinite)).size
      });
    });
  });
}

export function getOpenTabIds() {
  return new Promise(resolve => {
    if (!chrome.tabs?.query) {
      resolve(null);
      return;
    }

    chrome.tabs.query({}, tabs => {
      if (chrome.runtime.lastError || !Array.isArray(tabs)) {
        resolve(null);
        return;
      }

      resolve(new Set(tabs.map(tab => Number(tab.id)).filter(Number.isFinite)));
    });
  });
}

export function removeTabs(tabIds = []) {
  const normalizedTabIds = [...new Set(tabIds.map(Number).filter(Number.isFinite))];
  if (normalizedTabIds.length === 0 || !chrome.tabs?.remove) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    chrome.tabs.remove(normalizedTabIds, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve();
    });
  });
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

  if (!chrome.windows?.create || !chrome.tabs?.move) {
    return {
      movedTabIds: [],
      failedTabIds: normalizedTabIds,
      windowId: null
    };
  }

  try {
    const createdWindow = await createWindowWithTab(normalizedTabIds[0]);
    const windowId = Number(createdWindow.id);
    const movedTabIds = [normalizedTabIds[0]];
    const failedTabIds = [];

    for (const tabId of normalizedTabIds.slice(1)) {
      try {
        await moveTabToWindow(tabId, windowId);
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
  if (normalizedTabIds.length === 0 || !chrome.tabs?.discard) {
    return {
      discardedTabIds: [],
      failedTabIds: normalizedTabIds
    };
  }

  const discardedTabIds = [];
  const failedTabIds = [];

  for (const tabId of normalizedTabIds) {
    try {
      await discardTab(tabId);
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
      || !chrome.tabs?.update
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
      await updateTabUrl(tabId, normalizedUrl);
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

function createWindowWithTab(tabId) {
  return new Promise((resolve, reject) => {
    chrome.windows.create({ tabId, focused: false }, createdWindow => {
      if (chrome.runtime.lastError || !Number.isFinite(Number(createdWindow?.id))) {
        reject(chrome.runtime.lastError || new Error('Window could not be created.'));
        return;
      }

      resolve(createdWindow);
    });
  });
}

function moveTabToWindow(tabId, windowId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.move(tabId, { windowId, index: -1 }, tab => {
      if (chrome.runtime.lastError || !tab) {
        reject(chrome.runtime.lastError || new Error('Tab could not be moved.'));
        return;
      }

      resolve(tab);
    });
  });
}

function discardTab(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.discard(tabId, tab => {
      if (chrome.runtime.lastError || !tab) {
        reject(chrome.runtime.lastError || new Error('Tab could not be discarded.'));
        return;
      }

      resolve(tab);
    });
  });
}

function updateTabUrl(tabId, url) {
  return new Promise((resolve, reject) => {
    chrome.tabs.update(tabId, { url }, tab => {
      if (chrome.runtime.lastError || !tab) {
        reject(chrome.runtime.lastError || new Error('Tab could not be updated.'));
        return;
      }

      resolve(tab);
    });
  });
}

function isSafeTabUpdateUrl(url) {
  try {
    return ['http:', 'https:'].includes(new URL(url).protocol);
  } catch (error) {
    return false;
  }
}
