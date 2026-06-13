// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  clamp,
  normalizeDurationMs,
  normalizeEventCount,
  normalizeRatePerMinute
} from '../utils.js';

export function normalizeIntentActivitySignals(activity = {}) {
  const pageAgeMs = normalizeDurationMs(activity.pageAgeMs);
  const activePageMs = Math.min(pageAgeMs, normalizeDurationMs(activity.activePageMs, pageAgeMs));
  const scrollEvents = normalizeEventCount(activity.scrollEvents);
  const scrollDirectionChanges = normalizeEventCount(activity.scrollDirectionChanges);
  const scrollDistanceViewportUnits = clamp(Number(activity.scrollDistanceViewportUnits || 0), 0, 1000);
  const dynamicContentBatches = normalizeEventCount(activity.dynamicContentBatches);
  const dynamicAddedElements = normalizeEventCount(activity.dynamicAddedElements);
  const scrollLinkedContentBatches = normalizeEventCount(activity.scrollLinkedContentBatches);
  const scrollLinkedAddedElements = normalizeEventCount(activity.scrollLinkedAddedElements);
  const clickEvents = normalizeEventCount(activity.clickEvents);
  const recommendationClickEvents = normalizeEventCount(activity.recommendationClickEvents);
  const feedClickEvents = normalizeEventCount(activity.feedClickEvents);
  const commentClickEvents = normalizeEventCount(activity.commentClickEvents);
  const zoneClickEvents = recommendationClickEvents + feedClickEvents + commentClickEvents;
  const recommenderClickEvents = Math.max(normalizeEventCount(activity.recommenderClickEvents), zoneClickEvents);
  const keyEvents = normalizeEventCount(activity.keyEvents);
  const inputEvents = normalizeEventCount(activity.inputEvents);
  const activeInputMs = Math.min(activePageMs || pageAgeMs, normalizeDurationMs(activity.activeInputMs));
  const mediaPlayEvents = normalizeEventCount(activity.mediaPlayEvents);
  const mediaPauseEvents = normalizeEventCount(activity.mediaPauseEvents);
  const mediaEndEvents = normalizeEventCount(activity.mediaEndEvents);
  const mediaSourceChangeEvents = normalizeEventCount(activity.mediaSourceChangeEvents);
  const mediaPlaybackMs = Math.min(activePageMs || pageAgeMs, normalizeDurationMs(activity.mediaPlaybackMs));

  return {
    pageAgeMs,
    activePageMs,
    scrollEvents,
    scrollDirectionChanges,
    scrollDistanceViewportUnits: Number(scrollDistanceViewportUnits.toFixed(3)),
    dynamicContentBatches,
    dynamicAddedElements,
    scrollLinkedContentBatches,
    scrollLinkedAddedElements,
    clickEvents,
    recommenderClickEvents,
    recommendationClickEvents,
    feedClickEvents,
    commentClickEvents,
    keyEvents,
    inputEvents,
    activeInputMs,
    mediaPlaybackMs,
    mediaPlayEvents,
    mediaPauseEvents,
    mediaEndEvents,
    mediaSourceChangeEvents,
    scrollRatePerMinute: normalizeRatePerMinute(activity.scrollRatePerMinute, scrollEvents, activePageMs, pageAgeMs),
    clickRatePerMinute: normalizeRatePerMinute(activity.clickRatePerMinute, clickEvents, activePageMs, pageAgeMs),
    recommenderClickRatePerMinute: normalizeRatePerMinute(activity.recommenderClickRatePerMinute, recommenderClickEvents, activePageMs, pageAgeMs),
    recommendationClickRatePerMinute: normalizeRatePerMinute(activity.recommendationClickRatePerMinute, recommendationClickEvents, activePageMs, pageAgeMs),
    feedClickRatePerMinute: normalizeRatePerMinute(activity.feedClickRatePerMinute, feedClickEvents, activePageMs, pageAgeMs),
    commentClickRatePerMinute: normalizeRatePerMinute(activity.commentClickRatePerMinute, commentClickEvents, activePageMs, pageAgeMs),
    keyRatePerMinute: normalizeRatePerMinute(activity.keyRatePerMinute, keyEvents, activePageMs, pageAgeMs),
    inputRatePerMinute: normalizeRatePerMinute(activity.inputRatePerMinute, inputEvents, activePageMs, pageAgeMs),
    mediaPlayRatePerMinute: normalizeRatePerMinute(activity.mediaPlayRatePerMinute, mediaPlayEvents, activePageMs, pageAgeMs),
    mediaPauseRatePerMinute: normalizeRatePerMinute(activity.mediaPauseRatePerMinute, mediaPauseEvents, activePageMs, pageAgeMs),
    mediaEndRatePerMinute: normalizeRatePerMinute(activity.mediaEndRatePerMinute, mediaEndEvents, activePageMs, pageAgeMs),
    mediaSourceChangeRatePerMinute: normalizeRatePerMinute(activity.mediaSourceChangeRatePerMinute, mediaSourceChangeEvents, activePageMs, pageAgeMs),
    maxScrollDepthRatio: clamp(Number(activity.maxScrollDepthRatio || 0), 0, 1)
  };
}
