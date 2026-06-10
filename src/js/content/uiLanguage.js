// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};

  const UI_LANGUAGE_STORAGE_KEY = 'uiLanguage';
  const DEFAULT_UI_LANGUAGE = 'system';
  const AVAILABLE_LANGUAGE_CODES = new Set([
    'af', 'am', 'ar', 'az', 'bg', 'bn', 'ca', 'cs', 'da', 'de', 'el', 'en', 'en_GB', 'en_US',
    'es', 'es_419', 'et', 'eu', 'fa', 'fi', 'fil', 'fr', 'gu', 'he', 'hi', 'hr', 'hu', 'hy',
    'id', 'is', 'it', 'ja', 'ka', 'kn', 'ko', 'lt', 'lv', 'mk', 'ml', 'mr', 'ms', 'ne', 'nl',
    'no', 'pa', 'pl', 'pt_BR', 'pt_PT', 'ro', 'ru', 'si', 'sk', 'sl', 'sq', 'sr', 'sv', 'sw',
    'ta', 'te', 'th', 'tr', 'uk', 'ur', 'uz', 'vi', 'zh_CN', 'zh_TW'
  ]);
  const NORMALIZED_LANGUAGE_CODES = new Map(
    Array.from(AVAILABLE_LANGUAGE_CODES).map(code => [code.toLowerCase(), code])
  );
  const localeMessageCache = new Map();
  const changeListeners = new Set();

  let preferredLanguage = DEFAULT_UI_LANGUAGE;
  let selectedMessages = null;
  let initialized = false;
  let initializePromise = null;

  function normalizeLanguage(value) {
    const normalizedValue = String(value || DEFAULT_UI_LANGUAGE).trim().replace('-', '_');
    if (!normalizedValue || normalizedValue === DEFAULT_UI_LANGUAGE) {
      return DEFAULT_UI_LANGUAGE;
    }

    const exactCode = NORMALIZED_LANGUAGE_CODES.get(normalizedValue.toLowerCase());
    if (exactCode) {
      return exactCode;
    }

    const baseCode = normalizedValue.split('_')[0].toLowerCase();
    return AVAILABLE_LANGUAGE_CODES.has(baseCode) ? baseCode : DEFAULT_UI_LANGUAGE;
  }

  async function loadLocaleMessages(language) {
    const normalizedLanguage = normalizeLanguage(language);
    if (normalizedLanguage === DEFAULT_UI_LANGUAGE) {
      return null;
    }

    if (localeMessageCache.has(normalizedLanguage)) {
      return localeMessageCache.get(normalizedLanguage);
    }

    try {
      const response = await fetch(global.chrome.runtime.getURL(`_locales/${normalizedLanguage}/messages.json`));
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const messages = await response.json();
      localeMessageCache.set(normalizedLanguage, messages);
      return messages;
    } catch (error) {
      console.error(`Failed to load content UI locale ${normalizedLanguage}:`, error);
      localeMessageCache.set(normalizedLanguage, null);
      return null;
    }
  }

  function getStoredLanguage() {
    return new Promise(resolve => {
      global.DAD.safeSyncStorageGet({ [UI_LANGUAGE_STORAGE_KEY]: DEFAULT_UI_LANGUAGE }, result => {
        resolve(normalizeLanguage(result?.[UI_LANGUAGE_STORAGE_KEY]));
      });
    });
  }

  async function setActiveLanguage(language) {
    preferredLanguage = normalizeLanguage(language);
    selectedMessages = preferredLanguage === DEFAULT_UI_LANGUAGE
      ? null
      : await loadLocaleMessages(preferredLanguage);
    initialized = true;
    notifyChangeListeners();
  }

  function initialize(callback) {
    if (!initializePromise) {
      initializePromise = getStoredLanguage()
        .then(setActiveLanguage)
        .catch(error => {
          console.error('Failed to initialize content UI language:', error);
          initialized = true;
        })
        .finally(() => {
          initializePromise = null;
        });
    }

    if (callback) {
      initializePromise.then(callback).catch(callback);
    }

    return initializePromise;
  }

  function notifyChangeListeners() {
    changeListeners.forEach(listener => {
      try {
        listener(preferredLanguage);
      } catch (error) {
        console.error('Failed to notify content UI language listener:', error);
      }
    });
  }

  function getMessage(key, fallback = '', substitutions) {
    const customMessage = selectedMessages?.[key];
    if (customMessage?.message) {
      return formatLocalizedMessage(customMessage, substitutions);
    }

    try {
      const chromeMessage = global.chrome?.i18n?.getMessage?.(key, substitutions);
      if (chromeMessage) {
        return chromeMessage;
      }
    } catch (error) {
      // Use fallback below when the extension context is no longer available.
    }

    return interpolatePositionalPlaceholders(fallback || key, substitutions);
  }

  function formatLocalizedMessage(messageEntry, substitutions) {
    let message = String(messageEntry.message || '');
    const values = normalizeSubstitutions(substitutions);
    const placeholders = messageEntry.placeholders || {};

    Object.entries(placeholders).forEach(([name, placeholder]) => {
      const substitutionIndex = getPlaceholderSubstitutionIndex(placeholder?.content);
      if (substitutionIndex === null) {
        return;
      }

      message = message.replace(new RegExp(`\\$${escapeRegExp(name)}\\$`, 'gi'), values[substitutionIndex] || '');
    });

    return interpolatePositionalPlaceholders(message, values);
  }

  function getPlaceholderSubstitutionIndex(placeholderContent) {
    const match = String(placeholderContent || '').match(/^\$(\d+)$/);
    if (!match) {
      return null;
    }

    const index = Number.parseInt(match[1], 10) - 1;
    return Number.isInteger(index) && index >= 0 ? index : null;
  }

  function interpolatePositionalPlaceholders(message, substitutions) {
    return normalizeSubstitutions(substitutions).reduce((text, value, index) => (
      text.replace(new RegExp(`\\$${index + 1}`, 'g'), String(value))
    ), String(message || ''));
  }

  function normalizeSubstitutions(substitutions) {
    return Array.isArray(substitutions)
      ? substitutions.map(value => String(value))
      : (substitutions === undefined ? [] : [String(substitutions)]);
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function onChange(listener) {
    changeListeners.add(listener);
    return () => changeListeners.delete(listener);
  }

  global.DAD.safeStorageOnChangedAddListener((changes, areaName) => {
    if (areaName !== 'sync' || !changes[UI_LANGUAGE_STORAGE_KEY]) {
      return;
    }

    setActiveLanguage(changes[UI_LANGUAGE_STORAGE_KEY].newValue).catch(error => {
      console.error('Failed to sync content UI language:', error);
    });
  });

  global.DAD.UiLanguage = {
    UI_LANGUAGE_STORAGE_KEY,
    get initialized() {
      return initialized;
    },
    getMessage,
    initialize,
    normalizeLanguage,
    onChange
  };

  initialize();
})(window);
