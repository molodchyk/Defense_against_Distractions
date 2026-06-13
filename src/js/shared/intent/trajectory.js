// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk


import { DEFAULT_INTENT_OPTIONS, DEFAULT_INTENT_SETTINGS } from './constants.js';
import { normalizeIntentFeedbackEntry, recordIntentFeedbackOutcome } from './feedback.js';
import { normalizeIntentSettings } from './settings.js';
import { normalizeIntentNavigationTransition, normalizePageSignalForIntent } from './signals.js';
import {
  getIntentTabLineageEntry,
  normalizeIntentState,
  normalizeTabLineageEntry
} from './state.js';
import { calculateRecentTabActivity, recordTabActivationState } from './tabActivity.js';
import {
  getHostnameFromUrl,
  getTimestamp,
  normalizeString,
  normalizeTabId
} from './utils.js';
import {
  createSession,
  createVisit,
  getExactIntentSessionForTab,
  getLatestVisitForTab,
  getLineageParentSession,
  getMatchingTransitionForSignal,
  pruneSessionsByRetention,
  shouldStartNewSession,
  updateSession
} from './visits.js';

export function recordIntentPageVisit(currentState, rawSignal, options = {}) {
  const normalizedOptions = {
    ...DEFAULT_INTENT_OPTIONS,
    ...options,
    intentSettings: normalizeIntentSettings(options.intentSettings || DEFAULT_INTENT_SETTINGS)
  };
  const now = getTimestamp(normalizedOptions);
  const state = normalizeIntentState(currentState, now, normalizedOptions);
  const signal = normalizePageSignalForIntent(rawSignal, normalizedOptions);

  if (!signal.url && !signal.hostname) {
    return state;
  }

  const shouldIsolateTab = normalizedOptions.isolateTab === true && Number.isFinite(normalizedOptions.tabId);
  const tabLineageEntry = shouldIsolateTab ? null : getIntentTabLineageEntry(state, normalizedOptions.tabId);
  const exactTabSession = shouldIsolateTab ? null : getExactIntentSessionForTab(state, normalizedOptions.tabId);
  const lineageParentSession = shouldIsolateTab ? null : getLineageParentSession(state, tabLineageEntry);
  const activeSession = exactTabSession
    || lineageParentSession
    || state.sessions.find(session => session.id === state.activeSessionId)
    || state.sessions.at(-1);
  const lineageOptions = {
    ...normalizedOptions,
    parentVisitId: shouldIsolateTab ? null : normalizedOptions.parentVisitId || tabLineageEntry?.parentVisitId || null,
    openerTabId: shouldIsolateTab ? null : normalizedOptions.openerTabId ?? tabLineageEntry?.openerTabId ?? null,
    rootTabId: shouldIsolateTab ? normalizedOptions.tabId : normalizedOptions.rootTabId ?? tabLineageEntry?.rootTabId ?? normalizedOptions.tabId,
    ...(
      shouldIsolateTab
        ? {}
        : getMatchingTransitionForSignal(tabLineageEntry, signal)
    ),
    tabActivity: calculateRecentTabActivity(state.tabActivations, now, normalizedOptions),
    driftDescendant: shouldIsolateTab
      ? false
      : normalizedOptions.driftDescendant === true || tabLineageEntry?.driftDescendant === true
  };
  const visit = createVisit(signal, lineageOptions, now);
  let sessions;
  let activeSessionId;

  if (shouldIsolateTab || normalizedOptions.forceNewSession || shouldStartNewSession(state, activeSession, now, normalizedOptions)) {
    const session = createSession(signal, visit, now);
    sessions = [...state.sessions, session];
    activeSessionId = session.id;
  } else {
    const targetSessionId = activeSession.id;
    sessions = state.sessions.map(session => {
      if (session.id !== targetSessionId) {
        return session;
      }

      return updateSession(session, visit, normalizedOptions);
    });
    activeSessionId = targetSessionId;
  }

  sessions = pruneSessionsByRetention(sessions, normalizedOptions, now).slice(-normalizedOptions.maxSessions);

  const nextState = {
    ...state,
    activeTabId: Number.isFinite(normalizedOptions.tabId) ? normalizedOptions.tabId : state.activeTabId,
    activeSessionId,
    updatedAt: new Date(now).toISOString(),
    sessions,
    tabLineage: shouldIsolateTab
      ? state.tabLineage.filter(entry => entry.tabId !== normalizedOptions.tabId)
      : state.tabLineage
  };
  const outcomeSession = nextState.sessions.find(session => session.id === activeSessionId) || null;

  return {
    ...nextState,
    feedback: recordIntentFeedbackOutcome(nextState.feedback, outcomeSession, visit, {
      maxFeedbackEntries: normalizedOptions.maxFeedbackEntries,
      nowMs: now
    })
  };
}

