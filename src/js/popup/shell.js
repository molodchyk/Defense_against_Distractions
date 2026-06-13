// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  DEFAULT_THEME_MODE,
  THEME_STORAGE_KEY,
  normalizeThemeMode,
  resolveThemeMode
} from '../shared/ui/theme.js';

export const POPUP_PANE_NAMES = Object.freeze(['actions', 'diagnostics']);
export const POPUP_PANE_STORAGE_KEY = 'popupActivePane';

export function normalizePopupPane(paneName) {
  return paneName === 'diagnostics' ? 'diagnostics' : 'actions';
}

export function normalizeStoredPopupPane(paneName) {
  return POPUP_PANE_NAMES.includes(paneName) ? paneName : POPUP_PANE_NAMES[0];
}

export function getPopupPaneForKey(currentPane, key, paneNames = POPUP_PANE_NAMES) {
  const availablePanes = Array.isArray(paneNames) && paneNames.length > 0
    ? paneNames.map(normalizePopupPane).filter((paneName, index, panes) => panes.indexOf(paneName) === index)
    : POPUP_PANE_NAMES;
  const currentIndex = Math.max(0, availablePanes.indexOf(normalizePopupPane(currentPane)));

  if (key === 'Home') {
    return availablePanes[0];
  }

  if (key === 'End') {
    return availablePanes[availablePanes.length - 1];
  }

  if (key === 'ArrowRight' || key === 'ArrowDown') {
    return availablePanes[(currentIndex + 1) % availablePanes.length];
  }

  if (key === 'ArrowLeft' || key === 'ArrowUp') {
    return availablePanes[(currentIndex - 1 + availablePanes.length) % availablePanes.length];
  }

  return null;
}

export function createPopupShell() {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  let activePane = POPUP_PANE_NAMES[0];
  let userSelectedPane = false;

  function persistPane(paneName) {
    chrome.storage.local.set({ [POPUP_PANE_STORAGE_KEY]: normalizeStoredPopupPane(paneName) }, () => {
      if (chrome.runtime.lastError) {
        console.warn('Failed to persist popup pane:', chrome.runtime.lastError);
      }
    });
  }

  function setPane(paneName, options = {}) {
    const nextPane = normalizePopupPane(paneName);
    activePane = nextPane;

    document.querySelectorAll('[data-popup-tab]').forEach(button => {
      const isActive = normalizePopupPane(button.dataset.popupTab) === nextPane;
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');
      button.tabIndex = isActive ? 0 : -1;
      button.removeAttribute('aria-pressed');
    });

    document.querySelectorAll('[data-popup-pane]').forEach(pane => {
      pane.hidden = normalizePopupPane(pane.dataset.popupPane) !== nextPane;
    });

    if (options.persist !== false) {
      persistPane(nextPane);
    }
  }

  function focusPaneTab(paneName) {
    const tab = Array.from(document.querySelectorAll('[data-popup-tab]'))
      .find(button => normalizePopupPane(button.dataset.popupTab) === paneName);
    tab?.focus();
  }

  function selectPaneFromUser(paneName) {
    userSelectedPane = true;
    setPane(paneName);
  }

  function initializeTabs() {
    const tabs = Array.from(document.querySelectorAll('[data-popup-tab]'));
    const paneNames = tabs.map(button => normalizePopupPane(button.dataset.popupTab));

    tabs.forEach(button => {
      button.addEventListener('click', () => {
        selectPaneFromUser(button.dataset.popupTab);
      });
      button.addEventListener('keydown', event => {
        const nextPane = getPopupPaneForKey(activePane, event.key, paneNames);
        if (!nextPane) {
          return;
        }

        event.preventDefault();
        selectPaneFromUser(nextPane);
        focusPaneTab(nextPane);
      });
    });

    chrome.storage.local.get({ [POPUP_PANE_STORAGE_KEY]: POPUP_PANE_NAMES[0] }, result => {
      if (userSelectedPane) {
        return;
      }

      setPane(normalizeStoredPopupPane(result?.[POPUP_PANE_STORAGE_KEY]), { persist: false });
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

  function initializeThemeListener() {
    mediaQuery.addEventListener('change', () => {
      loadTheme();
    });
  }

  function handleStorageChange(changes, areaName) {
    if (areaName === 'sync' && changes[THEME_STORAGE_KEY]) {
      applyTheme(normalizeThemeMode(changes[THEME_STORAGE_KEY].newValue));
    }

    if (areaName === 'local' && changes[POPUP_PANE_STORAGE_KEY]) {
      setPane(normalizeStoredPopupPane(changes[POPUP_PANE_STORAGE_KEY].newValue), { persist: false });
    }
  }

  return {
    handleStorageChange,
    initializeTabs,
    initializeThemeListener,
    loadTheme
  };
}
