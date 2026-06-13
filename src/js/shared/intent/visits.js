// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk


import { normalizeIntentSettings } from './settings.js';
import { calculateIntentCoherence, getIntentRiskState } from './score/coherenceScore.js';
import {
  calculateSessionMetrics,
  calculateVisitSimilarity
} from './scoring.js';
import {
  normalizeComparableUrl,
  normalizeString,
  normalizeStringArray,
  normalizeTabId,
  normalizeTransitionQualifiers,
  normalizeTransitionType
} from './utils.js';

function normalizePressureCount(value) {
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0;
}

function normalizeTabActivity(activity = {}) {
  return {
    windowMs: normalizePressureCount(activity.windowMs),
    switchCount: normalizePressureCount(activity.switchCount),
    loopCount: normalizePressureCount(activity.loopCount),
    uniqueTabCount: normalizePressureCount(activity.uniqueTabCount),
    switchRatePerMinute: Number.isFinite(Number(activity.switchRatePerMinute))
      ? Math.max(0, Number(Number(activity.switchRatePerMinute).toFixed(3)))
      : 0,
    lastActivatedAt: normalizeString(activity.lastActivatedAt) || null
  };
}

export function createSession(signal, visit, now) {
  return {
    id: `intent-session-${now}`,
    originVisitId: visit.id,
    createdAt: new Date(now).toISOString(),
    lastActiveAt: new Date(now).toISOString(),
    origin: {
      url: signal.url,
      hostname: signal.hostname,
      title: signal.title,
      tokens: signal.tokens,
      metadataTokens: signal.metadataTokens,
      weightedMetadataTokens: signal.weightedMetadataTokens,
      textTokens: signal.textTokens
    },
    visits: [visit],
    metrics: calculateSessionMetrics([visit], visit),
    coherenceScore: 100,
    riskState: 'clear',
    firstDriftVisitId: null,
    lockedAt: null,
    driftDescendantAt: null
  };
}

export function shouldStartNewSession(state, activeSession, now, options) {
  if (!activeSession) {
    return true;
  }

  const lastActiveMs = Date.parse(activeSession.lastActiveAt || state.updatedAt || 0);
  if (!Number.isFinite(lastActiveMs)) {
    return false;
  }

  return now - lastActiveMs >= options.idleResetMs;
}

export function createVisit(signal, options, now) {
  return {
    id: `intent-visit-${now}-${Math.random().toString(36).slice(2, 8)}`,
    tabId: Number.isFinite(options.tabId) ? options.tabId : null,
    frameId: Number.isFinite(options.frameId) ? options.frameId : null,
    parentVisitId: options.parentVisitId || null,
    openerTabId: Number.isFinite(options.openerTabId) ? options.openerTabId : null,
    rootTabId: Number.isFinite(options.rootTabId) ? options.rootTabId : (Number.isFinite(options.tabId) ? options.tabId : null),
    driftDescendant: options.driftDescendant === true,
    transitionType: normalizeTransitionType(options.transitionType),
    transitionQualifiers: normalizeTransitionQualifiers(options.transitionQualifiers),
    transitionSource: normalizeString(options.transitionSource) || null,
    transitionUrl: normalizeString(options.transitionUrl) || null,
    transitionAt: normalizeString(options.transitionAt) || null,
    policy: {
      planIds: normalizeStringArray(options.planIds),
      planNames: normalizeStringArray(options.planNames),
      source: normalizeString(options.policySource) || null
    },
    tabPressure: {
      tabCount: normalizePressureCount(options.tabCount),
      windowCount: normalizePressureCount(options.windowCount)
    },
    tabActivity: normalizeTabActivity(options.tabActivity),
    url: signal.url,
    hostname: signal.hostname,
    title: signal.title,
    startedAt: new Date(now).toISOString(),
    dwellMs: signal.activity.pageAgeMs,
    activeMs: signal.activity.activePageMs,
    tokens: signal.tokens,
    metadataTokens: signal.metadataTokens,
    weightedMetadataTokens: signal.weightedMetadataTokens,
    textTokens: signal.textTokens,
    signals: {
      text: signal.text,
      media: signal.media,
      interaction: signal.interaction,
      structure: signal.structure,
      activity: signal.activity
    },
    metrics: {
      originSimilarity: 1,
      localSimilarity: 1
    }
  };
}

