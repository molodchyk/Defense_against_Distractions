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
  mergeOutcomeTextMax,
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

function createEmptyDay(dayKey, now) {
  return {
    dayKey,
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
    updatedAt: new Date(now).toISOString(),
    domains: []
  };
}

function getSignalOutcome(signal = {}) {
  return signal.protection?.blocked === true || signal.blocked === true ? 'blocked' : 'allowed';
}

function getSignalWordCount(signal = {}) {
  return sanitizeCount(signal.text?.wordCount);
}

function addSignedCount(value, delta) {
  const current = sanitizeCount(value);
  const change = Number(delta);
  if (!Number.isFinite(change)) {
    return current;
  }

  return Math.max(0, Math.round(current + change));
}

function addOutcomeObservation(target, outcome, { newVisit, activeDeltaMs, dwellDeltaMs, wordDelta }) {
  target[`${outcome}Samples`] += 1;
  target[`${outcome}Visits`] += newVisit ? 1 : 0;
  target[`${outcome}ActiveMs`] += activeDeltaMs;
  target[`${outcome}DwellMs`] += dwellDeltaMs;
  target[`${outcome}WordCount`] = addSignedCount(target[`${outcome}WordCount`], wordDelta);
}

function addOutcomeTextObservation(domain, outcome, signal = {}) {
  const key = `${outcome}TextMax`;
  domain[key] = mergeOutcomeTextMax(domain[key], signal.text);
}

function moveAllowedVisitStatsToBlocked(target, activeMs, dwellMs, wordCount) {
  const activeToMove = Math.min(sanitizeMs(activeMs), sanitizeMs(target.allowedActiveMs));
  const dwellToMove = Math.min(sanitizeMs(dwellMs), sanitizeMs(target.allowedDwellMs));
  const wordsToMove = Math.min(sanitizeCount(wordCount), sanitizeCount(target.allowedWordCount));

  target.allowedActiveMs = Math.max(0, sanitizeMs(target.allowedActiveMs) - activeToMove);
  target.allowedDwellMs = Math.max(0, sanitizeMs(target.allowedDwellMs) - dwellToMove);
  target.allowedWordCount = Math.max(0, sanitizeCount(target.allowedWordCount) - wordsToMove);
  target.blockedActiveMs += activeToMove;
  target.blockedDwellMs += dwellToMove;
  target.blockedWordCount += wordsToMove;

  if (sanitizeCount(target.allowedVisits) > 0) {
    target.allowedVisits -= 1;
    target.blockedVisits += 1;
  }
}

function shouldReclassifyAllowedVisit(context, outcome, newVisit, dayKey) {
  return Boolean(
    !newVisit
      && outcome === 'blocked'
      && context?.lastOutcome === 'allowed'
      && (!context.lastDayKey || context.lastDayKey === dayKey)
  );
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
    day = createEmptyDay(dayKey, now);
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
  const wordCount = getSignalWordCount(signal);
  const previousWordCount = newVisit ? 0 : sanitizeCount(context.lastWordCount);
  const wordDelta = Math.max(0, wordCount - previousWordCount);
  const tabCount = sanitizeCount(options.tabCount);
  const windowCount = sanitizeCount(options.windowCount);
  const domain = getDomainEntry(day, hostname);
  const outcome = getSignalOutcome(signal);
  const reclassifyAllowedVisit = shouldReclassifyAllowedVisit(context, outcome, newVisit, dayKey);

  if (reclassifyAllowedVisit) {
    moveAllowedVisitStatsToBlocked(domain, context.lastActivePageMs, context.lastPageAgeMs, previousWordCount);
    moveAllowedVisitStatsToBlocked(day, context.lastActivePageMs, context.lastPageAgeMs, previousWordCount);
  }

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
  addOutcomeObservation(domain, outcome, {
    newVisit: reclassifyAllowedVisit ? false : newVisit,
    activeDeltaMs,
    dwellDeltaMs,
    wordDelta
  });
  addOutcomeTextObservation(domain, outcome, signal);

  day.samples += 1;
  day.visits += newVisit ? 1 : 0;
  day.activeMs += activeDeltaMs;
  day.dwellMs += dwellDeltaMs;
  day.tabMax = Math.max(day.tabMax, tabCount);
  day.windowMax = Math.max(day.windowMax, windowCount);
  addOutcomeObservation(day, outcome, {
    newVisit: reclassifyAllowedVisit ? false : newVisit,
    activeDeltaMs,
    dwellDeltaMs,
    wordDelta
  });
  day.updatedAt = new Date(now).toISOString();
  day.domains = sortDomains(day.domains).slice(0, Number(options.maxDomainsPerDay || DEFAULT_MAX_DOMAINS_PER_DAY));

  const nextContext = {
    id: contextId,
    hostname,
    lastSeenAt: new Date(now).toISOString(),
    lastPageAgeMs: pageAgeMs,
    lastActivePageMs: activePageMs,
    lastWordCount: Math.max(previousWordCount, wordCount),
    lastOutcome: outcome,
    lastDayKey: dayKey
  };
  nextState.contexts = [
    nextContext,
    ...nextState.contexts.filter(item => item.id !== contextId)
  ].slice(0, Number(options.maxContexts || DEFAULT_MAX_CONTEXTS));
  nextState.updatedAt = new Date(now).toISOString();

  return normalizeUsageStats(nextState, { ...options, now: () => now });
}
