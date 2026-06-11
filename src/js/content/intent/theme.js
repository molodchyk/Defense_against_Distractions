// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const intent = global.DAD.IntentIntervention = global.DAD.IntentIntervention || {};
  const {
    PROMPT_ID,
    THEME_STORAGE_KEY,
    DEFAULT_THEME_MODE,
    THEME_QUERY
  } = intent.constants;

  let currentThemeMode = DEFAULT_THEME_MODE;
  let themeListenersInstalled = false;

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

  function applyPromptTheme(prompt) {
    prompt.dataset.theme = resolveThemeMode(currentThemeMode);
    prompt.dataset.themeMode = normalizeThemeMode(currentThemeMode);
  }

  function applyPromptThemeToExisting() {
    const prompt = global.document.getElementById(PROMPT_ID);
    if (prompt) {
      applyPromptTheme(prompt);
    }
  }

  function installThemeSync() {
    if (themeListenersInstalled || !global.DAD.safeSyncStorageGet) {
      return;
    }

    global.DAD.safeSyncStorageGet({ [THEME_STORAGE_KEY]: DEFAULT_THEME_MODE }, result => {
      if (!result) {
        return;
      }

      currentThemeMode = normalizeThemeMode(result[THEME_STORAGE_KEY]);
      applyPromptThemeToExisting();
    });

    if (global.DAD.safeStorageOnChangedAddListener) {
      global.DAD.safeStorageOnChangedAddListener((changes, areaName) => {
        if (areaName !== 'sync' || !changes[THEME_STORAGE_KEY]) {
          return;
        }

        currentThemeMode = normalizeThemeMode(changes[THEME_STORAGE_KEY].newValue);
        applyPromptThemeToExisting();
      });
    }

    const mediaQuery = global.matchMedia(THEME_QUERY);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', () => {
        if (currentThemeMode === 'system') {
          applyPromptThemeToExisting();
        }
      });
    }

    themeListenersInstalled = true;
  }

  intent.theme = {
    applyPromptTheme,
    installThemeSync
  };
})(window);
