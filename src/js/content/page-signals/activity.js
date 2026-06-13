// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};

  const MIN_RATE_WINDOW_MS = 30 * 1000;
  const MAX_RATE_PER_MINUTE = 600;
  const SCROLL_APPEND_WINDOW_MS = 3000;
  const MAX_ADDED_ELEMENTS_PER_BATCH = 80;

  let pageStartedAt = Date.now();
  let activePageMs = 0;
  let activePageStartedAt = null;
  let lastClickedLinkTokens = [];
  let lastSelectedTextTokens = [];

  const activityCounters = {
    dynamicContentBatches: 0,
    dynamicAddedElements: 0,
    scrollLinkedContentBatches: 0,
    scrollLinkedAddedElements: 0,
    clickEvents: 0,
    recommenderClickEvents: 0,
    recommendationClickEvents: 0,
    feedClickEvents: 0,
    commentClickEvents: 0
  };

  function recordClickContext(target) {
    const contextTokens = global.DAD.PageSignalContextTokens;
    lastClickedLinkTokens = contextTokens?.getClickedLinkTokens?.(target) || [];
    lastSelectedTextTokens = contextTokens?.getSelectedTextTokens?.() || [];
  }

  function getRecommenderZoneType(target) {
    const zoneType = global.DAD.PageSignalRecommenderZones?.getRecommenderZoneType?.(target);
    if (zoneType) {
      return zoneType;
    }

    return global.DAD.PageSignalRecommenderZones?.isRecommenderZoneClick?.(target) === true
      ? 'recommendation'
      : null;
  }

  function calculateRatePerMinute(count, activeMs, pageAgeMs) {
    const eventCount = Math.max(0, Number(count || 0));
    if (eventCount <= 0) {
      return 0;
    }

    const measuredMs = activeMs > 0 ? activeMs : pageAgeMs;
    const minutes = Math.max(measuredMs, MIN_RATE_WINDOW_MS) / (60 * 1000);
    return Math.min(MAX_RATE_PER_MINUTE, Number((eventCount / minutes).toFixed(3)));
  }

  function countAddedElements(node) {
    if (!node || node.nodeType !== global.Node?.ELEMENT_NODE) {
      return 0;
    }

    const descendantCount = typeof node.querySelectorAll === 'function'
      ? node.querySelectorAll('*').length
      : 0;
    return 1 + descendantCount;
  }

  function recordDomMutationBatch(records = []) {
    const addedElementCount = Array.from(records).reduce((total, record) => {
      return total + Array.from(record?.addedNodes || []).reduce((nodeTotal, node) => {
        return nodeTotal + countAddedElements(node);
      }, 0);
    }, 0);

    if (addedElementCount <= 0) {
      return;
    }

    const boundedAddedElements = Math.min(addedElementCount, MAX_ADDED_ELEMENTS_PER_BATCH);
    activityCounters.dynamicContentBatches += 1;
    activityCounters.dynamicAddedElements += boundedAddedElements;

    if (global.DAD.PageSignalScrollActivity.wasRecentScroll(SCROLL_APPEND_WINDOW_MS)) {
      activityCounters.scrollLinkedContentBatches += 1;
      activityCounters.scrollLinkedAddedElements += boundedAddedElements;
    }
  }

  function isPageVisible() {
    return global.document.visibilityState !== 'hidden';
  }

  function getActivePageMs() {
    const currentActiveMs = activePageStartedAt !== null && isPageVisible()
      ? Date.now() - activePageStartedAt
      : 0;
    return Math.max(0, activePageMs + currentActiveMs);
  }

  function updateActivePageTime() {
    global.DAD.PageSignalMediaActivity.updateMediaPlaybackTime();
    global.DAD.PageSignalInputActivity.updateActiveInputTime();

    if (activePageStartedAt !== null) {
      activePageMs += Math.max(0, Date.now() - activePageStartedAt);
      activePageStartedAt = isPageVisible() ? Date.now() : null;
      return;
    }

    if (isPageVisible()) {
      activePageStartedAt = Date.now();
    }
  }

  function getActivitySignals() {
    const pageAgeMs = Math.max(0, Date.now() - pageStartedAt);
    const currentActivePageMs = getActivePageMs();
    const scrollSignals = global.DAD.PageSignalScrollActivity.getScrollActivitySignals();
    const inputSignals = global.DAD.PageSignalInputActivity.getInputActivitySignals();
    const mediaSignals = global.DAD.PageSignalMediaActivity.getMediaActivitySignals();

    return {
      pageAgeMs,
      activePageMs: currentActivePageMs,
      ...scrollSignals,
      ...inputSignals,
      ...mediaSignals,
      dynamicContentBatches: activityCounters.dynamicContentBatches,
      dynamicAddedElements: activityCounters.dynamicAddedElements,
      scrollLinkedContentBatches: activityCounters.scrollLinkedContentBatches,
      scrollLinkedAddedElements: activityCounters.scrollLinkedAddedElements,
      clickEvents: activityCounters.clickEvents,
      recommenderClickEvents: activityCounters.recommenderClickEvents,
      recommendationClickEvents: activityCounters.recommendationClickEvents,
      feedClickEvents: activityCounters.feedClickEvents,
      commentClickEvents: activityCounters.commentClickEvents,
      scrollRatePerMinute: calculateRatePerMinute(scrollSignals.scrollEvents, currentActivePageMs, pageAgeMs),
      clickRatePerMinute: calculateRatePerMinute(activityCounters.clickEvents, currentActivePageMs, pageAgeMs),
      recommenderClickRatePerMinute: calculateRatePerMinute(activityCounters.recommenderClickEvents, currentActivePageMs, pageAgeMs),
      recommendationClickRatePerMinute: calculateRatePerMinute(activityCounters.recommendationClickEvents, currentActivePageMs, pageAgeMs),
      feedClickRatePerMinute: calculateRatePerMinute(activityCounters.feedClickEvents, currentActivePageMs, pageAgeMs),
      commentClickRatePerMinute: calculateRatePerMinute(activityCounters.commentClickEvents, currentActivePageMs, pageAgeMs),
      keyRatePerMinute: calculateRatePerMinute(inputSignals.keyEvents, currentActivePageMs, pageAgeMs),
      inputRatePerMinute: calculateRatePerMinute(inputSignals.inputEvents, currentActivePageMs, pageAgeMs),
      mediaPlayRatePerMinute: calculateRatePerMinute(mediaSignals.mediaPlayEvents, currentActivePageMs, pageAgeMs),
      mediaPauseRatePerMinute: calculateRatePerMinute(mediaSignals.mediaPauseEvents, currentActivePageMs, pageAgeMs),
      mediaEndRatePerMinute: calculateRatePerMinute(mediaSignals.mediaEndEvents, currentActivePageMs, pageAgeMs),
      mediaSourceChangeRatePerMinute: calculateRatePerMinute(mediaSignals.mediaSourceChangeEvents, currentActivePageMs, pageAgeMs),
      clickedLinkTokens: lastClickedLinkTokens,
      selectedTextTokens: lastSelectedTextTokens
    };
  }

  function resetActivitySignals() {
    pageStartedAt = Date.now();
    activePageMs = 0;
    activePageStartedAt = isPageVisible() ? Date.now() : null;
    activityCounters.dynamicContentBatches = 0;
    activityCounters.dynamicAddedElements = 0;
    activityCounters.scrollLinkedContentBatches = 0;
    activityCounters.scrollLinkedAddedElements = 0;
    activityCounters.clickEvents = 0;
    activityCounters.recommenderClickEvents = 0;
    activityCounters.recommendationClickEvents = 0;
    activityCounters.feedClickEvents = 0;
    activityCounters.commentClickEvents = 0;
    global.DAD.PageSignalScrollActivity.resetScrollActivity();
    global.DAD.PageSignalInputActivity.resetInputActivity();
    global.DAD.PageSignalMediaActivity.resetMediaActivity();
    lastClickedLinkTokens = [];
    lastSelectedTextTokens = [];
  }

  function installActivitySignalListeners(schedulePageSignalReport) {
    global.addEventListener('scroll', () => {
      global.DAD.PageSignalScrollActivity.recordScrollActivity();
      schedulePageSignalReport();
    }, { passive: true });

    global.addEventListener('click', event => {
      activityCounters.clickEvents += 1;
      recordClickContext(event.target);
      const zoneType = getRecommenderZoneType(event.target);
      if (zoneType) {
        activityCounters.recommenderClickEvents += 1;
        if (zoneType === 'feed') {
          activityCounters.feedClickEvents += 1;
        } else if (zoneType === 'comment') {
          activityCounters.commentClickEvents += 1;
        } else {
          activityCounters.recommendationClickEvents += 1;
        }
      }
      schedulePageSignalReport();
    }, { passive: true });

    global.DAD.PageSignalInputActivity.installInputActivityListeners(schedulePageSignalReport);
    global.DAD.PageSignalMediaActivity.installMediaActivityListeners(schedulePageSignalReport);
  }

  global.DAD.PageSignalsActivity = {
    getActivitySignals,
    installActivitySignalListeners,
    isPageVisible,
    recordDomMutationBatch,
    resetActivitySignals,
    updateActivePageTime
  };
})(window);
