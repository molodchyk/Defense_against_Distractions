// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { clamp, parseTimestamp } from './utils.js';

const STALE_VISIT_GRACE_COUNT = 2;
const STALE_VISIT_WINDOW_COUNT = 3;
const STALE_TIME_GRACE_MS = 5 * 60 * 1000;
const STALE_TIME_WINDOW_MS = 15 * 60 * 1000;

function getVisitStartedMs(visit = {}) {
  return parseTimestamp(visit.startedAt) ?? null;
}

function hasSearchTokens(visit = {}) {
  return Array.isArray(visit.weightedMetadataTokens)
    && visit.weightedMetadataTokens.some(entry => entry?.source === 'search' && entry.token);
}

function hasInputOrEditActivity(visit = {}) {
  const activity = visit.signals?.activity || {};
  return Number(activity.inputEvents || 0) > 0
    || Number(activity.keyEvents || 0) > 0
    || Number(activity.activeInputMs || 0) >= 5000;
}

function hasPassiveSelectionPressure(visit = {}) {
  const activity = visit.signals?.activity || {};
  const media = visit.signals?.media || {};
  const structure = visit.signals?.structure || {};
  return Number(activity.recommenderClickEvents || 0) > 0
    || Number(activity.mediaPlaybackMs || 0) > 0
    || Number(activity.mediaPlayEvents || 0) > 0
    || Number(activity.mediaEndEvents || 0) > 0
    || Number(activity.mediaSourceChangeEvents || 0) > 0
    || Number(activity.scrollEvents || 0) >= 8
    || Number(activity.clickEvents || 0) >= 6
    || Number(media.videoCount || 0) > 0
    || Number(media.audioCount || 0) > 0
    || Number(media.gifCount || 0) > 0
    || Number(structure.feedCount || 0) > 0
    || Number(structure.recommendationRegionCount || 0) > 0
    || Number(structure.commentSectionCount || 0) > 0
    || Number(structure.shortFormMediaCount || 0) > 0;
}

function hasDeliberateAction(visit = {}) {
  return hasSearchTokens(visit) || hasInputOrEditActivity(visit);
}

export function calculateIntentTimingSignals(visits = []) {
  const normalizedVisits = Array.isArray(visits) ? visits : [];
  const latestVisit = normalizedVisits.at(-1) || null;
  const latestStartedMs = getVisitStartedMs(latestVisit);
  const originStartedMs = getVisitStartedMs(normalizedVisits[0]);
  const sessionAgeMs = latestStartedMs !== null && originStartedMs !== null
    ? Math.max(0, latestStartedMs - originStartedMs)
    : 0;
  let lastDeliberateIndex = -1;
  let lastDeliberateAtMs = null;

  normalizedVisits.forEach((visit, index) => {
    if (!hasDeliberateAction(visit)) {
      return;
    }

    lastDeliberateIndex = index;
    lastDeliberateAtMs = getVisitStartedMs(visit);
  });

  const visitsSinceDeliberateAction = lastDeliberateIndex >= 0
    ? Math.max(0, normalizedVisits.length - lastDeliberateIndex - 1)
    : normalizedVisits.length;
  const deliberateGapMs = latestStartedMs !== null && lastDeliberateAtMs !== null
    ? Math.max(0, latestStartedMs - lastDeliberateAtMs)
    : sessionAgeMs;
  const visitsAfterDeliberate = lastDeliberateIndex >= 0
    ? normalizedVisits.slice(lastDeliberateIndex + 1)
    : normalizedVisits;
  const passiveVisitsSinceDeliberate = visitsAfterDeliberate.filter(hasPassiveSelectionPressure).length;
  const passiveShareSinceDeliberate = visitsSinceDeliberateAction > 0
    ? passiveVisitsSinceDeliberate / visitsSinceDeliberateAction
    : 0;
  const passiveWeight = clamp((passiveShareSinceDeliberate - 0.4) / 0.6, 0, 1);
  const staleVisitLoad = clamp(
    (visitsSinceDeliberateAction - STALE_VISIT_GRACE_COUNT) / STALE_VISIT_WINDOW_COUNT,
    0,
    1
  );
  const staleTimeLoad = clamp(
    (deliberateGapMs - STALE_TIME_GRACE_MS) / STALE_TIME_WINDOW_MS,
    0,
    1
  );
  const deliberateStalenessLoad = normalizedVisits.length >= 4
    ? clamp((staleVisitLoad * 0.6 + staleTimeLoad * 0.2 + passiveWeight * 0.2) * passiveWeight, 0, 1)
    : 0;

  return {
    sessionAgeMs,
    deliberateGapMs,
    visitsSinceDeliberateAction,
    passiveVisitsSinceDeliberate,
    passiveShareSinceDeliberate,
    deliberateStalenessLoad
  };
}

export function calculateLongSessionLoad(durationTotals = {}, contextMetrics = {}) {
  const activeMinutes = Math.max(0, Number(durationTotals.activeMs || 0)) / (60 * 1000);
  const dwellMinutes = Math.max(0, Number(durationTotals.dwellMs || 0)) / (60 * 1000);
  const durationLoad = Math.max(
    clamp((activeMinutes - 15) / 45, 0, 1),
    clamp((dwellMinutes - 30) / 90, 0, 1)
  );
  if (durationLoad <= 0) return 0;

  const contextLoad = Math.max(
    Number(contextMetrics.passiveMediaLoad || 0),
    Number(contextMetrics.mediaPlaybackLoad || 0),
    Number(contextMetrics.passiveInteractionLoad || 0),
    Number(contextMetrics.passiveTimeLoad || 0),
    Number(contextMetrics.recommenderClickLoad || 0),
    Number(contextMetrics.feedCommentInteractionLoad || 0),
    Number(contextMetrics.lowAgencyLoad || 0),
    Number(contextMetrics.deliberateStalenessLoad || 0),
    Number(contextMetrics.navigationLoopLoad || 0),
    Number(contextMetrics.searchRefinementLoad || 0),
    Number(contextMetrics.unanchoredSessionLoad || 0),
    Number(contextMetrics.originDecayLoad || 0),
    Number(contextMetrics.mediaChainLoad || 0),
    Number(contextMetrics.lowReturnLoad || 0)
  );

  return clamp(durationLoad * contextLoad, 0, 1);
}
