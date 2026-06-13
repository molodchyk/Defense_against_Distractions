// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk


import { DEFAULT_INTENT_OPTIONS } from './constants.js';
import { normalizeIntentFeedback } from './feedback.js';
import {
  normalizeString,
  normalizeTabId,
  normalizeTransitionQualifiers,
  normalizeTransitionType,
  getTimestamp,
  parseTimestamp
} from './utils.js';

export function createIntentTrajectoryState(now = Date.now()) {
  return {
    version: 1,
    activeTabId: null,
    activeSessionId: null,
    updatedAt: new Date(now).toISOString(),
    sessions: [],
    tabLineage: [],
    tabActivations: [],
    feedback: []
  };
}

export function normalizeTabLineageEntry(entry = {}) {
  const tabId = normalizeTabId(entry.tabId);
  if (!Number.isFinite(tabId)) {
    return null;
  }

  const openerTabId = normalizeTabId(entry.openerTabId);
  const rootTabId = normalizeTabId(entry.rootTabId);

  return {
    tabId,
    openerTabId,
    rootTabId: Number.isFinite(rootTabId) ? rootTabId : tabId,
    parentSessionId: typeof entry.parentSessionId === 'string' && entry.parentSessionId ? entry.parentSessionId : null,
    parentVisitId: typeof entry.parentVisitId === 'string' && entry.parentVisitId ? entry.parentVisitId : null,
    driftDescendant: entry.driftDescendant === true,
    transitionType: normalizeTransitionType(entry.transitionType),
    transitionQualifiers: normalizeTransitionQualifiers(entry.transitionQualifiers),
    transitionSource: normalizeString(entry.transitionSource) || null,
    transitionUrl: normalizeString(entry.transitionUrl) || null,
    transitionAt: normalizeString(entry.transitionAt) || null,
    createdAt: normalizeString(entry.createdAt) || null,
    updatedAt: normalizeString(entry.updatedAt) || normalizeString(entry.createdAt) || null
  };
}

export function normalizeTabLineage(lineage = [], maxEntries = DEFAULT_INTENT_OPTIONS.maxTabLineageEntries) {
  return Array.isArray(lineage)
    ? lineage
      .map(normalizeTabLineageEntry)
      .filter(Boolean)
      .slice(-maxEntries)
    : [];
}

export function normalizeTabActivationEntry(entry = {}) {
  const tabId = normalizeTabId(entry.tabId);
  const activatedAt = normalizeString(entry.activatedAt);

  if (!Number.isFinite(tabId) || parseTimestamp(activatedAt) === null) {
    return null;
  }

  return {
    tabId,
    sessionId: typeof entry.sessionId === 'string' && entry.sessionId ? entry.sessionId : null,
    activatedAt
  };
}

export function normalizeTabActivations(
  activations = [],
  maxEntries = DEFAULT_INTENT_OPTIONS.maxTabActivationEntries
) {
  return Array.isArray(activations)
    ? activations
      .map(normalizeTabActivationEntry)
      .filter(Boolean)
      .slice(-maxEntries)
    : [];
}

export function normalizeIntentState(currentState, now, options = {}) {
  const baseState = currentState && typeof currentState === 'object'
    ? currentState
    : createIntentTrajectoryState(now);

  return {
    ...baseState,
    activeTabId: normalizeTabId(baseState.activeTabId),
    activeSessionId: typeof baseState.activeSessionId === 'string' && baseState.activeSessionId ? baseState.activeSessionId : null,
    updatedAt: normalizeString(baseState.updatedAt) || new Date(now).toISOString(),
    sessions: Array.isArray(baseState.sessions) ? [...baseState.sessions] : [],
    tabLineage: normalizeTabLineage(baseState.tabLineage, options.maxTabLineageEntries),
    tabActivations: normalizeTabActivations(baseState.tabActivations, options.maxTabActivationEntries),
    feedback: normalizeIntentFeedback(baseState.feedback, options.maxFeedbackEntries)
  };
}

export function getIntentTabLineageEntry(state = {}, tabId = null) {
  const normalizedTabId = normalizeTabId(tabId);
  if (!Number.isFinite(normalizedTabId)) {
    return null;
  }

  return normalizeTabLineage(state.tabLineage).find(entry => entry.tabId === normalizedTabId) || null;
}

export function getIntentDriftDescendantTabIds(state = {}, options = {}) {
  const lineage = normalizeTabLineage(state.tabLineage, options.maxTabLineageEntries);
  const currentTabId = normalizeTabId(options.currentTabId ?? options.tabId);
  const currentLineage = Number.isFinite(currentTabId)
    ? lineage.find(entry => entry.tabId === currentTabId)
    : null;
  const explicitRootTabId = normalizeTabId(options.rootTabId);
  const rootTabId = Number.isFinite(explicitRootTabId)
    ? explicitRootTabId
    : currentLineage?.rootTabId ?? (Number.isFinite(currentTabId) ? currentTabId : null);
  const includeCurrent = options.includeCurrent === true;
  const seenTabIds = new Set();

  if (!Number.isFinite(rootTabId)) {
    return [];
  }

  return lineage
    .filter(entry => {
      if (!entry.driftDescendant || !Number.isFinite(entry.tabId)) {
        return false;
      }

      if (!includeCurrent && Number.isFinite(currentTabId) && entry.tabId === currentTabId) {
        return false;
      }

      if (Number.isFinite(rootTabId) && entry.rootTabId !== rootTabId) {
        return false;
      }

      if (seenTabIds.has(entry.tabId)) {
        return false;
      }

      seenTabIds.add(entry.tabId);
      return true;
    })
    .map(entry => entry.tabId);
}

export function getIntentChainReturnTabIds(state = {}, options = {}) {
  const currentTabId = normalizeTabId(options.currentTabId ?? options.tabId);
  if (!Number.isFinite(currentTabId)) {
    return [];
  }

  const descendantTabIds = getIntentDriftDescendantTabIds(state, {
    ...options,
    currentTabId,
    includeCurrent: false
  });

  return [currentTabId, ...descendantTabIds].filter((tabId, index, tabIds) => tabIds.indexOf(tabId) === index);
}

export function detachIntentTabLineageEntries(currentState = {}, tabIds = [], options = {}) {
  const targetTabIds = new Set(
    (Array.isArray(tabIds) ? tabIds : [tabIds])
      .map(normalizeTabId)
      .filter(Number.isFinite)
  );
  const now = getTimestamp({ ...DEFAULT_INTENT_OPTIONS, ...options });
  const state = normalizeIntentState(currentState, now, options);

  if (targetTabIds.size === 0) {
    return state;
  }

  return {
    ...state,
    updatedAt: new Date(now).toISOString(),
    tabLineage: state.tabLineage.filter(entry => !targetTabIds.has(entry.tabId))
  };
}
