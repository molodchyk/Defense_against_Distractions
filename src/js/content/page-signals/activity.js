// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};

  const MIN_RATE_WINDOW_MS = 30 * 1000;
  const MAX_RATE_PER_MINUTE = 600;
  const RECOMMENDER_ZONE_ATTRIBUTE_PATTERN = /recommend|related|suggest|upnext|up-next|watch-next|more-like|for-you|foryou|feed|timeline|trending|popular|explore|shorts|reels|sidebar|rail|home-feed/i;

  let pageStartedAt = Date.now();
  let activePageMs = 0;
  let activePageStartedAt = null;

  const activityCounters = {
    scrollEvents: 0,
    clickEvents: 0,
    recommenderClickEvents: 0,
    keyEvents: 0,
    inputEvents: 0,
    maxScrollDepthRatio: 0
  };

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getElementAttributeText(element) {
    if (!element?.getAttribute) {
      return '';
    }

    const values = [
      element.tagName,
      element.getAttribute('role'),
      element.getAttribute('id'),
      element.getAttribute('class'),
      element.getAttribute('aria-label'),
      element.getAttribute('data-testid'),
      element.getAttribute('data-test-id'),
      element.getAttribute('data-test'),
      element.getAttribute('data-pagelet')
    ];

    return values.filter(Boolean).join(' ');
  }

  function isRecommenderZoneClick(target) {
    let element = target?.nodeType === Node.ELEMENT_NODE ? target : target?.parentElement;
    let depth = 0;

    while (element && depth < 8) {
      if (element.matches?.('[role="feed"], [aria-label*="feed" i], [class*="feed" i], [id*="feed" i]')) {
        return true;
      }

      if (RECOMMENDER_ZONE_ATTRIBUTE_PATTERN.test(getElementAttributeText(element))) {
        return true;
      }

      element = element.parentElement;
      depth += 1;
    }

    return false;
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

  function getScrollDepthRatio() {
    const documentElement = global.document.documentElement;
    const body = global.document.body;
    const scrollTop = Number(global.scrollY || documentElement?.scrollTop || body?.scrollTop || 0);
    const viewportHeight = Number(global.innerHeight || documentElement?.clientHeight || 0);
    const documentHeight = Math.max(
      Number(documentElement?.scrollHeight || 0),
      Number(body?.scrollHeight || 0),
      viewportHeight
    );

    if (documentHeight <= 0) {
      return 0;
    }

    return clamp((scrollTop + viewportHeight) / documentHeight, 0, 1);
  }

  function isPageVisible() {
    return global.document.visibilityState !== 'hidden';
  }

  function getActivePageMs() {
    const currentActiveMs = activePageStartedAt && isPageVisible()
      ? Date.now() - activePageStartedAt
      : 0;
    return Math.max(0, activePageMs + currentActiveMs);
  }

  function updateActivePageTime() {
    if (activePageStartedAt) {
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

    return {
      pageAgeMs,
      activePageMs: currentActivePageMs,
      scrollEvents: activityCounters.scrollEvents,
      clickEvents: activityCounters.clickEvents,
      recommenderClickEvents: activityCounters.recommenderClickEvents,
      keyEvents: activityCounters.keyEvents,
      inputEvents: activityCounters.inputEvents,
      scrollRatePerMinute: calculateRatePerMinute(activityCounters.scrollEvents, currentActivePageMs, pageAgeMs),
      clickRatePerMinute: calculateRatePerMinute(activityCounters.clickEvents, currentActivePageMs, pageAgeMs),
      recommenderClickRatePerMinute: calculateRatePerMinute(activityCounters.recommenderClickEvents, currentActivePageMs, pageAgeMs),
      keyRatePerMinute: calculateRatePerMinute(activityCounters.keyEvents, currentActivePageMs, pageAgeMs),
      inputRatePerMinute: calculateRatePerMinute(activityCounters.inputEvents, currentActivePageMs, pageAgeMs),
      maxScrollDepthRatio: Number(activityCounters.maxScrollDepthRatio.toFixed(3))
    };
  }

  function resetActivitySignals() {
    pageStartedAt = Date.now();
    activePageMs = 0;
    activePageStartedAt = isPageVisible() ? Date.now() : null;
    activityCounters.scrollEvents = 0;
    activityCounters.clickEvents = 0;
    activityCounters.recommenderClickEvents = 0;
    activityCounters.keyEvents = 0;
    activityCounters.inputEvents = 0;
    activityCounters.maxScrollDepthRatio = getScrollDepthRatio();
  }

  function installActivitySignalListeners(schedulePageSignalReport) {
    global.addEventListener('scroll', () => {
      activityCounters.scrollEvents += 1;
      activityCounters.maxScrollDepthRatio = Math.max(activityCounters.maxScrollDepthRatio, getScrollDepthRatio());
      schedulePageSignalReport();
    }, { passive: true });

    global.addEventListener('click', event => {
      activityCounters.clickEvents += 1;
      if (isRecommenderZoneClick(event.target)) {
        activityCounters.recommenderClickEvents += 1;
      }
      schedulePageSignalReport();
    }, { passive: true });

    global.addEventListener('keydown', () => {
      activityCounters.keyEvents += 1;
      schedulePageSignalReport();
    }, { passive: true });

    global.addEventListener('input', () => {
      activityCounters.inputEvents += 1;
      schedulePageSignalReport();
    }, { passive: true });
  }

  global.DAD.PageSignalsActivity = {
    getActivitySignals,
    installActivitySignalListeners,
    isPageVisible,
    resetActivitySignals,
    updateActivePageTime
  };
})(window);
