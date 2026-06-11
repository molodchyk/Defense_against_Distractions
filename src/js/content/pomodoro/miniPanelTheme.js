// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};

  const THEME_STORAGE_KEY = 'uiThemeMode';
  const DEFAULT_THEME_MODE = 'system';
  const THEME_QUERY = '(prefers-color-scheme: dark)';
  const PANEL_ID = global.DAD.PomodoroMiniPanelStyle?.PANEL_ID || 'dad-pomodoro-mini-panel';

  let panelThemeMode = DEFAULT_THEME_MODE;
  let listenersInstalled = false;

  function normalizeThemeMode(mode) {
    return ['system', 'dark', 'light'].includes(mode) ? mode : DEFAULT_THEME_MODE;
  }

  function resolveThemeMode(mode) {
    const normalizedMode = normalizeThemeMode(mode);
    if (normalizedMode === DEFAULT_THEME_MODE) {
      return global.matchMedia(THEME_QUERY).matches ? 'dark' : 'light';
    }

    return normalizedMode;
  }

  function apply(panel = document.getElementById(PANEL_ID)) {
    if (!panel) {
      return;
    }

    panel.dataset.theme = resolveThemeMode(panelThemeMode);
    panel.dataset.themeMode = normalizeThemeMode(panelThemeMode);
  }

  function install() {
    if (listenersInstalled) {
      return;
    }

    global.DAD.safeSyncStorageGet({ [THEME_STORAGE_KEY]: DEFAULT_THEME_MODE }, result => {
      if (!result) {
        return;
      }

      panelThemeMode = normalizeThemeMode(result[THEME_STORAGE_KEY]);
      apply();
    });

    global.DAD.safeStorageOnChangedAddListener((changes, areaName) => {
      if (areaName !== 'sync' || !changes[THEME_STORAGE_KEY]) {
        return;
      }

      panelThemeMode = normalizeThemeMode(changes[THEME_STORAGE_KEY].newValue);
      apply();
    });

    const mediaQuery = global.matchMedia(THEME_QUERY);
    mediaQuery.addEventListener('change', () => {
      if (panelThemeMode === DEFAULT_THEME_MODE) {
        apply();
      }
    });

    listenersInstalled = true;
  }

  global.DAD.PomodoroMiniPanelTheme = {
    apply,
    install,
    normalizeThemeMode,
    resolveThemeMode
  };
})(window);
