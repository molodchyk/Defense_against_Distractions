// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  CONTEXT_STALE_MS,
  DEFAULT_MAX_CONTEXTS,
  DEFAULT_MAX_DOMAINS_PER_DAY,
  INTERACTION_KEYS,
  MEDIA_KEYS,
  STRUCTURE_KEYS,
  TEXT_KEYS
} from './constants.js';
import {
  createEmptyDomain,
  mergeMetricMax,
  sortDomains
} from './metrics.js';
import {
  normalizeUsageStats
} from './state.js';
import {
  getDayKey,
  getNow,
  getSignalHostname,
  sanitizeCount,
  sanitizeMs,
  toTimestamp
} from './utils.js';

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
