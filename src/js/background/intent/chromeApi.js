// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export function getSync(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(keys, result => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve(result);
    });
  });
}

export function getLocal(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, result => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve(result);
    });
  });
}

export function setLocal(items) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve();
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
