// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  INTERACTION_KEYS,
  MEDIA_KEYS,
  STRUCTURE_KEYS,
  TEXT_KEYS
} from './constants.js';
import {
  normalizeHostname,
  sanitizeCount,
  sanitizeMs,
  toIsoString,
  toTimestamp
} from './utils.js';

export function createMetricBucket(keys, values = {}) {
  return Object.fromEntries(keys.map(key => [key, sanitizeCount(values[key])]));
}

export function mergeMetricMax(target = {}, source = {}, keys = []) {
  return Object.fromEntries(keys.map(key => [
    key,
    Math.max(sanitizeCount(target[key]), sanitizeCount(source[key]))
  ]));
}

export function createEmptyDomain(hostname) {
  return {
    hostname,
    samples: 0,
    visits: 0,
    activeMs: 0,
    dwellMs: 0,
    tabMax: 0,
    windowMax: 0,
    lastSeenAt: null,
    textMax: createMetricBucket(TEXT_KEYS),
    mediaMax: createMetricBucket(MEDIA_KEYS),
    interactionMax: createMetricBucket(INTERACTION_KEYS),
    structureMax: createMetricBucket(STRUCTURE_KEYS)
  };
}

export function normalizeDomainEntry(entry = {}) {
  const hostname = normalizeHostname(entry.hostname);
  if (!hostname) {
    return null;
  }

  return {
    hostname,
    samples: sanitizeCount(entry.samples),
    visits: sanitizeCount(entry.visits),
    activeMs: sanitizeMs(entry.activeMs),
    dwellMs: sanitizeMs(entry.dwellMs),
    tabMax: sanitizeCount(entry.tabMax),
    windowMax: sanitizeCount(entry.windowMax),
    lastSeenAt: toIsoString(toTimestamp(entry.lastSeenAt)),
    textMax: createMetricBucket(TEXT_KEYS, entry.textMax),
    mediaMax: createMetricBucket(MEDIA_KEYS, entry.mediaMax),
    interactionMax: createMetricBucket(INTERACTION_KEYS, entry.interactionMax),
    structureMax: createMetricBucket(STRUCTURE_KEYS, entry.structureMax)
  };
}

export function normalizeContextEntry(entry = {}) {
  const id = typeof entry.id === 'string' && entry.id ? entry.id : null;
  const hostname = normalizeHostname(entry.hostname);
  if (!id || !hostname) {
    return null;
  }

  return {
    id,
    hostname,
    lastSeenAt: toIsoString(toTimestamp(entry.lastSeenAt)),
    lastPageAgeMs: sanitizeMs(entry.lastPageAgeMs),
    lastActivePageMs: sanitizeMs(entry.lastActivePageMs)
  };
}

export function sortDomains(domains) {
  return domains.sort((first, second) => (
    second.activeMs - first.activeMs
      || second.visits - first.visits
      || second.samples - first.samples
      || (toTimestamp(second.lastSeenAt) || 0) - (toTimestamp(first.lastSeenAt) || 0)
      || first.hostname.localeCompare(second.hostname)
  ));
}

export function aggregateDomain(target, source) {
  target.samples += source.samples;
  target.visits += source.visits;
  target.activeMs += source.activeMs;
  target.dwellMs += source.dwellMs;
  target.tabMax = Math.max(sanitizeCount(target.tabMax), sanitizeCount(source.tabMax));
  target.windowMax = Math.max(sanitizeCount(target.windowMax), sanitizeCount(source.windowMax));
  target.lastSeenAt = [target.lastSeenAt, source.lastSeenAt]
    .filter(Boolean)
    .sort()
    .at(-1) || null;
  target.textMax = mergeMetricMax(target.textMax, source.textMax, TEXT_KEYS);
  target.mediaMax = mergeMetricMax(target.mediaMax, source.mediaMax, MEDIA_KEYS);
  target.interactionMax = mergeMetricMax(target.interactionMax, source.interactionMax, INTERACTION_KEYS);
  target.structureMax = mergeMetricMax(target.structureMax, source.structureMax, STRUCTURE_KEYS);
}
