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

export function createOutcomeTextBucket(values = {}) {
  return createMetricBucket(TEXT_KEYS, values);
}

export function mergeOutcomeTextMax(target = {}, source = {}) {
  return mergeMetricMax(target, source, TEXT_KEYS);
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
    allowedSamples: 0,
    allowedVisits: 0,
    allowedActiveMs: 0,
    allowedDwellMs: 0,
    allowedWordCount: 0,
    allowedTextMax: createOutcomeTextBucket(),
    blockedSamples: 0,
    blockedVisits: 0,
    blockedActiveMs: 0,
    blockedDwellMs: 0,
    blockedWordCount: 0,
    blockedTextMax: createOutcomeTextBucket(),
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
    allowedSamples: sanitizeCount(entry.allowedSamples),
    allowedVisits: sanitizeCount(entry.allowedVisits),
    allowedActiveMs: sanitizeMs(entry.allowedActiveMs),
    allowedDwellMs: sanitizeMs(entry.allowedDwellMs),
    allowedWordCount: sanitizeCount(entry.allowedWordCount),
    allowedTextMax: createOutcomeTextBucket(entry.allowedTextMax),
    blockedSamples: sanitizeCount(entry.blockedSamples),
    blockedVisits: sanitizeCount(entry.blockedVisits),
    blockedActiveMs: sanitizeMs(entry.blockedActiveMs),
    blockedDwellMs: sanitizeMs(entry.blockedDwellMs),
    blockedWordCount: sanitizeCount(entry.blockedWordCount),
    blockedTextMax: createOutcomeTextBucket(entry.blockedTextMax),
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
    lastActivePageMs: sanitizeMs(entry.lastActivePageMs),
    lastWordCount: sanitizeCount(entry.lastWordCount),
    lastOutcome: entry.lastOutcome === 'blocked' ? 'blocked' : 'allowed',
    lastDayKey: /^\d{4}-\d{2}-\d{2}$/.test(entry.lastDayKey || '') ? entry.lastDayKey : null
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
  target.allowedSamples += sanitizeCount(source.allowedSamples);
  target.allowedVisits += sanitizeCount(source.allowedVisits);
  target.allowedActiveMs += sanitizeMs(source.allowedActiveMs);
  target.allowedDwellMs += sanitizeMs(source.allowedDwellMs);
  target.allowedWordCount += sanitizeCount(source.allowedWordCount);
  target.allowedTextMax = mergeOutcomeTextMax(target.allowedTextMax, source.allowedTextMax);
  target.blockedSamples += sanitizeCount(source.blockedSamples);
  target.blockedVisits += sanitizeCount(source.blockedVisits);
  target.blockedActiveMs += sanitizeMs(source.blockedActiveMs);
  target.blockedDwellMs += sanitizeMs(source.blockedDwellMs);
  target.blockedWordCount += sanitizeCount(source.blockedWordCount);
  target.blockedTextMax = mergeOutcomeTextMax(target.blockedTextMax, source.blockedTextMax);
  target.textMax = mergeMetricMax(target.textMax, source.textMax, TEXT_KEYS);
  target.mediaMax = mergeMetricMax(target.mediaMax, source.mediaMax, MEDIA_KEYS);
  target.interactionMax = mergeMetricMax(target.interactionMax, source.interactionMax, INTERACTION_KEYS);
  target.structureMax = mergeMetricMax(target.structureMax, source.structureMax, STRUCTURE_KEYS);
}
