// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  DEFAULT_THEME_MODE,
  THEME_STORAGE_KEY,
  normalizeThemeMode,
  resolveThemeMode
} from '../shared/theme.js';

export function createPopupShell() {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  let activePane = 'actions';

  function setPane(paneName) {
    const nextPane = paneName === 'diagnostics' ? 'diagnostics' : 'actions';
    activePane = nextPane;

    document.querySelectorAll('[data-popup-tab]').forEach(button => {
      const isActive = button.dataset.popupTab === nextPane;
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    document.querySelectorAll('[data-popup-pane]').forEach(pane => {
      pane.hidden = pane.dataset.popupPane !== nextPane;
    });
  }

  function initializeTabs() {
    document.querySelectorAll('[data-popup-tab]').forEach(button => {
      button.addEventListener('click', () => {
        setPane(button.dataset.popupTab);
      });
    });

    setPane(activePane);
  }

  function applyTheme(mode) {
    document.documentElement.dataset.theme = resolveThemeMode(mode, mediaQuery.matches);
  }

  function loadTheme() {
    chrome.storage.sync.get({ [THEME_STORAGE_KEY]: DEFAULT_THEME_MODE }, result => {
      applyTheme(normalizeThemeMode(result[THEME_STORAGE_KEY]));
    });
  }

  function initializeThemeListener() {
    mediaQuery.addEventListener('change', () => {
      loadTheme();
    });
  }

  function handleStorageChange(changes, areaName) {
    if (areaName === 'sync' && changes[THEME_STORAGE_KEY]) {
      applyTheme(normalizeThemeMode(changes[THEME_STORAGE_KEY].newValue));
    }
  }

  return {
    handleStorageChange,
    initializeTabs,
    initializeThemeListener,
    loadTheme
  };
}
