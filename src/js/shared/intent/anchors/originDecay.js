// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { clamp } from '../utils.js';

const RECENT_ORIGIN_WINDOW = 6;
const LOW_ORIGIN_SIMILARITY = 0.35;
const DECAYED_ORIGIN_SIMILARITY = 0.55;

function calculateAverage(values = []) {
  return values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 1;
}

function getSimilarity(originVisit = {}, visit = {}, calculateVisitSimilarity) {
  if (typeof calculateVisitSimilarity !== 'function') {
    return 1;
  }

  const similarity = Number(calculateVisitSimilarity(originVisit, visit)?.similarity);
  return Number.isFinite(similarity) ? clamp(similarity, 0, 1) : 1;
}

function getDecayContextLoad(metrics = {}) {
  const passiveInteractionLoad = Number(metrics.passiveInteractionLoad || 0);
  const lowAgencyLoad = Number(metrics.lowAgencyLoad || 0);
  return Math.max(
    Number(metrics.passiveMediaLoad || 0),
    Number(metrics.mediaPlaybackLoad || 0),
    passiveInteractionLoad >= 0.45 ? passiveInteractionLoad : 0,
    Number(metrics.recommenderClickLoad || 0),
    Number(metrics.feedCommentInteractionLoad || 0),
    lowAgencyLoad >= 0.45 ? lowAgencyLoad : 0,
    Number(metrics.deliberateStalenessLoad || 0),
    Number(metrics.navigationLoopLoad || 0),
    Number(metrics.searchRefinementLoad || 0)
  );
}

export function calculateOriginDecaySignals({
  visits = [],
  originVisit = {},
  calculateVisitSimilarity,
  contextMetrics = {}
} = {}) {
  if (!Array.isArray(visits) || visits.length < 4) {
    return {
      recentOriginSimilarity: 1,
      lowOriginSimilarityVisitCount: 0,
      decayedOriginSimilarityVisitCount: 0,
      originDecayLoad: 0
    };
  }

  const recentSimilarities = visits
    .slice(1)
    .map(visit => getSimilarity(originVisit, visit, calculateVisitSimilarity))
    .slice(-RECENT_ORIGIN_WINDOW);
  const lowOriginSimilarityVisitCount = recentSimilarities.filter(value => value < LOW_ORIGIN_SIMILARITY).length;
  const decayedOriginSimilarityVisitCount = recentSimilarities.filter(value => value < DECAYED_ORIGIN_SIMILARITY).length;
  const recentOriginSimilarity = calculateAverage(recentSimilarities);
  const latestOriginSimilarity = recentSimilarities.at(-1) ?? 1;
  const lowShare = lowOriginSimilarityVisitCount / recentSimilarities.length;
  const averageLoss = clamp((DECAYED_ORIGIN_SIMILARITY - recentOriginSimilarity) / DECAYED_ORIGIN_SIMILARITY, 0, 1);
  const latestLoss = clamp((DECAYED_ORIGIN_SIMILARITY - latestOriginSimilarity) / DECAYED_ORIGIN_SIMILARITY, 0, 1);
  const sustainedDecayLoad = clamp(averageLoss * 0.45 + lowShare * 0.35 + latestLoss * 0.2, 0, 1);
  const originDecayLoad = clamp(sustainedDecayLoad * getDecayContextLoad(contextMetrics), 0, 1);

  return {
    recentOriginSimilarity,
    lowOriginSimilarityVisitCount,
    decayedOriginSimilarityVisitCount,
    originDecayLoad: originDecayLoad < 0.05 ? 0 : originDecayLoad
  };
}

export function formatOriginDecayMetrics(signals = {}) {
  return {
    recentOriginSimilarity: Number(Number(signals.recentOriginSimilarity ?? 1).toFixed(3)),
    lowOriginSimilarityVisitCount: signals.lowOriginSimilarityVisitCount || 0,
    decayedOriginSimilarityVisitCount: signals.decayedOriginSimilarityVisitCount || 0,
    originDecayLoad: Number(Number(signals.originDecayLoad || 0).toFixed(3))
  };
}
