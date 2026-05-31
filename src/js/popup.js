// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  DEFAULT_THEME_MODE,
  THEME_STORAGE_KEY,
  normalizeThemeMode,
  resolveThemeMode
} from './shared/theme.js';

const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

function setStatus(message) {
  document.getElementById('statusText').textContent = message;
}

function getActiveTab() {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      resolve(tabs[0]);
    });
  });
}

function applyTheme(mode) {
  document.documentElement.dataset.theme = resolveThemeMode(mode, mediaQuery.matches);
}

function loadTheme() {
  chrome.storage.sync.get({ [THEME_STORAGE_KEY]: DEFAULT_THEME_MODE }, result => {
    applyTheme(normalizeThemeMode(result[THEME_STORAGE_KEY]));
  });
}

function isExtensionPage(url) {
  return Boolean(url && url.startsWith(chrome.runtime.getURL('')));
}

async function redirectExtensionTabsToOptions() {
  const activeTab = await getActiveTab();

  if (isExtensionPage(activeTab?.url)) {
    chrome.runtime.openOptionsPage();
    window.close();
    return true;
  }

  return false;
}

async function startElementPicker() {
  const strategy = document.getElementById('matchStrategySelect').value;
  const minScore = Number.parseInt(document.getElementById('minimumScoreInput').value, 10);
  const ancestorDepth = Number.parseInt(document.getElementById('ancestorDepthInput').value, 10);
  const labelMatch = document.getElementById('labelMatchSelect').value;
  const activeTab = await getActiveTab();

  if (!activeTab?.id) {
    setStatus('Open a page before picking an element.');
    return;
  }

  chrome.tabs.sendMessage(activeTab.id, {
    action: 'startElementPicker',
    strategy,
    minScore,
    ancestorDepth,
    labelMatch
  }, response => {
    if (chrome.runtime.lastError) {
      setStatus('Reload this page, then try picking again.');
      return;
    }

    setStatus(response?.status || 'Element picker started.');
    window.close();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  redirectExtensionTabsToOptions();

  mediaQuery.addEventListener('change', () => {
    chrome.storage.sync.get({ [THEME_STORAGE_KEY]: DEFAULT_THEME_MODE }, result => {
      applyTheme(normalizeThemeMode(result[THEME_STORAGE_KEY]));
    });
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes[THEME_STORAGE_KEY]) {
      applyTheme(normalizeThemeMode(changes[THEME_STORAGE_KEY].newValue));
    }
  });

  document.getElementById('pickElementButton').addEventListener('click', startElementPicker);
  document.getElementById('openOptionsButton').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
});
