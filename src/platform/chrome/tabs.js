// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export function canCreateTab() {
  return Boolean(chrome.tabs?.create);
}

export function canQueryTabs() {
  return Boolean(chrome.tabs?.query);
}

export function canRemoveTabs() {
  return Boolean(chrome.tabs?.remove);
}

export function canDiscardTab() {
  return Boolean(chrome.tabs?.discard);
}

export function canMoveTab() {
  return Boolean(chrome.tabs?.move);
}

export function canUpdateTab() {
  return Boolean(chrome.tabs?.update);
}

export function addTabActivatedListener(listener) {
  chrome.tabs.onActivated.addListener(listener);
  return () => chrome.tabs.onActivated.removeListener(listener);
}

export function addTabCreatedListener(listener) {
  chrome.tabs.onCreated.addListener(listener);
  return () => chrome.tabs.onCreated.removeListener(listener);
}

export function addTabRemovedListener(listener) {
  chrome.tabs.onRemoved.addListener(listener);
  return () => chrome.tabs.onRemoved.removeListener(listener);
}

export function addTabUpdatedListener(listener) {
  chrome.tabs.onUpdated.addListener(listener);
  return () => chrome.tabs.onUpdated.removeListener(listener);
}

export function queryTabs(queryInfo) {
  return new Promise((resolve, reject) => {
    if (!canQueryTabs()) {
      reject(new Error('chrome.tabs.query is unavailable.'));
      return;
    }

    chrome.tabs.query(queryInfo, tabs => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve(Array.isArray(tabs) ? tabs : []);
    });
  });
}

export async function getActiveCurrentWindowTab() {
  const tabs = await queryTabs({ active: true, currentWindow: true });
  return tabs[0] || null;
}

export function createTab(createProperties) {
  return new Promise((resolve, reject) => {
    if (!canCreateTab()) {
      reject(new Error('chrome.tabs.create is unavailable.'));
      return;
    }

    chrome.tabs.create(createProperties, tab => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve(tab || null);
    });
  });
}

export function sendTabMessage(tabId, message, options) {
  return new Promise(resolve => {
    const callback = response => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }

      resolve(response);
    };

    if (options) {
      chrome.tabs.sendMessage(tabId, message, options, callback);
      return;
    }

    chrome.tabs.sendMessage(tabId, message, callback);
  });
}

export function removeTabs(tabIds) {
  return new Promise((resolve, reject) => {
    if (!canRemoveTabs()) {
      reject(new Error('chrome.tabs.remove is unavailable.'));
      return;
    }

    chrome.tabs.remove(tabIds, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve();
    });
  });
}

export function moveTabToWindow(tabId, windowId) {
  return new Promise((resolve, reject) => {
    if (!canMoveTab()) {
      reject(new Error('chrome.tabs.move is unavailable.'));
      return;
    }

    chrome.tabs.move(tabId, { windowId, index: -1 }, tab => {
      if (chrome.runtime.lastError || !tab) {
        reject(chrome.runtime.lastError || new Error('Tab could not be moved.'));
        return;
      }

      resolve(tab);
    });
  });
}

export function discardTab(tabId) {
  return new Promise((resolve, reject) => {
    if (!canDiscardTab()) {
      reject(new Error('chrome.tabs.discard is unavailable.'));
      return;
    }

    chrome.tabs.discard(tabId, tab => {
      if (chrome.runtime.lastError || !tab) {
        reject(chrome.runtime.lastError || new Error('Tab could not be discarded.'));
        return;
      }

      resolve(tab);
    });
  });
}

export function updateTab(tabId, updateProperties) {
  return new Promise(resolve => {
    if (!canUpdateTab()) {
      resolve(null);
      return;
    }

    chrome.tabs.update(tabId, updateProperties, tab => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }

      resolve(tab || null);
    });
  });
}
