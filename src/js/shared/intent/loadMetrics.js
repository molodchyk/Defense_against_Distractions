// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { clamp, normalizeComparableUrl } from './utils.js';

export function calculateMediaPlaybackLoad(signal) {
  const activity = signal.activity || {};
  const playbackDurationLoad = clamp(Number(activity.mediaPlaybackMs || 0) / (6 * 60 * 1000), 0, 1);
  const playbackEventLoad = clamp(Number(activity.mediaPlayEvents || 0) / 3, 0, 1);
  const progressionLoad = clamp((
    Number(activity.mediaSourceChangeEvents || 0) * 1.25
      + Number(activity.mediaEndEvents || 0)
  ) / 4, 0, 1);
  return Math.max(
    clamp(playbackDurationLoad * 0.75 + playbackEventLoad * 0.12 + progressionLoad * 0.13, 0, 1),
    progressionLoad * 0.45
  );
}

export function calculatePassiveMediaLoad(signal) {
  const structure = signal.structure || {};
  const mediaPresenceLoad = clamp((
    signal.media.videoCount * 10 +
    signal.media.audioCount * 6 +
    signal.media.gifCount * 3 +
    Math.min(signal.media.imageCount, 40) * 0.5 +
    Math.min(structure.feedCount, 5) * 8
  ) / 35, 0, 1);
  const passiveStructureLoad = clamp((Math.min(structure.recommendationRegionCount || 0, 4) * 7 + Math.min(structure.commentSectionCount || 0, 4) * 5 + Math.min(structure.shortFormMediaCount || 0, 4) * 9) / 42, 0, 1);
  const mediaPlaybackLoad = calculateMediaPlaybackLoad(signal);
  return Math.max(mediaPresenceLoad, passiveStructureLoad, mediaPlaybackLoad);
}

export function calculateLinkDensity(signal) {
  if (signal.structure.elementCount <= 0) {
    return 0;
  }

  return clamp(signal.interaction.linkCount / signal.structure.elementCount, 0, 1);
}

export function calculateActiveInputLoad(signal) {
  const activity = signal.activity || {};
  const inputEvents = Number(activity.inputEvents || 0);
  const keyEvents = Number(activity.keyEvents || 0);
  const eventLoad = clamp((inputEvents * 1.5 + keyEvents) / 18, 0, 1);
  const durationLoad = clamp(Number(activity.activeInputMs || 0) / (3 * 60 * 1000), 0, 1);
  return Math.max(eventLoad, durationLoad);
}

export function calculateAgencySignals(signal) {
  const activity = signal.activity || {};
  const scrollEvents = Number(activity.scrollEvents || 0);
  const clickEvents = Number(activity.clickEvents || 0);
  const recommenderClickEvents = Number(activity.recommenderClickEvents || 0);
  const inputEvents = Number(activity.inputEvents || 0);
  const keyEvents = Number(activity.keyEvents || 0);
  const mediaPlayEvents = Number(activity.mediaPlayEvents || 0);
  const activeInputWeight = clamp(Number(activity.activeInputMs || 0) / (90 * 1000), 0, 1) * 3;
  const deliberateActionWeight = Math.max(0, inputEvents * 2 + keyEvents * 0.8 + activeInputWeight);
  const passiveActionWeight = Math.max(0,
    scrollEvents * 0.7
      + clickEvents * 0.9
      + recommenderClickEvents * 1.6
      + mediaPlayEvents * 1.2
  );
  const totalActionWeight = deliberateActionWeight + passiveActionWeight;
  const agencyRatio = totalActionWeight > 0 ? deliberateActionWeight / totalActionWeight : 1;
  const actionPressure = totalActionWeight >= 4 ? clamp(totalActionWeight / 24, 0, 1) : 0;
  const lowAgencyLoad = actionPressure * clamp((0.45 - agencyRatio) / 0.45, 0, 1);

  return {
    agencyRatio,
    deliberateActionWeight,
    passiveActionWeight,
    lowAgencyLoad
  };
}

export function calculatePassiveInteractionLoad(signal) {
  const activity = signal.activity || {};
  const scrollLoad = clamp(Number(activity.scrollEvents || 0) / 30, 0, 1);
  const reversalLoad = clamp(Number(activity.scrollDirectionChanges || 0) / 8, 0, 1);
  const distanceLoad = clamp(Number(activity.scrollDistanceViewportUnits || 0) / 20, 0, 1);
  const clickLoad = clamp(Number(activity.clickEvents || 0) / 24, 0, 1);
  const scrollDepth = clamp(Number(activity.maxScrollDepthRatio || 0), 0, 1);
  const activeInputLoad = calculateActiveInputLoad(signal);
  return clamp(
    (scrollLoad * 0.25 + scrollDepth * 0.2 + clickLoad * 0.2 + reversalLoad * 0.15 + distanceLoad * 0.2)
      * (1 - activeInputLoad * 0.55),
    0,
    1
  );
}

