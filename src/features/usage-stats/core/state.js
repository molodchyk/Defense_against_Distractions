// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  DEFAULT_MAX_CONTEXTS,
  DEFAULT_MAX_DOMAINS_PER_DAY,
  USAGE_STATS_SCHEMA_VERSION
} from './constants.js';
import {
  normalizeContextEntry,
  normalizeDomainEntry,
  sortDomains
} from './metrics.js';
import {
  getDayKey,
  getNow,
  sanitizeCount,
  sanitizeMs,
  sanitizeRetentionDays,
  toIsoString,
  toTimestamp
} from './utils.js';

function normalizeDayEntry(entry = {}, options = {}) {
  const now = getNow(options);
  const dayKey = /^\d{4}-\d{2}-\d{2}$/.test(entry.dayKey || '')
    ? entry.dayKey
    : getDayKey(toTimestamp(entry.updatedAt) || now);
  const domains = sortDomains(
    (Array.isArray(entry.domains) ? entry.domains : [])
      .map(normalizeDomainEntry)
      .filter(Boolean)
  ).slice(0, Number(options.maxDomainsPerDay || DEFAULT_MAX_DOMAINS_PER_DAY));

  return {
    dayKey,
    samples: sanitizeCount(entry.samples),
    visits: sanitizeCount(entry.visits),
    activeMs: sanitizeMs(entry.activeMs),
    dwellMs: sanitizeMs(entry.dwellMs),
    tabMax: sanitizeCount(entry.tabMax),
    windowMax: sanitizeCount(entry.windowMax),
    allowedSamples: sanitizeCount(entry.allowedSamples),
    allowedVisits: sanitizeCount(entry.allowedVisits),
    allowedActiveMs: sanitizeMs(entry.allowedActiveMs),
    allowedDwellMs: sanitizeMs(entry.allowedDwellMs),
    allowedWordCount: sanitizeCount(entry.allowedWordCount),
    blockedSamples: sanitizeCount(entry.blockedSamples),
    blockedVisits: sanitizeCount(entry.blockedVisits),
    blockedActiveMs: sanitizeMs(entry.blockedActiveMs),
    blockedDwellMs: sanitizeMs(entry.blockedDwellMs),
    blockedWordCount: sanitizeCount(entry.blockedWordCount),
    updatedAt: toIsoString(toTimestamp(entry.updatedAt)) || new Date(now).toISOString(),
    domains
  };
}

function shouldKeepDay(day, now, retentionDays) {
  const dayStart = Date.parse(`${day.dayKey}T00:00:00.000Z`);
  if (!Number.isFinite(dayStart)) {
    return false;
  }

  const minDayStart = Date.parse(`${getDayKey(now - (retentionDays - 1) * 24 * 60 * 60 * 1000)}T00:00:00.000Z`);
  return dayStart >= minDayStart;
}

export function createUsageStatsState(now = Date.now()) {
  return {
    schemaVersion: USAGE_STATS_SCHEMA_VERSION,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    days: [],
    contexts: []
  };
}

export function normalizeUsageStats(state = {}, options = {}) {
  const now = getNow(options);
  const retentionDays = sanitizeRetentionDays(options.retentionDays || state.retentionDays);
  const maxContexts = Number(options.maxContexts || DEFAULT_MAX_CONTEXTS);
  const base = state && typeof state === 'object' ? state : {};
  const days = (Array.isArray(base.days) ? base.days : [])
    .map(day => normalizeDayEntry(day, options))
    .filter(day => shouldKeepDay(day, now, retentionDays))
    .sort((first, second) => first.dayKey.localeCompare(second.dayKey));
  const contexts = (Array.isArray(base.contexts) ? base.contexts : [])
    .map(normalizeContextEntry)
    .filter(Boolean)
    .sort((first, second) => (toTimestamp(second.lastSeenAt) || 0) - (toTimestamp(first.lastSeenAt) || 0))
    .slice(0, maxContexts);

  return {
    schemaVersion: USAGE_STATS_SCHEMA_VERSION,
    createdAt: toIsoString(toTimestamp(base.createdAt)) || new Date(now).toISOString(),
    updatedAt: toIsoString(toTimestamp(base.updatedAt)) || new Date(now).toISOString(),
    retentionDays,
    days,
    contexts
  };
}
