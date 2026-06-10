// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

function isExtensionContextAvailable() {
    try {
        return Boolean(chrome?.runtime?.id);
    } catch (error) {
        return false;
    }
}

function safeSyncStorageGet(keys, callback) {
    try {
        if (!isExtensionContextAvailable() || !chrome?.storage?.sync?.get) {
            callback(null);
            return false;
        }

        chrome.storage.sync.get(keys, result => {
            let hasLastError = false;
            try {
                hasLastError = Boolean(chrome?.runtime?.lastError);
            } catch (error) {
                hasLastError = true;
            }

            callback(hasLastError ? null : result);
        });
        return true;
    } catch (error) {
        callback(null);
        return false;
    }
}

function safeRuntimeSendMessage(message, callback) {
    try {
        if (!isExtensionContextAvailable() || !chrome?.runtime?.sendMessage) {
            callback(null);
            return false;
        }

        chrome.runtime.sendMessage(message, response => {
            let hasLastError = false;
            try {
                hasLastError = Boolean(chrome?.runtime?.lastError);
            } catch (error) {
                hasLastError = true;
            }

            callback(hasLastError ? null : response);
        });
        return true;
    } catch (error) {
        callback(null);
        return false;
    }
}

function safeStorageOnChangedAddListener(listener) {
    try {
        if (!isExtensionContextAvailable() || !chrome?.storage?.onChanged?.addListener) {
            return false;
        }

        chrome.storage.onChanged.addListener(listener);
        return true;
    } catch (error) {
        return false;
    }
}

const THEME_STORAGE_KEY = 'uiThemeMode';
const UI_LANGUAGE_STORAGE_KEY = 'uiLanguage';
const DEFAULT_THEME_MODE = 'system';
const DEFAULT_UI_LANGUAGE = 'system';
const THEME_QUERY = '(prefers-color-scheme: dark)';
const POMODORO_BREAK_PHASES = new Set(['shortBreak', 'longBreak']);
let currentThemeMode = DEFAULT_THEME_MODE;
let selectedUiMessages = null;

function normalizeUiLanguage(value) {
    const normalizedValue = String(value || DEFAULT_UI_LANGUAGE).trim().replace('-', '_');
    if (!normalizedValue || normalizedValue === DEFAULT_UI_LANGUAGE) {
        return DEFAULT_UI_LANGUAGE;
    }

    if (!/^[a-z]{2,3}(?:_[A-Za-z0-9]{2,4})?$/.test(normalizedValue)) {
        return DEFAULT_UI_LANGUAGE;
    }

    return normalizedValue;
}

function normalizeSubstitutions(substitutions) {
    return Array.isArray(substitutions)
        ? substitutions.map(value => String(value))
        : (substitutions === undefined ? [] : [String(substitutions)]);
}

function interpolatePositionalPlaceholders(message, substitutions) {
    return normalizeSubstitutions(substitutions).reduce((text, value, index) => (
        text.replace(new RegExp(`\\$${index + 1}`, 'g'), String(value))
    ), String(message || ''));
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getPlaceholderSubstitutionIndex(placeholderContent) {
    const match = String(placeholderContent || '').match(/^\$(\d+)$/);
    if (!match) {
        return null;
    }

    const index = Number.parseInt(match[1], 10) - 1;
    return Number.isInteger(index) && index >= 0 ? index : null;
}

function formatLocalizedMessage(messageEntry, substitutions) {
    let message = String(messageEntry?.message || '');
    const values = normalizeSubstitutions(substitutions);
    const placeholders = messageEntry?.placeholders || {};

    Object.entries(placeholders).forEach(([name, placeholder]) => {
        const substitutionIndex = getPlaceholderSubstitutionIndex(placeholder?.content);
        if (substitutionIndex === null) {
            return;
        }

        message = message.replace(new RegExp(`\\$${escapeRegExp(name)}\\$`, 'gi'), values[substitutionIndex] || '');
    });

    return interpolatePositionalPlaceholders(message, values);
}

function getLocalizedMessage(messageKey, fallback, substitutions) {
    const selectedMessage = selectedUiMessages?.[messageKey];
    if (selectedMessage?.message) {
        return formatLocalizedMessage(selectedMessage, substitutions);
    }

    try {
        return chrome.i18n.getMessage(messageKey, substitutions) || interpolatePositionalPlaceholders(fallback, substitutions);
    } catch (error) {
        return interpolatePositionalPlaceholders(fallback, substitutions);
    }
}

function loadSelectedUiLanguage(callback) {
    safeSyncStorageGet({ [UI_LANGUAGE_STORAGE_KEY]: DEFAULT_UI_LANGUAGE }, result => {
        const language = normalizeUiLanguage(result?.[UI_LANGUAGE_STORAGE_KEY]);
        if (language === DEFAULT_UI_LANGUAGE) {
            selectedUiMessages = null;
            callback();
            return;
        }

        fetch(chrome.runtime.getURL(`_locales/${language}/messages.json`))
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                return response.json();
            })
            .then(messages => {
                selectedUiMessages = messages;
                callback();
            })
            .catch(error => {
                console.error(`Failed to load blocked page locale ${language}:`, error);
                selectedUiMessages = null;
                callback();
            });
    });
}

