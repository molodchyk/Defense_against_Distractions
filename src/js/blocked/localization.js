// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

const UI_LANGUAGE_STORAGE_KEY = 'uiLanguage';
const DEFAULT_UI_LANGUAGE = 'system';

export function initBlockedPageLocalization({
  safeSyncStorageGet,
  safeStorageOnChangedAddListener
}) {
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

  function getMessage(messageKey, fallback, substitutions) {
    const selectedMessage = selectedUiMessages?.[messageKey];
    if (selectedMessage?.message) {
      return formatLocalizedMessage(selectedMessage, substitutions);
    }

    try {
      return globalThis.chrome.i18n.getMessage(messageKey, substitutions)
        || interpolatePositionalPlaceholders(fallback, substitutions);
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

      const runtimeUrl = getRuntimeUrl(`_locales/${language}/messages.json`);
      if (!runtimeUrl) {
        selectedUiMessages = null;
        callback();
        return;
      }

      fetch(runtimeUrl)
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
    const title = getMessage('contentBlockedTitle', 'Content Blocked');
    setText('title', title);
    setText(
      'message',
      getMessage(
        'contentBlockedMessage',
        'This page contains restricted content and has been blocked for your protection.'
      )
    );
    setText('top', title);
    setText('pomodoroBlockPhase', getMessage('popupPomodoroTitle', 'Pomodoro'));
  }

  localizeBlockedPage();
  loadSelectedUiLanguage(localizeBlockedPage);

  safeStorageOnChangedAddListener((changes, areaName) => {
    if (areaName === 'sync' && changes[UI_LANGUAGE_STORAGE_KEY]) {
      loadSelectedUiLanguage(localizeBlockedPage);
    }
  });

  return {
    getMessage,
    localizeBlockedPage,
    loadSelectedUiLanguage
  };
}

function setText(elementId, text) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = text;
  }
}

function getRuntimeUrl(path) {
  try {
    return globalThis.chrome?.runtime?.getURL?.(path) || '';
  } catch (error) {
    return '';
  }
}
