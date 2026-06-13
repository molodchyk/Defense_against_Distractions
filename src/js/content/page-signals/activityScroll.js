// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};

  const SCROLL_DIRECTION_THRESHOLD_PX = 2;

  let scrollEvents = 0;
  let scrollDirectionChanges = 0;
  let scrollDistanceViewportUnits = 0;
  let maxScrollDepthRatio = 0;
  let lastScrollY = 0;
  let lastScrollDirection = 0;
  let lastScrollAt = 0;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getViewportHeight() {
    const documentElement = global.document.documentElement;
    return Math.max(1, Number(global.innerHeight || documentElement?.clientHeight || 1));
  }

  function getScrollTop() {
    const documentElement = global.document.documentElement;
    const body = global.document.body;
    return Number(global.scrollY || documentElement?.scrollTop || body?.scrollTop || 0);
  }

  function getScrollDepthRatio() {
    const scrollTop = getScrollTop();
    const documentElement = global.document.documentElement;
    const body = global.document.body;
    const viewportHeight = getViewportHeight();
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

  function resetScrollActivity() {
    scrollEvents = 0;
    scrollDirectionChanges = 0;
    scrollDistanceViewportUnits = 0;
    maxScrollDepthRatio = getScrollDepthRatio();
    lastScrollY = getScrollTop();
    lastScrollDirection = 0;
    lastScrollAt = 0;
  }

  function recordScrollActivity() {
    scrollEvents += 1;
    lastScrollAt = Date.now();
    const nextScrollY = getScrollTop();
    const delta = nextScrollY - lastScrollY;
    if (Math.abs(delta) >= SCROLL_DIRECTION_THRESHOLD_PX) {
      const nextDirection = delta > 0 ? 1 : -1;
      if (lastScrollDirection !== 0 && nextDirection !== lastScrollDirection) {
        scrollDirectionChanges += 1;
      }
      scrollDistanceViewportUnits += Math.abs(delta) / getViewportHeight();
      lastScrollDirection = nextDirection;
      lastScrollY = nextScrollY;
    }
    maxScrollDepthRatio = Math.max(maxScrollDepthRatio, getScrollDepthRatio());
  }

  function wasRecentScroll(windowMs) {
    return lastScrollAt > 0 && Date.now() - lastScrollAt <= windowMs;
  }

  function getScrollActivitySignals() {
    return {
      scrollEvents,
      scrollDirectionChanges,
      scrollDistanceViewportUnits: Number(scrollDistanceViewportUnits.toFixed(3)),
      maxScrollDepthRatio: Number(maxScrollDepthRatio.toFixed(3))
    };
  }

  global.DAD.PageSignalScrollActivity = {
    getScrollActivitySignals,
    recordScrollActivity,
    resetScrollActivity,
    wasRecentScroll
  };
})(window);
