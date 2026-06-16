// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { getSync } from '../../platform/chrome/storage.js';

export function getActiveTab() {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      resolve(tabs[0]);
    });
  });
}

export async function getSyncStorage(keys) {
  try {
    return await getSync(keys);
  } catch (error) {
    return null;
  }
}

export function isExtensionPage(url) {
  return Boolean(url && url.startsWith(chrome.runtime.getURL('')));
}

export function getOptionsPagePath(panelId = '') {
  const normalizedPanelId = String(panelId || '').trim().replace(/^#/, '');
  return normalizedPanelId ? `src/options.html#${normalizedPanelId}` : 'src/options.html';
}

export function openOptions() {
  chrome.runtime.openOptionsPage();
  window.close();
}

export function openOptionsPanel(panelId) {
  if (chrome.tabs?.create) {
    chrome.tabs.create({
      url: chrome.runtime.getURL(getOptionsPagePath(panelId))
    });
  } else {
    chrome.runtime.openOptionsPage();
  }
  window.close();
}

export function openIntentDiagnostics() {
  openOptionsPanel('intentDiagnosticsPanel');
}

export function openFeedback() {
  chrome.tabs.create({
    url: 'https://github.com/molodchyk/Defense_against_Distractions/issues'
  });
  window.close();
}

export function sendRuntimeMessage(message) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage(message, response => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }

      resolve(response);
    });
  });
}

export function sendTabMessage(tabId, message) {
  return new Promise(resolve => {
    chrome.tabs.sendMessage(tabId, message, { frameId: 0 }, response => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }

      resolve(response);
    });
  });
}

export function updateTabUrl(tabId, url) {
  return new Promise(resolve => {
    chrome.tabs.update(tabId, { url }, tab => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }

      resolve({
        status: 'updated',
        tab
      });
    });
  });
}
