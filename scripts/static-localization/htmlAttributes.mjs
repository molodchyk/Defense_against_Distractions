// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

const supportedDataI18nAttributes = new Set([
  'data-i18n',
  'data-i18n-aria-label',
  'data-i18n-placeholder',
  'data-i18n-title'
]);

export function getDataI18nAttributeFailures({ file, tagName, attributes, englishMessages }) {
  const failures = [];

  for (const match of attributes.matchAll(/\b(data-i18n(?:-[a-z-]+)?)=([\"'])(.*?)\2/gi)) {
    const [, attributeName, , rawMessageKey] = match;
    const messageKey = rawMessageKey.trim();
    if (!supportedDataI18nAttributes.has(attributeName.toLowerCase())) {
      failures.push(`${file}: <${tagName}> ${attributeName} is not a supported direct HTML localization attribute.`);
    }

    if (!messageKey) {
      failures.push(`${file}: <${tagName}> ${attributeName} has an empty localization key.`);
    } else if (!Object.hasOwn(englishMessages, messageKey)) {
      failures.push(`${file}: <${tagName}> ${attributeName} references missing localization key: ${messageKey}`);
    }
  }

  return failures;
}
