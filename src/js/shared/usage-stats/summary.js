// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  USAGE_STATS_EXPORT_SCHEMA,
  USAGE_STATS_SCHEMA_VERSION
} from './constants.js';
import {
  aggregateDomain,
  createEmptyDomain,
  createOutcomeTextBucket,
  mergeOutcomeTextMax,
  sortDomains
} from './metrics.js';
import {
  normalizeUsageStats
} from './state.js';
import {
  getDayKey,
  getNow,
  sanitizeCount,
  sanitizeMs,
  toIsoString,
  toTimestamp
} from './utils.js';

function summarizeOutcomeTextMax(domains = [], outcome) {
  const key = `${outcome}TextMax`;
  return domains.reduce(
    (result, domain) => mergeOutcomeTextMax(result, domain[key]),
    createOutcomeTextBucket()
  );
}

function getPercent(numerator, denominator) {
  const safeDenominator = Number(denominator);
  if (!Number.isFinite(safeDenominator) || safeDenominator <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((Number(numerator || 0) / safeDenominator) * 100)));
}

function summarizeOutcomeShares(entry = {}) {
  const blockedVisits = sanitizeCount(entry.blockedVisits);
  const allowedVisits = sanitizeCount(entry.allowedVisits);
  const blockedActiveMs = sanitizeMs(entry.blockedActiveMs);
  const allowedActiveMs = sanitizeMs(entry.allowedActiveMs);
  const blockedWordCount = sanitizeCount(entry.blockedWordCount);
  const allowedWordCount = sanitizeCount(entry.allowedWordCount);

  return {
    visitTotal: blockedVisits + allowedVisits,
    activeMsTotal: blockedActiveMs + allowedActiveMs,
    wordCountTotal: blockedWordCount + allowedWordCount,
    blockedVisitPercent: getPercent(blockedVisits, blockedVisits + allowedVisits),
    blockedActivePercent: getPercent(blockedActiveMs, blockedActiveMs + allowedActiveMs),
    blockedWordPercent: getPercent(blockedWordCount, blockedWordCount + allowedWordCount)
  };
}

function withOutcomeShares(entry = {}) {
  return {
    ...entry,
    outcomeShares: summarizeOutcomeShares(entry)
  };
}

function summarizeTopDomains(domains = [], limit) {
  return sortDomains([...domains]).slice(0, limit).map(withOutcomeShares);
}

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
    allowedSamples: 0,
    allowedVisits: 0,
    allowedActiveMs: 0,
    allowedDwellMs: 0,
    allowedWordCount: 0,
    blockedSamples: 0,
    blockedVisits: 0,
    blockedActiveMs: 0,
    blockedDwellMs: 0,
    blockedWordCount: 0,
    domains: []
  };
  const aggregate = {
    samples: 0,
    visits: 0,
    activeMs: 0,
    dwellMs: 0,
    tabMax: 0,
    windowMax: 0,
    allowedSamples: 0,
    allowedVisits: 0,
    allowedActiveMs: 0,
    allowedDwellMs: 0,
    allowedWordCount: 0,
    blockedSamples: 0,
    blockedVisits: 0,
    blockedActiveMs: 0,
    blockedDwellMs: 0,
    blockedWordCount: 0,
    domains: new Map()
  };

  normalizedState.days.forEach(day => {
    aggregate.samples += day.samples;
    aggregate.visits += day.visits;
    aggregate.activeMs += day.activeMs;
    aggregate.dwellMs += day.dwellMs;
    aggregate.tabMax = Math.max(aggregate.tabMax, sanitizeCount(day.tabMax));
    aggregate.windowMax = Math.max(aggregate.windowMax, sanitizeCount(day.windowMax));
    aggregate.allowedSamples += sanitizeCount(day.allowedSamples);
    aggregate.allowedVisits += sanitizeCount(day.allowedVisits);
    aggregate.allowedActiveMs += sanitizeMs(day.allowedActiveMs);
    aggregate.allowedDwellMs += sanitizeMs(day.allowedDwellMs);
    aggregate.allowedWordCount += sanitizeCount(day.allowedWordCount);
    aggregate.blockedSamples += sanitizeCount(day.blockedSamples);
    aggregate.blockedVisits += sanitizeCount(day.blockedVisits);
    aggregate.blockedActiveMs += sanitizeMs(day.blockedActiveMs);
    aggregate.blockedDwellMs += sanitizeMs(day.blockedDwellMs);
    aggregate.blockedWordCount += sanitizeCount(day.blockedWordCount);
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
      allowedSamples: sanitizeCount(today.allowedSamples),
      allowedVisits: sanitizeCount(today.allowedVisits),
      allowedActiveMs: sanitizeMs(today.allowedActiveMs),
      allowedDwellMs: sanitizeMs(today.allowedDwellMs),
      allowedWordCount: sanitizeCount(today.allowedWordCount),
      allowedTextMax: summarizeOutcomeTextMax(today.domains, 'allowed'),
      blockedSamples: sanitizeCount(today.blockedSamples),
      blockedVisits: sanitizeCount(today.blockedVisits),
      blockedActiveMs: sanitizeMs(today.blockedActiveMs),
      blockedDwellMs: sanitizeMs(today.blockedDwellMs),
      blockedWordCount: sanitizeCount(today.blockedWordCount),
      blockedTextMax: summarizeOutcomeTextMax(today.domains, 'blocked'),
      domainCount: today.domains.length,
      outcomeShares: summarizeOutcomeShares(today),
      topDomains: summarizeTopDomains(today.domains, 8)
    },
    total: {
      samples: aggregate.samples,
      visits: aggregate.visits,
      activeMs: aggregate.activeMs,
      dwellMs: aggregate.dwellMs,
      tabMax: aggregate.tabMax,
      windowMax: aggregate.windowMax,
      allowedSamples: aggregate.allowedSamples,
      allowedVisits: aggregate.allowedVisits,
      allowedActiveMs: aggregate.allowedActiveMs,
      allowedDwellMs: aggregate.allowedDwellMs,
      allowedWordCount: aggregate.allowedWordCount,
      allowedTextMax: summarizeOutcomeTextMax([...aggregate.domains.values()], 'allowed'),
      blockedSamples: aggregate.blockedSamples,
      blockedVisits: aggregate.blockedVisits,
      blockedActiveMs: aggregate.blockedActiveMs,
      blockedDwellMs: aggregate.blockedDwellMs,
      blockedWordCount: aggregate.blockedWordCount,
      blockedTextMax: summarizeOutcomeTextMax([...aggregate.domains.values()], 'blocked'),
      domainCount: aggregate.domains.size,
      outcomeShares: summarizeOutcomeShares(aggregate),
      topDomains: summarizeTopDomains([...aggregate.domains.values()], 12)
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
    privacy: 'Local hostname-level aggregates only. Raw page text, full URLs, page titles, and topic tokens are not stored in this usage-stats payload. Blocked/allowed outcome counters are aggregate observations, not raw browsing records.',
    summary: summarizeUsageStats(normalizedState, { ...options, now: () => now }),
    state: normalizedState
  };
}
