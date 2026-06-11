// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk


import {
  DEFAULT_INTENT_CHAIN_BLOCK_COOLDOWN_MS,
  DEFAULT_INTENT_OPTIONS,
  DEFAULT_INTENT_SETTINGS,
  INTENT_INTERVENTION_ACTIONS,
  INTENT_INTERVENTION_RISK_STATES
} from './constants.js';
import { getIntentRiskState } from './scoring.js';
import { normalizeIntentSettings } from './settings.js';
import { clampNumber, getTimestamp, normalizeString, parseTimestamp } from './utils.js';

export function getLastCoherentIntentVisit(session = {}) {
  const normalizedSession = session && typeof session === 'object' ? session : {};
  const visits = Array.isArray(normalizedSession.visits) ? normalizedSession.visits : [];
  if (visits.length === 0) {
    return null;
  }

  const driftIndex = normalizedSession.firstDriftVisitId
    ? visits.findIndex(visit => visit.id === normalizedSession.firstDriftVisitId)
    : -1;

  if (driftIndex > 0) {
    return visits[driftIndex - 1];
  }

  return visits[0];
}

export function createIntentInterventionId(session = {}) {
  const normalizedSession = session && typeof session === 'object' ? session : {};
  const visits = Array.isArray(normalizedSession.visits) ? normalizedSession.visits : [];
  const latestVisit = visits[visits.length - 1];
  return [
    normalizedSession.id || 'intent-session',
    normalizedSession.riskState || 'unknown',
    normalizedSession.firstDriftVisitId || latestVisit?.id || 'no-visit'
  ].join(':');
}

export function getIntentReasonLines(session = {}) {
  const normalizedSession = session && typeof session === 'object' ? session : {};
  const metrics = normalizedSession.metrics || {};
  const reasons = [];

  if (Number(metrics.originSimilarity ?? 1) < 0.35) {
    reasons.push('Low overlap with the session origin');
  }

  if (metrics.textOriginSimilarity !== null && Number(metrics.textOriginSimilarity ?? 1) < 0.25) {
    reasons.push('Low visible-text topic overlap with the origin');
  }

  if (Number(metrics.localSimilarity ?? 1) < 0.35) {
    reasons.push('Abrupt shift from the previous page');
  }

  if (Number(metrics.passiveMediaLoad || 0) >= 0.55) {
    reasons.push('High media or feed pressure');
  }

  if (Number(metrics.domainEntropy || 0) >= 0.6 && Number(metrics.visitCount || 0) >= 3) {
    reasons.push('Fragmented across several domains');
  }

  if (Number(metrics.domainChanges || 0) >= 3) {
    reasons.push('Repeated domain switching');
  }

  if (Number(metrics.tabCount || 0) >= 4) {
    reasons.push('Session branched across several tabs');
  }

  if (Number(metrics.branchCount || 0) >= 3) {
    reasons.push('Repeated child-tab branching');
  }

  if (metrics.latestIsDriftDescendant === true) {
    reasons.push('Current tab descends from an already drifted chain');
  }

  if (Number(metrics.linkDensity || 0) >= 0.45) {
    reasons.push('Very link-dense page');
  }

  if (Number(metrics.passiveInteractionLoad || 0) >= 0.55) {
    reasons.push('High passive scroll or click pressure');
  }

  if (Number(metrics.interactionVelocityLoad || 0) >= 0.55) {
    reasons.push('High interaction velocity');
  }

  if (Number(metrics.recommenderClickLoad || 0) >= 0.55) {
    reasons.push('Recommendation or feed clicks are driving the chain');
  }

  if (Number(metrics.redirectTransitionLoad || 0) >= 0.55) {
    reasons.push('Redirect-heavy navigation chain');
  }

  if (Number(metrics.passiveTimeLoad || 0) >= 0.55) {
    reasons.push('Sustained active time on a passive page');
  }

  return reasons.length > 0 ? reasons : ['Coherence score crossed the intervention threshold'];
}

