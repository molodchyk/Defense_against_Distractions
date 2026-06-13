// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { calculateOriginAnchorSessionSignals, formatOriginAnchorMetrics } from './anchors/originAnchor.js';
import { calculateOriginDecaySignals, formatOriginDecayMetrics } from './anchors/originDecay.js';
import { calculateReturnSignals } from './anchors/returnSignals.js';
import { calculateMediaChainSignals, formatMediaChainMetrics } from './chains/mediaChain.js';
import {
  calculateActiveInputLoad,
  calculateAgencySignals,
  calculateConstructiveDwell,
  calculateDynamicContentLoad,
  calculateDurationTotals,
  calculateFeedCommentInteractionLoad,
  calculateInteractionVelocityLoad,
  calculateLinkDensity,
  calculateMediaPlaybackLoad,
  calculateNavigationLoopSignals,
  calculatePassiveInteractionLoad,
  calculatePassiveMediaLoad,
  calculatePassiveTimeLoad,
  calculateRecommenderClickLoad,
  calculateRedirectTransitionLoad,
  calculateTabPressureLoad,
  calculateTabSwitchLoad,
  getVisitDurationMs,
  hasRedirectTransition
} from './loadMetrics.js';
import { calculateSearchRefinementSignals } from './searchRefinement.js';
import { calculateTokenSimilarity, calculateWeightedTokenSimilarity } from './signals.js';
import { calculateIntentTimingSignals, calculateLongSessionLoad } from './timingSignals.js';
import { calculateNavigationIntentSignals, formatNavigationIntentMetrics } from './transitions/navigationIntent.js';
import { clamp } from './utils.js';

export function calculateVisitSimilarity(firstVisit = {}, secondVisit = {}) {
  const metadataSimilarity = firstVisit.weightedMetadataTokens && secondVisit.weightedMetadataTokens
    ? calculateWeightedTokenSimilarity(firstVisit.weightedMetadataTokens, secondVisit.weightedMetadataTokens)
    : calculateTokenSimilarity(firstVisit.metadataTokens || firstVisit.tokens, secondVisit.metadataTokens || secondVisit.tokens);
  const firstTextTokens = firstVisit.textTokens || firstVisit.signals?.text?.topTokens || [];
  const secondTextTokens = secondVisit.textTokens || secondVisit.signals?.text?.topTokens || [];
  const hasTextSignals = firstTextTokens.length > 0 && secondTextTokens.length > 0;
  const textSimilarity = hasTextSignals ? calculateTokenSimilarity(firstTextTokens, secondTextTokens) : null;
  const combinedSimilarity = calculateTokenSimilarity(firstVisit.tokens, secondVisit.tokens);

  if (!hasTextSignals) {
    return {
      similarity: Number(combinedSimilarity.toFixed(3)),
      metadataSimilarity: Number(metadataSimilarity.toFixed(3)),
      textSimilarity: null
    };
  }

  return {
    similarity: Number((metadataSimilarity * 0.35 + textSimilarity * 0.55 + combinedSimilarity * 0.1).toFixed(3)),
    metadataSimilarity: Number(metadataSimilarity.toFixed(3)),
    textSimilarity: Number(textSimilarity.toFixed(3))
  };
}

