// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

const requiredOwnershipFields = [
  'Storage area',
  'Owner feature',
  'Data shape/version',
  'Migration path',
  'Retention or pruning',
  'Quota risk',
  'Classification'
];

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getStorageOwnershipSections(storageOwnership) {
  const sections = [];
  const matches = [...String(storageOwnership || '').matchAll(/^###\s+(.+)$/gm)];

  for (const [index, match] of matches.entries()) {
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? storageOwnership.length;
    sections.push({
      title: match[1].trim(),
      text: storageOwnership.slice(start, end).trim()
    });
  }

  return sections;
}

function sectionContainsKeyFamily(section, keyFamily) {
  const escapedKey = escapeRegExp(keyFamily);
  return new RegExp(`^-\\s+Keys?:\\s+.*\`${escapedKey}\``, 'im').test(section.text);
}

function hasField(section, field) {
  return new RegExp(`^-\\s+${escapeRegExp(field)}:\\s+\\S`, 'im').test(section.text);
}

export function getStorageOwnershipFailures({ storageOwnership, storageKeyFamilies }) {
  const failures = [];
  const sections = getStorageOwnershipSections(storageOwnership);

  if (sections.length === 0) {
    return ['Storage ownership document must contain per-key sections with ### headings.'];
  }

  for (const keyFamily of storageKeyFamilies) {
    const section = sections.find(candidate => sectionContainsKeyFamily(candidate, keyFamily));
    if (!section) {
      failures.push(`Storage ownership document must cover ${keyFamily}.`);
      continue;
    }

    const missingFields = requiredOwnershipFields.filter(field => !hasField(section, field));
    if (missingFields.length > 0) {
      failures.push(
        `Storage ownership section "${section.title}" for ${keyFamily} is missing required fields: ${missingFields.join(', ')}.`
      );
    }
  }

  return failures;
}
