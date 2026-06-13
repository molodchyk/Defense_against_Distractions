// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  isNormalizedKeywordScoreValue,
  parseKeywordForEditing,
  parseKeywordScoreValue,
  splitKeywordEntry
} from './keywords.js';

export function getStoredGroups(storageItems) {
  return Object.entries(storageItems)
    .filter(([key]) => key.startsWith('group_'))
    .map(([, value]) => value);
}

export function getNextUnnamedGroupName(groups, unnamedGroupPrefix) {
  const existingNames = new Set(groups.map(group => group.groupName.toLowerCase()));
  let groupNumber = 1;

  while (existingNames.has(`${unnamedGroupPrefix.toLowerCase()} ${groupNumber}`)) {
    groupNumber++;
  }

  return `${unnamedGroupPrefix} ${groupNumber}`;
}

export function areWebsiteChangesValid(originalWebsites, newWebsites) {
  const newSet = new Set(newWebsites);
  if (newSet.size !== newWebsites.length) {
    return false;
  }

  return originalWebsites.every(website => newWebsites.includes(website));
}

export function areKeywordChangesValid(originalKeywords, newKeywords) {
  const newKeywordMap = newKeywords.reduce((map, keywordStr) => {
    const [keyword] = parseKeywordForEditing(keywordStr);
    map[keyword] = keywordStr;
    return map;
  }, {});

  for (const originalKeywordStr of originalKeywords) {
    const [originalKeyword, originalSign, originalValue] = parseKeywordForEditing(originalKeywordStr);
    const newKeywordStr = newKeywordMap[originalKeyword];

    if (!newKeywordStr) {
      return false;
    }

    const [, sign, newValue] = parseKeywordForEditing(newKeywordStr);

    if (originalSign === '+' && sign === null && originalValue === newValue) {
      continue;
    }

    if (originalSign === null && originalValue !== null && sign === '*' && newValue !== null) {
      return false;
    }

    if ((originalSign !== null || originalValue !== null) && isSimpleKeyword(sign, newValue)) {
      continue;
    }

    if (isSimpleKeyword(originalSign, originalValue) && (sign !== null || newValue !== null)) {
      return false;
    }

    if (originalSign && sign !== originalSign && !(originalSign === '+' && sign === null)) {
      return false;
    }

    if (originalValue !== null && newValue !== null && newValue < originalValue) {
      return false;
    }
  }

  return true;
}

export function validateKeywordEntry(entry, isLockedSchedule) {
  const components = splitKeywordEntry(entry);

  if (components.length === 0 || components.length > 3) {
    return false;
  }

  if (components.length === 1) {
    return true;
  }

  const sign = components.length === 3 ? components[1] : '+';
  const valueComponent = components[components.length - 1];
  const numericValue = parseKeywordScoreValue(valueComponent);

  if (sign !== '+' && sign !== '*') {
    return false;
  }

  if (numericValue === null) {
    return false;
  }

  if (sign === '*' && isNormalizedKeywordScoreValue(valueComponent)) {
    return false;
  }

  if (isLockedSchedule) {
    if (sign === '+' && (numericValue <= 0 || numericValue > 1000)) return false;
    if (sign === '*' && (numericValue <= 1 || numericValue > 1000)) return false;
  } else {
    if (sign === '+' && (numericValue < -1000 || numericValue > 1000 || numericValue === 0)) return false;
    if (sign === '*' && (numericValue <= 0 || numericValue > 1000 || numericValue === 1)) return false;
  }

  return true;
}

function isSimpleKeyword(sign, value) {
  return sign === null && value === null;
}
