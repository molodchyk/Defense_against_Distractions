// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { clampNumber, normalizeString, normalizeTabId, parseTimestamp } from '../utils.js';

const RECOVERED_INTENT_RISK_STATES = new Set(['clear', 'watch']);

export function normalizeIntentFeedbackOutcome(outcome = null) {
  if (!outcome || typeof outcome !== 'object') {
    return null;
  }

  const observedAt = normalizeString(outcome.observedAt);
  if (!observedAt) {
    return null;
  }

  return {
    observedAt,
    sessionId: normalizeString(outcome.sessionId).slice(0, 120) || null,
    visitId: normalizeString(outcome.visitId).slice(0, 120) || null,
    tabId: normalizeTabId(outcome.tabId),
    riskState: normalizeString(outcome.riskState).slice(0, 32) || null,
    coherenceScore: clampNumber(outcome.coherenceScore, null, 0, 100),
    scoreDelta: clampNumber(outcome.scoreDelta, null, -100, 100),
    recovered: outcome.recovered === true,
    returnedToRecoveryHost: outcome.returnedToRecoveryHost === true
  };
}

function isFeedbackOutcomeCandidate(entry = {}, session = {}, visit = {}) {
  if (!entry.id || entry.outcome || !visit?.id) {
    return false;
  }

  const feedbackTabId = normalizeTabId(entry.tabId);
  const visitTabId = normalizeTabId(visit.tabId);
  const tabMatches = Number.isFinite(feedbackTabId) && Number.isFinite(visitTabId) && feedbackTabId === visitTabId;
  const sessionMatches = Boolean(entry.sessionId && session?.id && entry.sessionId === session.id);
  if (!tabMatches && !sessionMatches) {
    return false;
  }

  if (entry.visitId && entry.visitId === visit.id) {
    return false;
  }

  const recordedAt = parseTimestamp(entry.recordedAt);
  const observedAt = parseTimestamp(visit.startedAt);
  return recordedAt === null || observedAt === null || observedAt > recordedAt;
}

function createIntentFeedbackOutcome(entry = {}, session = {}, visit = {}, now = Date.now()) {
  const riskState = normalizeString(session?.riskState).slice(0, 32) || null;
  const coherenceScore = clampNumber(session?.coherenceScore, null, 0, 100);
  const baselineScore = clampNumber(entry.coherenceScore, null, 0, 100);
  const scoreDelta = Number.isFinite(coherenceScore) && Number.isFinite(baselineScore)
    ? Math.round(coherenceScore - baselineScore)
    : null;
  const visitHostname = normalizeString(visit?.hostname).slice(0, 120);
  const returnedToRecoveryHost = Boolean(entry.recoveryHostname && visitHostname && entry.recoveryHostname === visitHostname);

  return normalizeIntentFeedbackOutcome({
    observedAt: normalizeString(visit?.startedAt) || new Date(now).toISOString(),
    sessionId: session?.id,
    visitId: visit?.id,
    tabId: visit?.tabId,
    riskState,
    coherenceScore,
    scoreDelta,
    recovered: returnedToRecoveryHost || RECOVERED_INTENT_RISK_STATES.has(riskState) || coherenceScore >= 60,
    returnedToRecoveryHost
  });
}

export function annotateIntentFeedbackOutcome(entries = [], session = {}, visit = {}, options = {}) {
  const targetIndex = entries.findLastIndex(entry => isFeedbackOutcomeCandidate(entry, session, visit));
  if (targetIndex < 0) {
    return entries;
  }

  return entries.map((entry, index) => index === targetIndex
    ? { ...entry, outcome: createIntentFeedbackOutcome(entry, session, visit, options.nowMs) }
    : entry);
}
