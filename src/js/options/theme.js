// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { getSync, setSync } from '../shared/storage/chromeStorage.js';
import {
  DEFAULT_THEME_MODE,
  THEME_STORAGE_KEY,
  normalizeThemeMode,
  resolveThemeMode
} from '../shared/ui/theme.js';

const THEME_QUERY = '(prefers-color-scheme: dark)';

let themePreference;

function getSystemThemePreference() {
  return window.matchMedia(THEME_QUERY);
}

function applyThemeMode(mode) {
  const resolvedThemeMode = resolveThemeMode(mode, getSystemThemePreference().matches);
  document.documentElement.dataset.theme = resolvedThemeMode;
  document.documentElement.dataset.themeMode = normalizeThemeMode(mode);
}

async function loadThemeMode() {
  const result = await getSync({ [THEME_STORAGE_KEY]: DEFAULT_THEME_MODE });
  return normalizeThemeMode(result[THEME_STORAGE_KEY]);
}

export async function initializeThemeModeControl() {
  const themeModeSelect = document.getElementById('themeModeSelect');
  if (!themeModeSelect) {
    return;
  }

  let storedThemeMode = DEFAULT_THEME_MODE;
  try {
    storedThemeMode = await loadThemeMode();
  } catch (error) {
    console.error('Failed to load UI theme mode:', error);
  }
  themeModeSelect.value = storedThemeMode;
  applyThemeMode(storedThemeMode);

  themeModeSelect.addEventListener('change', async () => {
    const nextThemeMode = normalizeThemeMode(themeModeSelect.value);
    themeModeSelect.value = nextThemeMode;
    applyThemeMode(nextThemeMode);

    try {
      await setSync({ [THEME_STORAGE_KEY]: nextThemeMode });
    } catch (error) {
      console.error('Failed to save UI theme mode:', error);
    }
  });

  themePreference = getSystemThemePreference();
  themePreference.addEventListener('change', () => {
    applyThemeMode(themeModeSelect.value);
  });
}