export function getIntentInterventionDecision(session = {}, options = {}) {
  const normalizedOptions = { ...DEFAULT_INTENT_OPTIONS, ...options };
  const now = getTimestamp(normalizedOptions);
  const normalizedSession = session && typeof session === 'object' ? session : {};
  const rawSettings = options.intentSettings || DEFAULT_INTENT_SETTINGS;
  const settings = {
    ...normalizeIntentSettings(rawSettings),
    calibration: rawSettings.calibration || null
  };
  const visits = Array.isArray(normalizedSession.visits) ? normalizedSession.visits : [];
  const latestVisit = visits[visits.length - 1] || null;
  const driftVisit = normalizedSession.firstDriftVisitId
    ? visits.find(visit => visit.id === normalizedSession.firstDriftVisitId) || null
    : null;
  const recoveryVisit = getLastCoherentIntentVisit(normalizedSession);
  const riskStates = Array.isArray(options.riskStates) && options.riskStates.length > 0
    ? options.riskStates
    : INTENT_INTERVENTION_RISK_STATES;
  const riskState = Number.isFinite(normalizedSession.coherenceScore)
    ? getIntentRiskState(normalizedSession.coherenceScore, settings)
    : String(normalizedSession.riskState || 'clear');
  const shouldIntervene = Boolean(
    settings.enabled
      && latestVisit
      && recoveryVisit
      && riskStates.includes(riskState)
      && latestVisit.url
      && recoveryVisit.url
      && latestVisit.url !== recoveryVisit.url
  );
  const chainBlockActive = Boolean(
    shouldIntervene
      && settings.action === INTENT_INTERVENTION_ACTIONS.BLOCK
      && (riskState === 'locked' || latestVisit?.driftDescendant === true)
  );
  const chainBlockMode = chainBlockActive
    ? (latestVisit?.driftDescendant === true ? 'driftDescendant' : 'lockedChain')
    : 'none';
  const chainBlockReason = chainBlockMode === 'driftDescendant'
    ? 'Current tab descends from a drifted chain'
    : (chainBlockMode === 'lockedChain' ? 'Session crossed the locked threshold' : '');
  const chainBlockStartedAtMs = chainBlockMode === 'driftDescendant'
    ? parseTimestamp(normalizedSession.driftDescendantAt) ?? parseTimestamp(latestVisit?.startedAt) ?? now
    : (chainBlockMode === 'lockedChain'
        ? parseTimestamp(normalizedSession.lockedAt) ?? parseTimestamp(latestVisit?.startedAt) ?? now
        : null);
  const chainBlockCooldownMs = chainBlockActive
    ? clampNumber(normalizedOptions.chainBlockCooldownMs, DEFAULT_INTENT_CHAIN_BLOCK_COOLDOWN_MS, 0, 10 * 60 * 1000)
    : 0;
  const cooldownEndsAtMs = chainBlockActive && chainBlockStartedAtMs !== null
    ? chainBlockStartedAtMs + chainBlockCooldownMs
    : null;
  const cooldownRemainingMs = cooldownEndsAtMs === null ? 0 : Math.max(0, cooldownEndsAtMs - now);
  const reasonLines = getIntentReasonLines(session);
  const decisionReasonLines = chainBlockActive && !reasonLines.includes(chainBlockReason)
    ? [chainBlockReason, ...reasonLines]
    : reasonLines;

  return {
    shouldIntervene,
    interventionId: createIntentInterventionId(normalizedSession),
    sessionId: normalizedSession.id || null,
    riskState,
    action: settings.action,
    settings,
    coherenceScore: Number.isFinite(normalizedSession.coherenceScore) ? normalizedSession.coherenceScore : null,
    origin: normalizedSession.origin || null,
    currentVisit: latestVisit,
    driftVisit,
    recoveryVisit,
    recoveryUrl: recoveryVisit?.url || '',
    hardBlocked: chainBlockActive,
    chainBlock: {
      active: chainBlockActive,
      mode: chainBlockMode,
      reason: chainBlockReason,
      firstDriftVisitId: normalizedSession.firstDriftVisitId || null,
      driftVisitId: driftVisit?.id || null,
      currentVisitId: latestVisit?.id || null,
      recoveryVisitId: recoveryVisit?.id || null,
      driftDescendant: latestVisit?.driftDescendant === true,
      startedAt: chainBlockStartedAtMs === null ? null : new Date(chainBlockStartedAtMs).toISOString(),
      cooldownMs: chainBlockCooldownMs,
      cooldownEndsAt: cooldownEndsAtMs === null ? null : new Date(cooldownEndsAtMs).toISOString(),
      cooldownRemainingMs,
      cooldownActive: cooldownRemainingMs > 0
    },
    reasonLines: decisionReasonLines
  };
}