export function calculateInteractionVelocityLoad(signal) {
  const activity = signal.activity || {};
  const activeInputLoad = calculateActiveInputLoad(signal);
  const scrollVelocity = clamp(Number(activity.scrollRatePerMinute || 0) / 60, 0, 1);
  const clickVelocity = clamp(Number(activity.clickRatePerMinute || 0) / 30, 0, 1);
  const inputVelocity = clamp(
    (Number(activity.inputRatePerMinute || 0) + Number(activity.keyRatePerMinute || 0) * 0.4) / 24,
    0,
    1
  );
  const passiveInputVelocity = Math.max(0, inputVelocity - activeInputLoad * 0.6);

  return clamp(scrollVelocity * 0.45 + clickVelocity * 0.4 + passiveInputVelocity * 0.15, 0, 1);
}

export function calculateDynamicContentLoad(signal) {
  const activity = signal.activity || {};
  const scrollLinkedBatches = Number(activity.scrollLinkedContentBatches || 0);
  const scrollLinkedElements = Number(activity.scrollLinkedAddedElements || 0);
  if (scrollLinkedBatches <= 0 || scrollLinkedElements <= 0) {
    return 0;
  }

  const batchLoad = clamp(scrollLinkedBatches / 4, 0, 1);
  const elementLoad = clamp(scrollLinkedElements / 120, 0, 1);
  const scrollLoad = clamp(Number(activity.scrollEvents || 0) / 8, 0, 1);
  return clamp(batchLoad * 0.35 + elementLoad * 0.45 + scrollLoad * 0.2, 0, 1);
}

export function calculateRecommenderClickLoad(signal) {
  const activity = signal.activity || {};
  const clickEvents = Number(activity.clickEvents || 0);
  const recommenderClickEvents = Number(activity.recommenderClickEvents || 0);
  if (recommenderClickEvents <= 0) {
    return 0;
  }

  const countLoad = clamp(recommenderClickEvents / 4, 0, 1);
  const rateLoad = clamp(Number(activity.recommenderClickRatePerMinute || 0) / 8, 0, 1);
  const dominanceLoad = clickEvents > 0 ? clamp(recommenderClickEvents / clickEvents, 0, 1) : 0;
  return clamp(countLoad * 0.4 + rateLoad * 0.35 + dominanceLoad * 0.25, 0, 1);
}

export function calculateFeedCommentInteractionLoad(signal) {
  const activity = signal.activity || {};
  const structure = signal.structure || {};
  const clickEvents = Number(activity.clickEvents || 0);
  const feedClickEvents = Number(activity.feedClickEvents || 0);
  const commentClickEvents = Number(activity.commentClickEvents || 0);
  const feedCommentClickEvents = feedClickEvents + commentClickEvents;
  if (feedCommentClickEvents <= 0) {
    return 0;
  }

  const countLoad = clamp(feedCommentClickEvents / 4, 0, 1);
  const rateLoad = clamp((
    Number(activity.feedClickRatePerMinute || 0)
      + Number(activity.commentClickRatePerMinute || 0)
  ) / 8, 0, 1);
  const dominanceLoad = clickEvents > 0 ? clamp(feedCommentClickEvents / clickEvents, 0, 1) : 0;
  const structureLoad = clamp((Number(structure.feedCount || 0) + Number(structure.commentSectionCount || 0)) / 5, 0, 1);
  return clamp(countLoad * 0.45 + rateLoad * 0.25 + dominanceLoad * 0.2 + structureLoad * 0.1, 0, 1);
}

export function calculateConstructiveDwell(signal) {
  const activity = signal.activity || {};
  const activeMinutes = Number(activity.activePageMs ?? activity.pageAgeMs ?? 0) / (60 * 1000);
  const textVolume = Number(signal.text?.wordCount || 0);
  const mediaLoad = calculatePassiveMediaLoad(signal);
  const activeInputLoad = calculateActiveInputLoad(signal);
  const readingLoad = textVolume >= 250 && mediaLoad < 0.35
    ? clamp(activeMinutes / 6, 0, 1)
    : 0;

  return clamp(Math.max(readingLoad, activeInputLoad), 0, 1);
}

export function calculatePassiveTimeLoad(signal) {
  const activity = signal.activity || {};
  const activeMinutes = Number(activity.activePageMs ?? activity.pageAgeMs ?? 0) / (60 * 1000);
  if (activeMinutes <= 2) {
    return 0;
  }

  const passivePressure = Math.max(
    calculatePassiveMediaLoad(signal),
    calculatePassiveInteractionLoad(signal),
    calculateLinkDensity(signal)
  );
  return clamp(((activeMinutes - 2) / 8) * passivePressure, 0, 1);
}

