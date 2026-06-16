// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

const THEME_STORAGE_KEY = 'uiThemeMode';
const DEFAULT_THEME_MODE = 'system';
const THEME_QUERY = '(prefers-color-scheme: dark)';

export function initBlockedPageTheme({
  safeSyncStorageGet,
  safeStorageOnChangedAddListener
}) {
  let currentThemeMode = DEFAULT_THEME_MODE;

  function normalizeThemeMode(mode) {
    return ['system', 'dark', 'light'].includes(mode) ? mode : DEFAULT_THEME_MODE;
  }

  function applyThemeMode(mode) {
    const normalizedMode = normalizeThemeMode(mode);
    const prefersDark = globalThis.matchMedia(THEME_QUERY).matches;
    const resolvedMode = prefersDark ? 'dark' : 'light';

    document.documentElement.dataset.theme = normalizedMode === 'system' ? resolvedMode : normalizedMode;
    document.documentElement.dataset.themeMode = normalizedMode;
  }

  safeSyncStorageGet({ [THEME_STORAGE_KEY]: DEFAULT_THEME_MODE }, result => {
    if (!result) {
      applyThemeMode(DEFAULT_THEME_MODE);
      return;
    }

    currentThemeMode = normalizeThemeMode(result[THEME_STORAGE_KEY]);
    applyThemeMode(currentThemeMode);
  });

  globalThis.matchMedia(THEME_QUERY).addEventListener('change', () => {
    applyThemeMode(currentThemeMode);
  });

  safeStorageOnChangedAddListener((changes, areaName) => {
    if (areaName !== 'sync' || !changes[THEME_STORAGE_KEY]) {
      return;
    }

    currentThemeMode = normalizeThemeMode(changes[THEME_STORAGE_KEY].newValue);
    applyThemeMode(currentThemeMode);
  });
}
