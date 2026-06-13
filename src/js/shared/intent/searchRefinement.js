// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { clamp } from './utils.js';

function getSearchTokenSet(visit = {}) {
  const searchTokens = Array.isArray(visit.weightedMetadataTokens)
    ? visit.weightedMetadataTokens
      .filter(entry => entry?.source === 'search')
      .map(entry => entry.token)
      .filter(Boolean)
    : [];
  return new Set(searchTokens);
}

function calculateSetSimilarity(firstSet = new Set(), secondSet = new Set()) {
  if (firstSet.size === 0 && secondSet.size === 0) {
    return 1;
  }

  if (firstSet.size === 0 || secondSet.size === 0) {
    return 0;
  }

  let intersection = 0;
  firstSet.forEach(token => {
    if (secondSet.has(token)) {
      intersection += 1;
    }
  });

  return intersection / new Set([...firstSet, ...secondSet]).size;
}

export function calculateSearchRefinementSignals(visits = []) {
  let searchVisitCount = 0;
  let searchReturnCount = 0;
  let searchQueryShiftCount = 0;
  let searchPairCount = 0;
  let searchSimilarityTotal = 0;
  let previousSearchTokens = new Set();
  let previousWasSearch = false;

  visits.forEach(visit => {
    const searchTokens = getSearchTokenSet(visit);
    if (searchTokens.size === 0) {
      previousWasSearch = false;
      return;
    }

    searchVisitCount += 1;
    if (searchVisitCount > 1 && !previousWasSearch) {
      searchReturnCount += 1;
    }

    if (searchVisitCount > 1) {
      const similarity = calculateSetSimilarity(previousSearchTokens, searchTokens);
      searchPairCount += 1;
      searchSimilarityTotal += similarity;
      if (similarity < 0.35) {
        searchQueryShiftCount += 1;
      }
    }

    previousSearchTokens = searchTokens;
    previousWasSearch = true;
  });

  const searchQueryContinuity = searchPairCount > 0 ? searchSimilarityTotal / searchPairCount : 1;
  const searchCycleCount = Math.max(searchReturnCount, searchQueryShiftCount);
  const cycleLoad = searchVisitCount >= 3 ? clamp((searchCycleCount - 1) / 3, 0, 1) : 0;
  const shiftLoad = searchVisitCount >= 3 ? clamp(searchQueryShiftCount / 3, 0, 1) : 0;
  const discontinuityLoad = searchVisitCount >= 3 ? clamp((0.55 - searchQueryContinuity) / 0.55, 0, 1) : 0;
  const searchRefinementLoad = clamp(cycleLoad * 0.45 + shiftLoad * 0.25 + discontinuityLoad * 0.3, 0, 1);

  return {
    searchVisitCount,
    searchReturnCount,
    searchQueryShiftCount,
    searchQueryContinuity,
    searchRefinementLoad
  };
}
