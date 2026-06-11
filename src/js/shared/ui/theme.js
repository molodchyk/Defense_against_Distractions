// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export const THEME_STORAGE_KEY = 'uiThemeMode';
export const THEME_MODES = ['system', 'dark', 'light'];
export const DEFAULT_THEME_MODE = 'system';

export function normalizeThemeMode(mode) {
  return THEME_MODES.includes(mode) ? mode : DEFAULT_THEME_MODE;
}

export function resolveThemeMode(mode, prefersDark) {
  const normalizedMode = normalizeThemeMode(mode);

  if (normalizedMode === 'system') {
    return prefersDark ? 'dark' : 'light';
  }

  return normalizedMode;
}
