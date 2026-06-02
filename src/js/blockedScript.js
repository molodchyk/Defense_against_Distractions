// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

document.getElementById('title').textContent = chrome.i18n.getMessage("contentBlockedTitle");
document.getElementById('message').textContent = chrome.i18n.getMessage("contentBlockedMessage");
document.getElementById('top').textContent = chrome.i18n.getMessage("contentBlockedTitle");

const THEME_STORAGE_KEY = 'uiThemeMode';
const DEFAULT_THEME_MODE = 'system';
const THEME_QUERY = '(prefers-color-scheme: dark)';
let currentThemeMode = DEFAULT_THEME_MODE;

function normalizeThemeMode(mode) {
    return ['system', 'dark', 'light'].includes(mode) ? mode : DEFAULT_THEME_MODE;
}

function applyThemeMode(mode) {
    const normalizedMode = normalizeThemeMode(mode);
    const prefersDark = window.matchMedia(THEME_QUERY).matches;
    const resolvedMode = prefersDark ? 'dark' : 'light';

    document.documentElement.dataset.theme = normalizedMode === 'system' ? resolvedMode : normalizedMode;
    document.documentElement.dataset.themeMode = normalizedMode;
}

chrome.storage.sync.get({ [THEME_STORAGE_KEY]: DEFAULT_THEME_MODE }, result => {
    currentThemeMode = normalizeThemeMode(result[THEME_STORAGE_KEY]);
    applyThemeMode(currentThemeMode);

    window.matchMedia(THEME_QUERY).addEventListener('change', () => {
        applyThemeMode(currentThemeMode);
    });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync' || !changes[THEME_STORAGE_KEY]) {
        return;
    }

    currentThemeMode = normalizeThemeMode(changes[THEME_STORAGE_KEY].newValue);
    applyThemeMode(currentThemeMode);
});
