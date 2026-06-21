// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export function hasAll(text, patterns) {
  return patterns.every(pattern => pattern.test(text));
}

export function getFirstNonEmptyLine(text) {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(Boolean) || '';
}

function getBracketBlock(text, blockName) {
  const blockMarker = `[${blockName}]`;
  const start = text.indexOf(blockMarker);
  if (start === -1) {
    return '';
  }

  const afterMarker = text.slice(start + blockMarker.length);
  const nextHeading = afterMarker.search(/^##\s+/m);
  return nextHeading === -1 ? afterMarker : afterMarker.slice(0, nextHeading);
}

export function parseKeyedBlock(text, blockName) {
  const block = getBracketBlock(text, blockName);
  const fields = new Map();
  const fieldPattern = /^([A-Za-z0-9_.-]+):[ \t]*\r?\n([\s\S]*?)(?=^[A-Za-z0-9_.-]+:[ \t]*\r?\n|\s*$)/gm;

  for (const match of block.matchAll(fieldPattern)) {
    fields.set(match[1], match[2].trim());
  }

  return fields;
}