export function recordIntentNavigationTransition(currentState, rawTransition = {}, options = {}) {
  const normalizedOptions = { ...DEFAULT_INTENT_OPTIONS, ...options };
  const now = getTimestamp(normalizedOptions);
  const state = normalizeIntentState(currentState, now, normalizedOptions);
  const transition = normalizeIntentNavigationTransition(rawTransition, normalizedOptions);

  if (!Number.isFinite(transition.tabId) || transition.frameId !== 0 || !transition.transitionType) {
    return state;
  }

  const existingLineage = getIntentTabLineageEntry(state, transition.tabId);
  const lineageEntry = normalizeTabLineageEntry({
    ...existingLineage,
    tabId: transition.tabId,
    rootTabId: existingLineage?.rootTabId ?? transition.tabId,
    transitionType: transition.transitionType,
    transitionQualifiers: transition.transitionQualifiers,
    transitionSource: transition.transitionSource,
    transitionUrl: transition.url,
    transitionAt: transition.transitionAt,
    createdAt: existingLineage?.createdAt || transition.transitionAt,
    updatedAt: transition.transitionAt
  });

  return {
    ...state,
    updatedAt: new Date(now).toISOString(),
    tabLineage: [
      ...state.tabLineage.filter(entry => entry.tabId !== transition.tabId),
      lineageEntry
    ].filter(Boolean).slice(-normalizedOptions.maxTabLineageEntries)
  };
}

export function recordIntentTabActivation(currentState, tabId, options = {}) {
  const normalizedOptions = { ...DEFAULT_INTENT_OPTIONS, ...options };
  const now = getTimestamp(normalizedOptions);
  const state = normalizeIntentState(currentState, now, normalizedOptions);
  return recordTabActivationState(state, tabId, now, normalizedOptions);
}

function isVisitAtOrAfterDriftPoint(session = {}, visit = null) {
  if (!session?.firstDriftVisitId || !visit?.id || !Array.isArray(session.visits)) {
    return false;
  }

  const driftIndex = session.visits.findIndex(candidate => candidate.id === session.firstDriftVisitId);
  const visitIndex = session.visits.findIndex(candidate => candidate.id === visit.id);
  return driftIndex >= 0 && visitIndex >= driftIndex;
}

export function recordIntentTabCreated(currentState, tab = {}, options = {}) {
  const normalizedOptions = { ...DEFAULT_INTENT_OPTIONS, ...options };
  const now = getTimestamp(normalizedOptions);
  const state = normalizeIntentState(currentState, now, normalizedOptions);
  const tabId = normalizeTabId(tab.tabId ?? tab.id);
  const openerTabId = normalizeTabId(tab.openerTabId);

  if (!Number.isFinite(tabId)) {
    return state;
  }

  const openerLineage = getIntentTabLineageEntry(state, openerTabId);
  const parentSession = getExactIntentSessionForTab(state, openerTabId) || getLineageParentSession(state, openerLineage);
  const parentVisit = getLatestVisitForTab(parentSession, openerTabId)
    || (Array.isArray(parentSession?.visits) ? parentSession.visits.at(-1) : null);
  const rootTabId = Number.isFinite(openerLineage?.rootTabId)
    ? openerLineage.rootTabId
    : (Number.isFinite(openerTabId) ? openerTabId : tabId);
  const lineageEntry = normalizeTabLineageEntry({
    tabId,
    openerTabId,
    rootTabId,
    parentSessionId: parentSession?.id || null,
    parentVisitId: parentVisit?.id || null,
    driftDescendant: Boolean(
      openerLineage?.driftDescendant
        || parentSession?.riskState === 'drift'
        || parentSession?.riskState === 'intervene'
        || parentSession?.riskState === 'locked'
        || isVisitAtOrAfterDriftPoint(parentSession, parentVisit)
    ),
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString()
  });

  const nextLineage = [
    ...state.tabLineage.filter(entry => entry.tabId !== tabId),
    lineageEntry
  ].filter(Boolean).slice(-normalizedOptions.maxTabLineageEntries);

  return {
    ...state,
    activeTabId: tab.active === true ? tabId : state.activeTabId,
    updatedAt: new Date(now).toISOString(),
    tabLineage: nextLineage
  };
}

