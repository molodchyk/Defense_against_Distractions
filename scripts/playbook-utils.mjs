// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { readFile } from 'node:fs/promises';
import path from 'node:path';

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

export function getDuplicateKeyedBlockFields(text, blockName) {
  const block = getBracketBlock(text, blockName);
  const seen = new Set();
  const duplicates = new Set();
  const fieldPattern = /^([A-Za-z0-9_.-]+):[ \t]*\r?\n/gm;

  for (const match of block.matchAll(fieldPattern)) {
    if (seen.has(match[1])) {
      duplicates.add(match[1]);
    } else {
      seen.add(match[1]);
    }
  }

  return [...duplicates].sort((left, right) => left.localeCompare(right));
}

export async function getPngDimensionFailure(rootDir, relativePath, expectedWidth, expectedHeight) {
  try {
    const buffer = await readFile(path.join(rootDir, relativePath));
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const hasPngSignature = buffer.length >= 24 && buffer.subarray(0, 8).equals(pngSignature);

    if (!hasPngSignature) {
      return `${relativePath} must be a valid PNG file.`;
    }

    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);

    return width === expectedWidth && height === expectedHeight
      ? null
      : `${relativePath} must be ${expectedWidth}x${expectedHeight}, got ${width}x${height}.`;
  } catch {
    return `Missing or unreadable PNG file: ${relativePath}`;
  }
}