function getSessionTimestamp(session = {}) {
  const lastActiveAt = Date.parse(session.lastActiveAt || '');
  if (Number.isFinite(lastActiveAt)) {
    return lastActiveAt;
  }

  const createdAt = Date.parse(session.createdAt || '');
  return Number.isFinite(createdAt) ? createdAt : 0;
}

export function pruneSessionsByRetention(sessions = [], options = {}, now = Date.now()) {
  const retentionDays = normalizeIntentSettings(options.intentSettings).diagnosticsRetentionDays;
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
  const cutoff = now - retentionMs;
  return sessions.filter(session => getSessionTimestamp(session) >= cutoff);
}

export function updateSession(session, visit, options) {
  const visits = [...session.visits, visit].slice(-options.maxVisitsPerSession);
  const originVisit = {
    tokens: session.origin?.tokens || visits[0]?.tokens || [],
    metadataTokens: session.origin?.metadataTokens || visits[0]?.metadataTokens || session.origin?.tokens || [],
    weightedMetadataTokens: session.origin?.weightedMetadataTokens || visits[0]?.weightedMetadataTokens || [],
    textTokens: session.origin?.textTokens || visits[0]?.textTokens || []
  };
  const metrics = calculateSessionMetrics(visits, originVisit);
  const coherenceScore = calculateIntentCoherence(metrics);
  const riskState = getIntentRiskState(coherenceScore, options.intentSettings);
  const previousVisit = visits[visits.length - 2] || visit;

  visit.metrics = {
    originSimilarity: metrics.originSimilarity,
    localSimilarity: calculateVisitSimilarity(previousVisit, visit).similarity,
    textOriginSimilarity: metrics.textOriginSimilarity,
    textLocalSimilarity: metrics.textLocalSimilarity
  };

  return {
    ...session,
    lastActiveAt: visit.startedAt,
    visits,
    metrics,
    coherenceScore,
    riskState,
    lockedAt: session.lockedAt || (riskState === 'locked' ? visit.startedAt : null),
    driftDescendantAt: session.driftDescendantAt || (visit.driftDescendant ? visit.startedAt : null),
    firstDriftVisitId: session.firstDriftVisitId || (riskState === 'drift' || riskState === 'intervene' || riskState === 'locked'
      ? visit.id
      : null)
  };
}

export function getLatestVisitForTab(session = {}, tabId = null) {
  const normalizedSession = session && typeof session === 'object' ? session : {};
  const normalizedTabId = normalizeTabId(tabId);
  if (!Array.isArray(normalizedSession.visits) || !Number.isFinite(normalizedTabId)) {
    return null;
  }

  return [...normalizedSession.visits].reverse().find(visit => visit.tabId === normalizedTabId) || null;
}

export function getExactIntentSessionForTab(state = {}, tabId = null) {
  const normalizedTabId = normalizeTabId(tabId);
  if (!Array.isArray(state.sessions) || !Number.isFinite(normalizedTabId)) {
    return null;
  }

  return [...state.sessions].reverse().find(session => {
    return Array.isArray(session.visits) && session.visits.some(visit => visit.tabId === normalizedTabId);
  }) || null;
}

export function getLineageParentSession(state = {}, lineageEntry = null) {
  if (!lineageEntry?.parentSessionId || !Array.isArray(state.sessions)) {
    return null;
  }

  return state.sessions.find(session => session.id === lineageEntry.parentSessionId) || null;
}

export function getMatchingTransitionForSignal(lineageEntry = null, signal = {}) {
  if (!lineageEntry?.transitionType) {
    return {};
  }

  const transitionUrl = normalizeComparableUrl(lineageEntry.transitionUrl);
  const signalUrl = normalizeComparableUrl(signal.url);
  if (transitionUrl && signalUrl && transitionUrl !== signalUrl) {
    return {};
  }

  return {
    transitionType: lineageEntry.transitionType,
    transitionQualifiers: lineageEntry.transitionQualifiers || [],
    transitionSource: lineageEntry.transitionSource || null,
    transitionUrl: lineageEntry.transitionUrl || null,
    transitionAt: lineageEntry.transitionAt || null
  };
}
