// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const contentBlocking = global.DAD.ContentBlocking = global.DAD.ContentBlocking || {};
  const {
    BLOCK_OVERLAY_ID
  } = contentBlocking.constants;

  const THEME_STORAGE_KEY = 'uiThemeMode';
  const DEFAULT_THEME_MODE = 'system';
  const THEME_QUERY = '(prefers-color-scheme: dark)';

  let blockedOverlayThemeMode = DEFAULT_THEME_MODE;
  let blockedOverlayThemeListenersInstalled = false;

  function normalizeThemeMode(mode) {
    return ['system', 'dark', 'light'].includes(mode) ? mode : DEFAULT_THEME_MODE;
  }

  function resolveThemeMode(mode) {
    const normalizedMode = normalizeThemeMode(mode);
    if (normalizedMode === 'system') {
      return global.matchMedia(THEME_QUERY).matches ? 'dark' : 'light';
    }

    return normalizedMode;
  }

  function apply(overlay, mode = blockedOverlayThemeMode) {
    if (!overlay) {
      return;
    }

    overlay.dataset.theme = resolveThemeMode(mode);
    overlay.dataset.themeMode = normalizeThemeMode(mode);
  }

  function applyToExisting() {
    apply(document.getElementById(BLOCK_OVERLAY_ID));
  }

  function install() {
    if (blockedOverlayThemeListenersInstalled) {
      return;
    }

    global.DAD.safeSyncStorageGet({ [THEME_STORAGE_KEY]: DEFAULT_THEME_MODE }, result => {
      if (!result) {
        return;
      }

      blockedOverlayThemeMode = normalizeThemeMode(result[THEME_STORAGE_KEY]);
      applyToExisting();
    });

    global.DAD.safeStorageOnChangedAddListener((changes, areaName) => {
      if (areaName !== 'sync' || !changes[THEME_STORAGE_KEY]) {
        return;
      }

      blockedOverlayThemeMode = normalizeThemeMode(changes[THEME_STORAGE_KEY].newValue);
      applyToExisting();
    });

    global.matchMedia(THEME_QUERY).addEventListener('change', () => {
      if (blockedOverlayThemeMode === DEFAULT_THEME_MODE) {
        applyToExisting();
      }
    });

    blockedOverlayThemeListenersInstalled = true;
  }

  contentBlocking.overlayTheme = {
    apply,
    applyToExisting,
    install,
    normalizeThemeMode,
    resolveThemeMode
  };
})(window);
