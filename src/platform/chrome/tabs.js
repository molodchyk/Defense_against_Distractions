// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export function canCreateTab() {
  return Boolean(chrome.tabs?.create);
}

export function queryTabs(queryInfo) {
  return new Promise((resolve, reject) => {
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

export function updateTab(tabId, updateProperties) {
  return new Promise(resolve => {
    chrome.tabs.update(tabId, updateProperties, tab => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }

      resolve(tab || null);
    });
  });
}
