// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { getMessage, getUILanguage } from '../../../platform/chrome/i18n.js';
import { getExtensionUrl } from '../../../platform/chrome/runtime.js';
import { getSync, setSync } from '../../../platform/chrome/storage.js';

export const UI_LANGUAGE_STORAGE_KEY = 'uiLanguage';
export const DEFAULT_UI_LANGUAGE = 'system';
const RTL_UI_LANGUAGE_BASE_CODES = new Set(['ar', 'fa', 'he', 'ur']);

export const AVAILABLE_UI_LANGUAGES = Object.freeze([
  { code: DEFAULT_UI_LANGUAGE, label: 'System' },
  { code: 'af', label: 'Afrikaans' },
  { code: 'am', label: 'አማርኛ' },
  { code: 'ar', label: 'العربية' },
  { code: 'az', label: 'azərbaycan' },
  { code: 'bg', label: 'български' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'ca', label: 'català' },
  { code: 'cs', label: 'čeština' },
  { code: 'da', label: 'dansk' },
  { code: 'de', label: 'Deutsch' },
  { code: 'el', label: 'Ελληνικά' },
  { code: 'en', label: 'English' },
  { code: 'en_AU', label: 'English (Australia)' },
  { code: 'en_GB', label: 'English (United Kingdom)' },
  { code: 'en_US', label: 'English (United States)' },
  { code: 'es', label: 'español' },
  { code: 'es_419', label: 'español (Latinoamérica)' },
  { code: 'et', label: 'eesti' },
  { code: 'eu', label: 'euskara' },
  { code: 'fa', label: 'فارسی' },
  { code: 'fi', label: 'suomi' },
  { code: 'fil', label: 'Filipino' },
  { code: 'fr', label: 'français' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'he', label: 'עברית' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'hr', label: 'hrvatski' },
  { code: 'hu', label: 'magyar' },
  { code: 'hy', label: 'հայերեն' },
  { code: 'id', label: 'Indonesia' },
  { code: 'is', label: 'íslenska' },
  { code: 'it', label: 'italiano' },
  { code: 'ja', label: '日本語' },
  { code: 'ka', label: 'ქართული' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'ko', label: '한국어' },
  { code: 'lt', label: 'lietuvių' },
  { code: 'lv', label: 'latviešu' },
  { code: 'mk', label: 'македонски' },
  { code: 'ml', label: 'മലയാളം' },
  { code: 'mr', label: 'मराठी' },
  { code: 'ms', label: 'Melayu' },
  { code: 'ne', label: 'नेपाली' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'no', label: 'norsk' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
  { code: 'pl', label: 'polski' },
  { code: 'pt_BR', label: 'português (Brasil)' },
  { code: 'pt_PT', label: 'português (Portugal)' },
  { code: 'ro', label: 'română' },
  { code: 'ru', label: 'русский' },
  { code: 'si', label: 'සිංහල' },
  { code: 'sk', label: 'slovenčina' },
  { code: 'sl', label: 'slovenščina' },
  { code: 'sq', label: 'shqip' },
  { code: 'sr', label: 'српски' },
  { code: 'sv', label: 'svenska' },
  { code: 'sw', label: 'Kiswahili' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'th', label: 'ไทย' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'uk', label: 'українська' },
  { code: 'ur', label: 'اردو' },
  { code: 'uz', label: 'o‘zbek' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'zh_CN', label: '中文（中国）' },
  { code: 'zh_TW', label: '中文（台灣）' }
]);

const AVAILABLE_CODES = new Set(AVAILABLE_UI_LANGUAGES.map(language => language.code));
const NORMALIZED_CODE_LOOKUP = new Map(
  AVAILABLE_UI_LANGUAGES.map(language => [language.code.toLowerCase(), language.code])
);
const localeMessageCache = new Map();

let preferredUiLanguage = DEFAULT_UI_LANGUAGE;
let resolvedUiLanguage = null;
let selectedMessages = null;

export function normalizeUiLanguage(value) {
  const normalizedValue = String(value || DEFAULT_UI_LANGUAGE).trim().replace('-', '_');
  if (!normalizedValue || normalizedValue === DEFAULT_UI_LANGUAGE) {
    return DEFAULT_UI_LANGUAGE;
  }

  const exactCode = NORMALIZED_CODE_LOOKUP.get(normalizedValue.toLowerCase());
  if (exactCode) {
    return exactCode;
  }

  const baseCode = normalizedValue.split('_')[0].toLowerCase();
  return AVAILABLE_CODES.has(baseCode) ? baseCode : DEFAULT_UI_LANGUAGE;
}

export function getPreferredUiLanguage() {
  return preferredUiLanguage;
}

export function getAvailableUiLanguages() {
  return AVAILABLE_UI_LANGUAGES;
}

export function getResolvedUiLanguage() {
  return resolvedUiLanguage || getSystemUiLanguage();
}

export function getUiLanguageDirection(language = getResolvedUiLanguage()) {
  const normalizedLanguage = normalizeUiLanguage(language);
  const languageCode = normalizedLanguage === DEFAULT_UI_LANGUAGE
    ? getSystemUiLanguage()
    : normalizedLanguage;
  const baseCode = languageCode.split('_')[0].toLowerCase();
  return RTL_UI_LANGUAGE_BASE_CODES.has(baseCode) ? 'rtl' : 'ltr';
}

export function getResolvedUiDirection() {
  return getUiLanguageDirection(getResolvedUiLanguage());
}

export function applyUiLanguageAttributes(element = globalThis.document?.documentElement) {
  if (!element) {
    return {
      lang: getResolvedUiLanguage(),
      dir: getResolvedUiDirection()
    };
  }

  const language = getResolvedUiLanguage().replace('_', '-');
  const direction = getResolvedUiDirection();
  element.setAttribute('lang', language);
  element.setAttribute('dir', direction);
  element.dataset.uiDirection = direction;

  return {
    lang: language,
    dir: direction
  };
}

export async function initializeUiLanguage() {
  let storedLanguage = DEFAULT_UI_LANGUAGE;

  try {
    const result = await getSync({ [UI_LANGUAGE_STORAGE_KEY]: DEFAULT_UI_LANGUAGE });
    storedLanguage = result[UI_LANGUAGE_STORAGE_KEY];
  } catch (error) {
    console.error('Failed to load UI language:', error);
  }

  return setActiveUiLanguage(storedLanguage);
}

export async function setUiLanguagePreference(language) {
  const normalizedLanguage = normalizeUiLanguage(language);
  await setSync({ [UI_LANGUAGE_STORAGE_KEY]: normalizedLanguage });
  return setActiveUiLanguage(normalizedLanguage);
}

export async function setActiveUiLanguage(language) {
  preferredUiLanguage = normalizeUiLanguage(language);
  const nextResolvedLanguage = preferredUiLanguage === DEFAULT_UI_LANGUAGE
    ? getSystemUiLanguage()
    : preferredUiLanguage;

  resolvedUiLanguage = nextResolvedLanguage;
  selectedMessages = preferredUiLanguage === DEFAULT_UI_LANGUAGE
    ? null
    : await loadLocaleMessages(nextResolvedLanguage);

  return {
    preferred: preferredUiLanguage,
    resolved: resolvedUiLanguage
  };
}

export function getUiMessage(key, fallback = '', substitutions) {
  const customMessage = selectedMessages?.[key];
  if (customMessage?.message) {
    return formatLocalizedMessage(customMessage, substitutions);
  }

  const chromeMessage = getMessage(key, substitutions);
  if (chromeMessage) {
    return chromeMessage;
  }

  return interpolatePositionalPlaceholders(fallback || key, substitutions);
}

function getSystemUiLanguage() {
  const browserLanguage = getUILanguage() || globalThis.navigator?.language || 'en';
  return normalizeUiLanguage(browserLanguage) === DEFAULT_UI_LANGUAGE
    ? 'en'
    : normalizeUiLanguage(browserLanguage);
}

async function loadLocaleMessages(localeCode) {
  const normalizedLocale = normalizeUiLanguage(localeCode);
  if (normalizedLocale === DEFAULT_UI_LANGUAGE) {
    return null;
  }

  if (localeMessageCache.has(normalizedLocale)) {
    return localeMessageCache.get(normalizedLocale);
  }

  try {
    const localeUrl = getExtensionUrl(`_locales/${normalizedLocale}/messages.json`);
    const response = await fetch(localeUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const messages = await response.json();
    localeMessageCache.set(normalizedLocale, messages);
    return messages;
  } catch (error) {
    console.error(`Failed to load UI locale ${normalizedLocale}:`, error);
    localeMessageCache.set(normalizedLocale, null);
    return null;
  }
}

export function formatLocalizedMessage(messageEntry, substitutions) {
  let message = String(messageEntry.message || '');
  const values = normalizeSubstitutions(substitutions);
  const placeholders = messageEntry.placeholders || {};

  Object.entries(placeholders).forEach(([name, placeholder]) => {
    const placeholderContent = String(placeholder?.content || '');
    const substitutionIndex = getPlaceholderSubstitutionIndex(placeholderContent);
    if (substitutionIndex === null) {
      return;
    }

    message = message.replace(new RegExp(`\\$${escapeRegExp(name)}\\$`, 'gi'), values[substitutionIndex] || '');
  });

  return interpolatePositionalPlaceholders(message, values);
}

function getPlaceholderSubstitutionIndex(placeholderContent) {
  const match = placeholderContent.match(/^\$(\d+)$/);
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