export function hasRedirectTransition(visit = {}) {
  const qualifiers = Array.isArray(visit.transitionQualifiers) ? visit.transitionQualifiers : [];
  return qualifiers.includes('client_redirect') || qualifiers.includes('server_redirect');
}

export function calculateRedirectTransitionLoad(visits = []) {
  if (visits.length === 0) {
    return 0;
  }

  const redirectCount = visits.filter(hasRedirectTransition).length;
  if (redirectCount === 0) {
    return 0;
  }

  const recentRedirectCount = visits.slice(-4).filter(hasRedirectTransition).length;
  const chainShare = redirectCount / visits.length;
  return clamp(chainShare * 0.45 + (recentRedirectCount / 3) * 0.55, 0, 1);
}

export function calculateNavigationLoopSignals(visits = []) {
  const seenUrls = new Set();
  let samePageRepeatCount = 0;
  let immediatePageRepeatCount = 0;
  let reloadTransitionCount = 0;
  let backtrackTransitionCount = 0;
  let previousUrl = '';

  visits.forEach(visit => {
    const comparableUrl = normalizeComparableUrl(visit?.url);
    if (comparableUrl) {
      if (seenUrls.has(comparableUrl)) {
        samePageRepeatCount += 1;
      }
      if (previousUrl && previousUrl === comparableUrl) {
        immediatePageRepeatCount += 1;
      }
      seenUrls.add(comparableUrl);
      previousUrl = comparableUrl;
    } else {
      previousUrl = '';
    }

    if (visit?.transitionType === 'reload') {
      reloadTransitionCount += 1;
    }

    if (Array.isArray(visit?.transitionQualifiers) && visit.transitionQualifiers.includes('forward_back')) {
      backtrackTransitionCount += 1;
    }
  });

  const repeatLoad = clamp(samePageRepeatCount / 3, 0, 1);
  const immediateRepeatLoad = clamp(immediatePageRepeatCount / 3, 0, 1);
  const reloadLoad = clamp(reloadTransitionCount / 3, 0, 1);
  const backtrackLoad = clamp(backtrackTransitionCount / 4, 0, 1);
  const navigationLoopLoad = clamp(
    Math.max(repeatLoad, reloadLoad) * 0.6 + immediateRepeatLoad * 0.25 + backtrackLoad * 0.15,
    0,
    1
  );

  return {
    samePageRepeatCount,
    immediatePageRepeatCount,
    reloadTransitionCount,
    backtrackTransitionCount,
    navigationLoopLoad
  };
}

export function calculateTabPressureLoad(tabPressure = {}) {
  const tabCount = Math.max(0, Number(tabPressure.tabCount || 0));
  const windowCount = Math.max(0, Number(tabPressure.windowCount || 0));
  const tabLoad = clamp((tabCount - 8) / 24, 0, 1);
  const windowLoad = clamp((windowCount - 1) / 5, 0, 1);

  return clamp(tabLoad * 0.75 + windowLoad * 0.25, 0, 1);
}

export function calculateTabSwitchLoad(tabActivity = {}) {
  const switchCount = Math.max(0, Number(tabActivity.switchCount || 0));
  const loopCount = Math.max(0, Number(tabActivity.loopCount || 0));
  const switchLoad = clamp((switchCount - 3) / 8, 0, 1);
  const loopLoad = clamp(loopCount / 4, 0, 1);

  return clamp(switchLoad * 0.7 + loopLoad * 0.3, 0, 1);
}

export function getVisitDurationMs(visit = {}, key) {
  return Math.max(0, Number(visit.signals?.activity?.[key] || visit[key] || 0));
}

export function calculateDurationTotals(visits = []) {
  const durationByPage = new Map();
  visits.forEach((visit, index) => {
    const key = [
      Number.isFinite(visit.tabId) ? visit.tabId : 'tab',
      visit.url || visit.hostname || `visit-${index}`
    ].join('|');
    const current = durationByPage.get(key) || { dwellMs: 0, activeMs: 0 };
    durationByPage.set(key, {
      dwellMs: Math.max(current.dwellMs, getVisitDurationMs(visit, 'pageAgeMs')),
      activeMs: Math.max(current.activeMs, getVisitDurationMs(visit, 'activePageMs'))
    });
  });

  return Array.from(durationByPage.values()).reduce((totals, duration) => ({
    dwellMs: totals.dwellMs + duration.dwellMs,
    activeMs: totals.activeMs + duration.activeMs
  }), { dwellMs: 0, activeMs: 0 });
}
