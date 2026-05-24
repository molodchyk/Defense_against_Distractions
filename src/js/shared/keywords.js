// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export function splitKeywordEntry(keyword) {
  return keyword.split(/(?<!\\),/).map(part => part.trim().replace(/\\,/g, ','));
}

export function parseKeywordForScanning(keywordStr) {
  let keyword = '';
  let operation = '+';
  let value = 1000;

  if (!keywordStr) {
    return { keyword, operation, value };
  }

  const parts = splitKeywordEntry(keywordStr);
  keyword = parts[0];

  if (parts.length > 1) {
    const secondPart = parts[1];
    if (Number.isNaN(Number(secondPart))) {
      operation = secondPart === '+' || secondPart === '*' ? secondPart : '+';
    } else {
      value = Number.parseFloat(secondPart);
    }
  }

  if (parts.length > 2 && !Number.isNaN(Number(parts[2]))) {
    value = Number.parseFloat(parts[2]);
  }

  return { keyword, operation, value };
}

export function parseKeywordForEditing(keyword) {
  const parts = splitKeywordEntry(keyword);
  const word = parts[0];
  const sign = parts.length === 3 ? parts[1] : null;
  const value = parts.length >= 2 ? Number.parseFloat(parts[parts.length - 1]) : null;

  return [word, sign, value];
}