function localizeBlockedPage() {
    const title = getLocalizedMessage('contentBlockedTitle', 'Content Blocked');
    document.getElementById('title').textContent = title;
    document.getElementById('message').textContent = getLocalizedMessage(
        'contentBlockedMessage',
        'This page contains restricted content and has been blocked for your protection.'
    );
    document.getElementById('top').textContent = title;
    document.getElementById('pomodoroBlockPhase').textContent = getLocalizedMessage('popupPomodoroTitle', 'Pomodoro');
}

localizeBlockedPage();
loadSelectedUiLanguage(localizeBlockedPage);

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

safeSyncStorageGet({ [THEME_STORAGE_KEY]: DEFAULT_THEME_MODE }, result => {
    if (!result) {
        applyThemeMode(DEFAULT_THEME_MODE);
        return;
    }

    currentThemeMode = normalizeThemeMode(result[THEME_STORAGE_KEY]);
    applyThemeMode(currentThemeMode);

    window.matchMedia(THEME_QUERY).addEventListener('change', () => {
        applyThemeMode(currentThemeMode);
    });
});

safeStorageOnChangedAddListener((changes, areaName) => {
    if (areaName !== 'sync') {
        return;
    }

    if (changes[THEME_STORAGE_KEY]) {
        currentThemeMode = normalizeThemeMode(changes[THEME_STORAGE_KEY].newValue);
        applyThemeMode(currentThemeMode);
    }

    if (changes[UI_LANGUAGE_STORAGE_KEY]) {
        loadSelectedUiLanguage(localizeBlockedPage);
    }
});

function requestPomodoroState(callback) {
    safeRuntimeSendMessage({ action: 'getPomodoroState' }, callback);
}

function getPomodoroBlockedPageMessage(payload) {
    const phase = payload?.timerStatus?.phase;
    const planName = payload?.plan?.name || 'active plan';
    const phaseLabel = payload?.timerStatus?.phaseLabel || 'Pomodoro';

    if (phase === 'shortBreak' || phase === 'longBreak') {
        return getLocalizedMessage(
            'blockedPomodoroBreakMessage',
            '$1: $2 active. Return when this reaches zero.',
            [planName, phaseLabel.toLowerCase()]
        );
    }

    return '';
}

function clearPomodoroBlockPanel(panel) {
    document.getElementById('pomodoroBlockPhase').textContent = '';
    document.getElementById('pomodoroBlockTimer').textContent = '';
    document.getElementById('pomodoroBlockMessage').textContent = '';
    panel.hidden = true;
}

function renderPomodoroState(payload) {
    const panel = document.getElementById('pomodoroBlockPanel');
    const phase = payload?.timerStatus?.phase || 'idle';
    const shouldShow = Boolean(
        payload?.plan?.pomodoro?.strictBreaks
            && payload.plan.active
            && POMODORO_BREAK_PHASES.has(phase)
    );
    panel.hidden = !shouldShow;

    if (!shouldShow) {
        clearPomodoroBlockPanel(panel);
        return;
    }

    document.getElementById('pomodoroBlockPhase').textContent = payload.timerStatus.phaseLabel || 'Pomodoro';
    document.getElementById('pomodoroBlockTimer').textContent = payload.timerStatus.remainingText || '0:00';
    document.getElementById('pomodoroBlockMessage').textContent = getPomodoroBlockedPageMessage(payload);
}

function refreshPomodoroState() {
    requestPomodoroState(renderPomodoroState);
}

refreshPomodoroState();
window.setInterval(refreshPomodoroState, 1000);