export function calculateSessionMetrics(visits, originVisit) {
  const domains = visits.map(visit => visit.hostname).filter(Boolean);
  const uniqueDomains = new Set(domains);
  const tabIds = visits.map(visit => visit.tabId).filter(Number.isFinite);
  const uniqueTabIds = new Set(tabIds);
  let domainChanges = 0;
  for (let index = 1; index < domains.length; index += 1) {
    if (domains[index] !== domains[index - 1]) {
      domainChanges += 1;
    }
  }

  const latestVisit = visits[visits.length - 1];
  const previousVisit = visits[visits.length - 2] || latestVisit;
  const originSimilarityResult = latestVisit ? calculateVisitSimilarity(originVisit, latestVisit) : { similarity: 1, metadataSimilarity: 1, textSimilarity: null };
  const localSimilarityResult = latestVisit && previousVisit ? calculateVisitSimilarity(previousVisit, latestVisit) : { similarity: 1, metadataSimilarity: 1, textSimilarity: null };
  const passiveMediaLoad = latestVisit ? calculatePassiveMediaLoad(latestVisit.signals) : 0;
  const mediaPlaybackLoad = latestVisit ? calculateMediaPlaybackLoad(latestVisit.signals) : 0;
  const passiveInteractionLoad = latestVisit ? calculatePassiveInteractionLoad(latestVisit.signals) : 0;
  const activeInputLoad = latestVisit ? calculateActiveInputLoad(latestVisit.signals) : 0;
  const interactionVelocityLoad = latestVisit ? calculateInteractionVelocityLoad(latestVisit.signals) : 0;
  const dynamicContentLoad = latestVisit ? calculateDynamicContentLoad(latestVisit.signals) : 0;
  const recommenderClickLoad = latestVisit ? calculateRecommenderClickLoad(latestVisit.signals) : 0;
  const feedCommentInteractionLoad = latestVisit ? calculateFeedCommentInteractionLoad(latestVisit.signals) : 0;
  const agencySignals = latestVisit ? calculateAgencySignals(latestVisit.signals) : { agencyRatio: 1, deliberateActionWeight: 0, passiveActionWeight: 0, lowAgencyLoad: 0 };
  const constructiveDwell = latestVisit ? calculateConstructiveDwell(latestVisit.signals) : 0;
  const passiveTimeLoad = latestVisit ? calculatePassiveTimeLoad(latestVisit.signals) : 0;
  const latestActivity = latestVisit?.signals?.activity || {};
  const latestStructure = latestVisit?.signals?.structure || {};
  const latestTabPressure = latestVisit?.tabPressure || {};
  const latestTabActivity = latestVisit?.tabActivity || {};
  const linkDensity = latestVisit ? calculateLinkDensity(latestVisit.signals) : 0;
  const tabPressureLoad = latestVisit ? calculateTabPressureLoad(latestTabPressure) : 0;
  const tabSwitchLoad = latestVisit ? calculateTabSwitchLoad(latestTabActivity) : 0;
  const domainEntropy = domains.length <= 1 ? 0 : clamp(uniqueDomains.size / domains.length, 0, 1);
  const branchCount = visits.filter(visit => visit.parentVisitId).length;
  const driftDescendantCount = visits.filter(visit => visit.driftDescendant).length;
  const redirectTransitionCount = visits.filter(hasRedirectTransition).length;
  const redirectTransitionLoad = calculateRedirectTransitionLoad(visits);
  const durationTotals = calculateDurationTotals(visits);
  const returnSignals = calculateReturnSignals(visits, originVisit, domainEntropy, branchCount);
  const navigationLoopSignals = calculateNavigationLoopSignals(visits);
  const searchRefinementSignals = calculateSearchRefinementSignals(visits);
  const timingSignals = calculateIntentTimingSignals(visits);
  const originAnchorSignals = calculateOriginAnchorSessionSignals({ visits, originVisit, domainEntropy, domainChanges, branchCount, tabPressureLoad, tabSwitchLoad, passiveMediaLoad, passiveInteractionLoad, passiveTimeLoad, recommenderClickLoad, agencySignals, timingSignals, navigationLoopSignals, searchRefinementSignals });
  const originDecaySignals = calculateOriginDecaySignals({ visits, originVisit, calculateVisitSimilarity, contextMetrics: { passiveMediaLoad, mediaPlaybackLoad, passiveInteractionLoad, recommenderClickLoad, feedCommentInteractionLoad, lowAgencyLoad: agencySignals.lowAgencyLoad, deliberateStalenessLoad: timingSignals.deliberateStalenessLoad, navigationLoopLoad: navigationLoopSignals.navigationLoopLoad, searchRefinementLoad: searchRefinementSignals.searchRefinementLoad } });
  const mediaChainSignals = calculateMediaChainSignals(visits, { recommenderClickLoad, feedCommentInteractionLoad, originDecayLoad: originDecaySignals.originDecayLoad, lowAgencyLoad: agencySignals.lowAgencyLoad, deliberateStalenessLoad: timingSignals.deliberateStalenessLoad, navigationLoopLoad: navigationLoopSignals.navigationLoopLoad, unanchoredSessionLoad: originAnchorSignals.unanchoredSessionLoad });
  const navigationIntentSignals = calculateNavigationIntentSignals(visits, { passiveMediaLoad, mediaPlaybackLoad, passiveInteractionLoad, recommenderClickLoad, feedCommentInteractionLoad, lowAgencyLoad: agencySignals.lowAgencyLoad, deliberateStalenessLoad: timingSignals.deliberateStalenessLoad, navigationLoopLoad: navigationLoopSignals.navigationLoopLoad, unanchoredSessionLoad: originAnchorSignals.unanchoredSessionLoad, originDecayLoad: originDecaySignals.originDecayLoad, mediaChainLoad: mediaChainSignals.mediaChainLoad });
  const longSessionLoad = calculateLongSessionLoad(durationTotals, { passiveMediaLoad, mediaPlaybackLoad, passiveInteractionLoad, passiveTimeLoad, recommenderClickLoad, feedCommentInteractionLoad, ...agencySignals, ...timingSignals, ...navigationLoopSignals, ...searchRefinementSignals, ...originAnchorSignals, ...originDecaySignals, ...mediaChainSignals, ...returnSignals });

  return {
    visitCount: visits.length,
    uniqueDomainCount: uniqueDomains.size,
    tabCount: uniqueTabIds.size,
    openTabCount: Math.max(0, Number(latestTabPressure.tabCount || 0)),
    openWindowCount: Math.max(0, Number(latestTabPressure.windowCount || 0)),
    tabPressureLoad: Number(tabPressureLoad.toFixed(3)),
    tabSwitchCount: Math.max(0, Math.round(Number(latestTabActivity.switchCount || 0))),
    tabSwitchWindowMs: Math.max(0, Math.round(Number(latestTabActivity.windowMs || 0))),
    tabSwitchRatePerMinute: Number(Math.max(0, Number(latestTabActivity.switchRatePerMinute || 0)).toFixed(3)),
    tabSwitchLoopCount: Math.max(0, Math.round(Number(latestTabActivity.loopCount || 0))),
    tabSwitchUniqueTabCount: Math.max(0, Math.round(Number(latestTabActivity.uniqueTabCount || 0))),
    tabSwitchLoad: Number(tabSwitchLoad.toFixed(3)),
    branchCount,
    driftDescendantCount,
    latestIsDriftDescendant: latestVisit?.driftDescendant === true,
    originReturnCount: returnSignals.originReturnCount,
    domainReturnCount: returnSignals.domainReturnCount,
    returnOpportunityCount: returnSignals.returnOpportunityCount,
    returnRate: Number(returnSignals.returnRate.toFixed(3)),
    originReturnRate: Number(returnSignals.originReturnRate.toFixed(3)),
    lowReturnLoad: Number(returnSignals.lowReturnLoad.toFixed(3)),
    domainChanges,
    originSimilarity: originSimilarityResult.similarity,
    ...formatOriginAnchorMetrics(originAnchorSignals),
    ...formatOriginDecayMetrics(originDecaySignals),
    ...formatMediaChainMetrics(mediaChainSignals),
    ...formatNavigationIntentMetrics(navigationIntentSignals),
    localSimilarity: localSimilarityResult.similarity,
    metadataOriginSimilarity: originSimilarityResult.metadataSimilarity,
    metadataLocalSimilarity: localSimilarityResult.metadataSimilarity,
    textOriginSimilarity: originSimilarityResult.textSimilarity,
    textLocalSimilarity: localSimilarityResult.textSimilarity,
    passiveMediaLoad: Number(passiveMediaLoad.toFixed(3)),
    mediaPlaybackLoad: Number(mediaPlaybackLoad.toFixed(3)),
    mediaPlaybackMs: Math.round(Number(latestActivity.mediaPlaybackMs || 0)),
    mediaPlayEvents: Number(latestActivity.mediaPlayEvents || 0),
    mediaPauseEvents: Number(latestActivity.mediaPauseEvents || 0),
    mediaEndEvents: Number(latestActivity.mediaEndEvents || 0),
    mediaSourceChangeEvents: Number(latestActivity.mediaSourceChangeEvents || 0),
    mediaPlayRatePerMinute: Number(Number(latestActivity.mediaPlayRatePerMinute || 0).toFixed(3)),
    mediaPauseRatePerMinute: Number(Number(latestActivity.mediaPauseRatePerMinute || 0).toFixed(3)),
    mediaEndRatePerMinute: Number(Number(latestActivity.mediaEndRatePerMinute || 0).toFixed(3)),
    mediaSourceChangeRatePerMinute: Number(Number(latestActivity.mediaSourceChangeRatePerMinute || 0).toFixed(3)),
    recommendationRegionCount: Number(latestStructure.recommendationRegionCount || 0),
    commentSectionCount: Number(latestStructure.commentSectionCount || 0),
    shortFormMediaCount: Number(latestStructure.shortFormMediaCount || 0),
    passiveInteractionLoad: Number(passiveInteractionLoad.toFixed(3)),
    activeInputLoad: Number(activeInputLoad.toFixed(3)),
    activeInputMs: Math.round(Number(latestActivity.activeInputMs || 0)),
    agencyRatio: Number(agencySignals.agencyRatio.toFixed(3)),
    deliberateActionWeight: Number(agencySignals.deliberateActionWeight.toFixed(3)),
    passiveActionWeight: Number(agencySignals.passiveActionWeight.toFixed(3)),
    lowAgencyLoad: Number(agencySignals.lowAgencyLoad.toFixed(3)),
    interactionVelocityLoad: Number(interactionVelocityLoad.toFixed(3)),
    dynamicContentLoad: Number(dynamicContentLoad.toFixed(3)),
    dynamicContentBatches: Number(latestActivity.dynamicContentBatches || 0),
    dynamicAddedElements: Number(latestActivity.dynamicAddedElements || 0),
    scrollLinkedContentBatches: Number(latestActivity.scrollLinkedContentBatches || 0),
    scrollLinkedAddedElements: Number(latestActivity.scrollLinkedAddedElements || 0),
    recommenderClickLoad: Number(recommenderClickLoad.toFixed(3)),
    feedCommentInteractionLoad: Number(feedCommentInteractionLoad.toFixed(3)),
    constructiveDwell: Number(constructiveDwell.toFixed(3)),
    passiveTimeLoad: Number(passiveTimeLoad.toFixed(3)),
    latestDwellMs: latestVisit ? getVisitDurationMs(latestVisit, 'pageAgeMs') : 0,
    latestActiveMs: latestVisit ? getVisitDurationMs(latestVisit, 'activePageMs') : 0,
    totalDwellMs: Math.round(durationTotals.dwellMs),
    totalActiveMs: Math.round(durationTotals.activeMs),
    longSessionLoad: Number(longSessionLoad.toFixed(3)),
    scrollDirectionChanges: Number(latestActivity.scrollDirectionChanges || 0),
    scrollDistanceViewportUnits: Number(Number(latestActivity.scrollDistanceViewportUnits || 0).toFixed(3)),
    scrollRatePerMinute: Number(Number(latestActivity.scrollRatePerMinute || 0).toFixed(3)),
    clickRatePerMinute: Number(Number(latestActivity.clickRatePerMinute || 0).toFixed(3)),
    recommenderClickEvents: Number(latestActivity.recommenderClickEvents || 0),
    recommendationClickEvents: Number(latestActivity.recommendationClickEvents || 0),
    feedClickEvents: Number(latestActivity.feedClickEvents || 0),
    commentClickEvents: Number(latestActivity.commentClickEvents || 0),
    recommenderClickRatePerMinute: Number(Number(latestActivity.recommenderClickRatePerMinute || 0).toFixed(3)),
    recommendationClickRatePerMinute: Number(Number(latestActivity.recommendationClickRatePerMinute || 0).toFixed(3)),
    feedClickRatePerMinute: Number(Number(latestActivity.feedClickRatePerMinute || 0).toFixed(3)),
    commentClickRatePerMinute: Number(Number(latestActivity.commentClickRatePerMinute || 0).toFixed(3)),
    keyRatePerMinute: Number(Number(latestActivity.keyRatePerMinute || 0).toFixed(3)),
    inputRatePerMinute: Number(Number(latestActivity.inputRatePerMinute || 0).toFixed(3)),
    latestTransitionType: latestVisit?.transitionType || null,
    latestTransitionQualifiers: Array.isArray(latestVisit?.transitionQualifiers) ? latestVisit.transitionQualifiers : [],
    latestTransitionSource: latestVisit?.transitionSource || null,
    redirectTransitionCount,
    redirectTransitionLoad: Number(redirectTransitionLoad.toFixed(3)),
    samePageRepeatCount: navigationLoopSignals.samePageRepeatCount,
    immediatePageRepeatCount: navigationLoopSignals.immediatePageRepeatCount,
    reloadTransitionCount: navigationLoopSignals.reloadTransitionCount,
    backtrackTransitionCount: navigationLoopSignals.backtrackTransitionCount,
    navigationLoopLoad: Number(navigationLoopSignals.navigationLoopLoad.toFixed(3)),
    searchVisitCount: searchRefinementSignals.searchVisitCount,
    searchReturnCount: searchRefinementSignals.searchReturnCount,
    searchQueryShiftCount: searchRefinementSignals.searchQueryShiftCount,
    searchQueryContinuity: Number(searchRefinementSignals.searchQueryContinuity.toFixed(3)),
    searchRefinementLoad: Number(searchRefinementSignals.searchRefinementLoad.toFixed(3)),
    sessionAgeMs: Math.round(timingSignals.sessionAgeMs),
    deliberateGapMs: Math.round(timingSignals.deliberateGapMs),
    visitsSinceDeliberateAction: timingSignals.visitsSinceDeliberateAction,
    passiveVisitsSinceDeliberate: timingSignals.passiveVisitsSinceDeliberate,
    passiveShareSinceDeliberate: Number(timingSignals.passiveShareSinceDeliberate.toFixed(3)),
    deliberateStalenessLoad: Number(timingSignals.deliberateStalenessLoad.toFixed(3)),
    linkDensity: Number(linkDensity.toFixed(3)),
    domainEntropy: Number(domainEntropy.toFixed(3))
  };
}