export function recordIntentTabRemoved(currentState, tabId, options = {}) {
  const normalizedOptions = { ...DEFAULT_INTENT_OPTIONS, ...options };
  const now = getTimestamp(normalizedOptions);
  const state = normalizeIntentState(currentState, now, normalizedOptions);
  const normalizedTabId = normalizeTabId(tabId);

  if (!Number.isFinite(normalizedTabId)) {
    return state;
  }

  return {
    ...state,
    activeTabId: state.activeTabId === normalizedTabId ? null : state.activeTabId,
    updatedAt: new Date(now).toISOString(),
    tabLineage: state.tabLineage.filter(entry => entry.tabId !== normalizedTabId)
  };
}

export function getActiveIntentSession(state = {}) {
  if (!Array.isArray(state.sessions)) {
    return null;
  }

  return state.sessions.find(session => session.id === state.activeSessionId) || state.sessions.at(-1) || null;
}

export function getIntentSessionForTab(state = {}, tabId = null) {
  const normalizedTabId = normalizeTabId(tabId);
  if (!Array.isArray(state.sessions) || !Number.isFinite(normalizedTabId)) {
    return getActiveIntentSession(state);
  }

  const exactSession = getExactIntentSessionForTab(state, normalizedTabId);
  if (exactSession) {
    return exactSession;
  }

  const lineageParentSession = getLineageParentSession(state, getIntentTabLineageEntry(state, normalizedTabId));
  return lineageParentSession || getActiveIntentSession(state);
}

export function recordIntentFeedback(currentState, rawFeedback = {}, options = {}) {
  const normalizedOptions = { ...DEFAULT_INTENT_OPTIONS, ...options };
  const now = getTimestamp(normalizedOptions);
  const state = normalizeIntentState(currentState, now, normalizedOptions);
  const tabId = normalizeTabId(rawFeedback.tabId ?? normalizedOptions.tabId);
  const activeSession = getIntentSessionForTab(state, tabId);
  const latestVisit = getLatestVisitForTab(activeSession, tabId)
    || (Array.isArray(activeSession?.visits) ? activeSession.visits.at(-1) : null);
  const recoveryHostname = getHostnameFromUrl(rawFeedback.recoveryUrl)
    || getHostnameFromUrl(rawFeedback.recoveryVisit?.url)
    || normalizeString(rawFeedback.recoveryVisit?.hostname);
  const currentHostname = normalizeString(rawFeedback.currentVisit?.hostname)
    || normalizeString(latestVisit?.hostname)
    || getHostnameFromUrl(rawFeedback.currentVisit?.url);
  const entry = normalizeIntentFeedbackEntry({
    id: `intent-feedback-${now}-${Math.random().toString(36).slice(2, 8)}`,
    recordedAt: new Date(now).toISOString(),
    action: rawFeedback.action,
    interventionId: rawFeedback.interventionId,
    sessionId: rawFeedback.sessionId || activeSession?.id,
    visitId: rawFeedback.visitId || rawFeedback.currentVisit?.id || latestVisit?.id,
    tabId,
    riskState: rawFeedback.riskState || activeSession?.riskState,
    coherenceScore: rawFeedback.coherenceScore ?? activeSession?.coherenceScore,
    policyAction: rawFeedback.policyAction || rawFeedback.decisionAction,
    reason: rawFeedback.reason,
    currentHostname,
    recoveryHostname
  });

  return {
    ...state,
    updatedAt: new Date(now).toISOString(),
    feedback: [...state.feedback, entry].slice(-normalizedOptions.maxFeedbackEntries)
  };
}
