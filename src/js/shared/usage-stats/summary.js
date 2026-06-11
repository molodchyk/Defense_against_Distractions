// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  USAGE_STATS_EXPORT_SCHEMA,
  USAGE_STATS_SCHEMA_VERSION
} from './constants.js';
import {
  aggregateDomain,
  createEmptyDomain,
  sortDomains
} from './metrics.js';
import {
  normalizeUsageStats
} from './state.js';
import {
  getDayKey,
  getNow,
  sanitizeCount,
  toIsoString,
  toTimestamp
} from './utils.js';

export function summarizeUsageStats(state = {}, options = {}) {
  const now = getNow(options);
  const normalizedState = normalizeUsageStats(state, { ...options, now: () => now });
  const todayKey = getDayKey(now);
  const today = normalizedState.days.find(day => day.dayKey === todayKey) || {
    dayKey: todayKey,
    samples: 0,
    visits: 0,
    activeMs: 0,
    dwellMs: 0,
    domains: []
  };
  const aggregate = {
    samples: 0,
    visits: 0,
    activeMs: 0,
    dwellMs: 0,
    tabMax: 0,
    windowMax: 0,
    domains: new Map()
  };

  normalizedState.days.forEach(day => {
    aggregate.samples += day.samples;
    aggregate.visits += day.visits;
    aggregate.activeMs += day.activeMs;
    aggregate.dwellMs += day.dwellMs;
    aggregate.tabMax = Math.max(aggregate.tabMax, sanitizeCount(day.tabMax));
    aggregate.windowMax = Math.max(aggregate.windowMax, sanitizeCount(day.windowMax));
    day.domains.forEach(domain => {
      if (!aggregate.domains.has(domain.hostname)) {
        aggregate.domains.set(domain.hostname, createEmptyDomain(domain.hostname));
      }
      aggregateDomain(aggregate.domains.get(domain.hostname), domain);
    });
  });

  return {
    schemaVersion: USAGE_STATS_SCHEMA_VERSION,
    retentionDays: normalizedState.retentionDays,
    updatedAt: normalizedState.updatedAt,
    dayCount: normalizedState.days.length,
    today: {
      dayKey: today.dayKey,
      samples: today.samples,
      visits: today.visits,
      activeMs: today.activeMs,
      dwellMs: today.dwellMs,
      tabMax: sanitizeCount(today.tabMax),
      windowMax: sanitizeCount(today.windowMax),
      domainCount: today.domains.length,
      topDomains: sortDomains([...today.domains]).slice(0, 8)
    },
    total: {
      samples: aggregate.samples,
      visits: aggregate.visits,
      activeMs: aggregate.activeMs,
      dwellMs: aggregate.dwellMs,
      tabMax: aggregate.tabMax,
      windowMax: aggregate.windowMax,
      domainCount: aggregate.domains.size,
      topDomains: sortDomains([...aggregate.domains.values()]).slice(0, 12)
    }
  };
}

export function buildUsageStatsExportPayload(state = {}, options = {}) {
  const now = getNow(options);
  const exportedAt = toIsoString(toTimestamp(options.exportedAt)) || new Date(now).toISOString();
  const normalizedState = normalizeUsageStats(state, { ...options, now: () => now });

  return {
    exportedAt,
    schema: USAGE_STATS_EXPORT_SCHEMA,
    privacy: 'Local hostname-level aggregates only. Raw page text, full URLs, page titles, and topic tokens are not stored in this usage-stats payload.',
    summary: summarizeUsageStats(normalizedState, { ...options, now: () => now }),
    state: normalizedState
  };
}
