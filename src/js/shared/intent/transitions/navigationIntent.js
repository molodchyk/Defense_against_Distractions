// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { clamp } from '../utils.js';

const RECENT_TRANSITION_WINDOW = 6;
const DIRECT_TRANSITION_TYPES = new Set([
  'typed',
  'auto_bookmark',
  'form_submit',
  'keyword',
  'keyword_generated'
]);

export function isDirectNavigationTransition(visit = {}) {
  const transitionType = String(visit.transitionType || '');
  const qualifiers = Array.isArray(visit.transitionQualifiers) ? visit.transitionQualifiers : [];
  return DIRECT_TRANSITION_TYPES.has(transitionType) || qualifiers.includes('from_address_bar');
}

export function getTransitionAnchorStrength(visit = {}) {
  if (!isDirectNavigationTransition(visit)) {
    return 0;
  }

  if (visit.transitionType === 'auto_bookmark') {
    return 0.65;
  }

  return 1;
}

function getDirectNavigationContextPressure(metrics = {}) {
  return Math.max(
    Number(metrics.passiveMediaLoad || 0),
    Number(metrics.mediaPlaybackLoad || 0),
    Number(metrics.passiveInteractionLoad || 0),
    Number(metrics.recommenderClickLoad || 0),
    Number(metrics.feedCommentInteractionLoad || 0),
    Number(metrics.lowAgencyLoad || 0),
    Number(metrics.deliberateStalenessLoad || 0),
    Number(metrics.navigationLoopLoad || 0),
    Number(metrics.unanchoredSessionLoad || 0),
    Number(metrics.originDecayLoad || 0),
    Number(metrics.mediaChainLoad || 0)
  );
}

export function calculateNavigationIntentSignals(visits = [], contextMetrics = {}) {
  const normalizedVisits = Array.isArray(visits) ? visits : [];
  const latestVisit = normalizedVisits.at(-1);
  const recentVisits = normalizedVisits.slice(-RECENT_TRANSITION_WINDOW);
  const directNavigationCount = normalizedVisits.filter(isDirectNavigationTransition).length;
  const recentDirectNavigationCount = recentVisits.filter(isDirectNavigationTransition).length;
  const latestDirectNavigation = isDirectNavigationTransition(latestVisit);
  const contextPressure = getDirectNavigationContextPressure(contextMetrics);
  const directNavigationRecovery = latestDirectNavigation && latestVisit?.driftDescendant !== true
    ? clamp(1 - contextPressure, 0, 1)
    : 0;

  return {
    latestDirectNavigation,
    directNavigationCount,
    recentDirectNavigationCount,
    directNavigationRecovery: directNavigationRecovery < 0.05 ? 0 : directNavigationRecovery
  };
}

export function formatNavigationIntentMetrics(signals = {}) {
  return {
    latestDirectNavigation: signals.latestDirectNavigation === true,
    directNavigationCount: signals.directNavigationCount || 0,
    recentDirectNavigationCount: signals.recentDirectNavigationCount || 0,
    directNavigationRecovery: Number(Number(signals.directNavigationRecovery || 0).toFixed(3))
  };
}
