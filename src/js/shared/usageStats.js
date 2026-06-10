// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export const USAGE_STATS_STORAGE_KEY = 'usageStats';
export const USAGE_STATS_SCHEMA_VERSION = 1;
export const USAGE_STATS_EXPORT_SCHEMA = 'dad.usageStats.v1';

export const DEFAULT_USAGE_STATS_RETENTION_DAYS = 14;
const DEFAULT_MAX_DOMAINS_PER_DAY = 80;
const DEFAULT_MAX_CONTEXTS = 160;
const CONTEXT_STALE_MS = 20 * 60 * 1000;

const TEXT_KEYS = ['sampleLength', 'wordCount', 'emojiCount'];
const MEDIA_KEYS = ['imageCount', 'videoCount', 'audioCount', 'gifCount', 'iframeCount'];
const INTERACTION_KEYS = ['linkCount', 'buttonCount', 'inputCount', 'formCount'];
const STRUCTURE_KEYS = ['elementCount', 'feedCount'];

function getNow(options = {}) {
  return typeof options.now === 'function' ? Number(options.now()) : Date.now();
}

function toTimestamp(value) {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) ? timestamp : null;
}

function toIsoString(value) {
  return Number.isFinite(value) ? new Date(value).toISOString() : null;
}

function getDayKey(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}

function sanitizeCount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
}

function sanitizeMs(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
}

function sanitizeRetentionDays(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return DEFAULT_USAGE_STATS_RETENTION_DAYS;
  }

  return Math.min(Math.max(Math.round(number), 1), 90);
}

function normalizeHostname(value) {
  const rawValue = String(value || '').trim().toLowerCase();
  if (!rawValue) {
    return '';
  }

  try {
    const url = rawValue.includes('://') ? rawValue : `https://${rawValue}`;
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch (error) {
    return rawValue
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split(/[/?#]/)[0]
      .trim();
  }
}

function getSignalHostname(signal = {}) {
  return normalizeHostname(signal.hostname || signal.url);
}

function createMetricBucket(keys, values = {}) {
  return Object.fromEntries(keys.map(key => [key, sanitizeCount(values[key])]));
}

function mergeMetricMax(target = {}, source = {}, keys = []) {
  return Object.fromEntries(keys.map(key => [
    key,
    Math.max(sanitizeCount(target[key]), sanitizeCount(source[key]))
  ]));
}

function createEmptyDomain(hostname) {
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

function normalizeDomainEntry(entry = {}) {
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

function normalizeContextEntry(entry = {}) {
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

function sortDomains(domains) {
  return domains.sort((first, second) => (
    second.activeMs - first.activeMs
      || second.visits - first.visits
      || second.samples - first.samples
      || (toTimestamp(second.lastSeenAt) || 0) - (toTimestamp(first.lastSeenAt) || 0)
      || first.hostname.localeCompare(second.hostname)
  ));
}

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

function getContextId(options = {}, hostname) {
  if (typeof options.documentId === 'string' && options.documentId) {
    return `document:${options.documentId}`;
  }

  if (Number.isFinite(Number(options.tabId))) {
    const frameId = Number.isFinite(Number(options.frameId)) ? Number(options.frameId) : 0;
    return `tab:${Number(options.tabId)}:${frameId}`;
  }

  return `host:${hostname}`;
}

function isNewVisit(context, hostname, pageAgeMs, now) {
  if (!context || context.hostname !== hostname) {
    return true;
  }

  const lastSeenAt = toTimestamp(context.lastSeenAt);
  if (Number.isFinite(lastSeenAt) && now - lastSeenAt > CONTEXT_STALE_MS) {
    return true;
  }

  return pageAgeMs + 1000 < sanitizeMs(context.lastPageAgeMs);
}

function getDomainEntry(day, hostname) {
  let domain = day.domains.find(item => item.hostname === hostname);
  if (!domain) {
    domain = createEmptyDomain(hostname);
    day.domains.push(domain);
  }

  return domain;
}

function aggregateDomain(target, source) {
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

export function recordUsagePageSignal(state = {}, signal = {}, options = {}) {
  const now = getNow(options);
  const hostname = getSignalHostname(signal);
  if (!hostname) {
    return normalizeUsageStats(state, { ...options, now: () => now });
  }

  const nextState = normalizeUsageStats(state, { ...options, now: () => now });
  const dayKey = getDayKey(now);
  let day = nextState.days.find(item => item.dayKey === dayKey);
  if (!day) {
    day = {
      dayKey,
      samples: 0,
      visits: 0,
      activeMs: 0,
      dwellMs: 0,
      tabMax: 0,
      windowMax: 0,
      updatedAt: new Date(now).toISOString(),
      domains: []
    };
    nextState.days.push(day);
  }

  const activity = signal.activity || {};
  const pageAgeMs = sanitizeMs(activity.pageAgeMs);
  const activePageMs = sanitizeMs(activity.activePageMs);
  const contextId = getContextId(options, hostname);
  const context = nextState.contexts.find(item => item.id === contextId) || null;
  const newVisit = isNewVisit(context, hostname, pageAgeMs, now);
  const activeDeltaMs = newVisit ? activePageMs : Math.max(0, activePageMs - sanitizeMs(context.lastActivePageMs));
  const dwellDeltaMs = newVisit ? pageAgeMs : Math.max(0, pageAgeMs - sanitizeMs(context.lastPageAgeMs));
  const tabCount = sanitizeCount(options.tabCount);
  const windowCount = sanitizeCount(options.windowCount);
  const domain = getDomainEntry(day, hostname);

  domain.samples += 1;
  domain.visits += newVisit ? 1 : 0;
  domain.activeMs += activeDeltaMs;
  domain.dwellMs += dwellDeltaMs;
  domain.tabMax = Math.max(domain.tabMax, tabCount);
  domain.windowMax = Math.max(domain.windowMax, windowCount);
  domain.lastSeenAt = new Date(now).toISOString();
  domain.textMax = mergeMetricMax(domain.textMax, signal.text, TEXT_KEYS);
  domain.mediaMax = mergeMetricMax(domain.mediaMax, signal.media, MEDIA_KEYS);
  domain.interactionMax = mergeMetricMax(domain.interactionMax, signal.interaction, INTERACTION_KEYS);
  domain.structureMax = mergeMetricMax(domain.structureMax, signal.structure, STRUCTURE_KEYS);

  day.samples += 1;
  day.visits += newVisit ? 1 : 0;
  day.activeMs += activeDeltaMs;
  day.dwellMs += dwellDeltaMs;
  day.tabMax = Math.max(day.tabMax, tabCount);
  day.windowMax = Math.max(day.windowMax, windowCount);
  day.updatedAt = new Date(now).toISOString();
  day.domains = sortDomains(day.domains).slice(0, Number(options.maxDomainsPerDay || DEFAULT_MAX_DOMAINS_PER_DAY));

  const nextContext = {
    id: contextId,
    hostname,
    lastSeenAt: new Date(now).toISOString(),
    lastPageAgeMs: pageAgeMs,
    lastActivePageMs: activePageMs
  };
  nextState.contexts = [
    nextContext,
    ...nextState.contexts.filter(item => item.id !== contextId)
  ].slice(0, Number(options.maxContexts || DEFAULT_MAX_CONTEXTS));
  nextState.updatedAt = new Date(now).toISOString();

  return normalizeUsageStats(nextState, { ...options, now: () => now });
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
