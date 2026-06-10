// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};

  const DEFAULT_TEXT_SAMPLE_LIMIT = 20000;
  const DEFAULT_TEXT_TOKEN_LIMIT = 24;
  const SIGNAL_SEND_DELAY_MS = 500;
  const DUPLICATE_REPORT_WINDOW_MS = 5000;
  const MIN_RATE_WINDOW_MS = 30 * 1000;
  const MAX_RATE_PER_MINUTE = 600;
  const RECOMMENDER_ZONE_ATTRIBUTE_PATTERN = /recommend|related|suggest|upnext|up-next|watch-next|more-like|for-you|foryou|feed|timeline|trending|popular|explore|shorts|reels|sidebar|rail|home-feed/i;
  const TEXT_SIGNAL_STOP_WORDS = new Set([
    'about',
    'and',
    'are',
    'das',
    'der',
    'die',
    'for',
    'from',
    'how',
    'mit',
    'not',
    'oder',
    'that',
    'the',
    'this',
    'und',
    'was',
    'what',
    'with',
    'you'
  ]);
  let pendingSignalTimer = null;
  let lastReportedUrl = '';
  let lastReportedSignature = '';
  let lastReportedAt = 0;
  let pageSignalObserver = null;
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

  function countMatches(root, selector) {
    if (!root?.querySelectorAll) return 0;
    return root.querySelectorAll(selector).length;
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

  function getVisibleText(root, sampleLimit = DEFAULT_TEXT_SAMPLE_LIMIT) {
    const text = String(root?.body?.innerText || root?.documentElement?.innerText || root?.innerText || '');
    return text.replace(/\s+/g, ' ').trim().slice(0, sampleLimit);
  }

  function countWords(text) {
    if (!text) return 0;

    return text
      .split(/[^\p{L}\p{N}_-]+/u)
      .filter(Boolean)
      .length;
  }

  function countEmojis(text) {
    if (!text) return 0;
    const matches = text.match(/\p{Extended_Pictographic}/gu);
    return matches ? matches.length : 0;
  }

  function extractTopTextTokens(text, tokenLimit = DEFAULT_TEXT_TOKEN_LIMIT) {
    const tokenStats = new Map();

    String(text || '')
      .toLowerCase()
      .split(/[^\p{L}\p{N}_]+/u)
      .map(token => token.replace(/^[_-]+|[_-]+$/g, ''))
      .filter(token => token.length >= 3 && !TEXT_SIGNAL_STOP_WORDS.has(token))
      .forEach(token => {
        const current = tokenStats.get(token) || { token, count: 0, firstIndex: tokenStats.size };
        current.count += 1;
        tokenStats.set(token, current);
      });

    return Array.from(tokenStats.values())
      .sort((first, second) => second.count - first.count || first.firstIndex - second.firstIndex)
      .slice(0, tokenLimit)
      .map(item => item.token);
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

  function collectPageSignals(root = global.document, options = {}) {
    const textSample = getVisibleText(root, options.textSampleLimit);
    const linkCount = countMatches(root, 'a[href]');
    const imageCount = countMatches(root, 'img, picture, svg');
    const videoCount = countMatches(root, 'video');
    const audioCount = countMatches(root, 'audio');
    const gifCount = countMatches(root, 'img[src*=".gif" i], source[src*=".gif" i]');
    const buttonCount = countMatches(root, 'button, [role="button"]');
    const inputCount = countMatches(root, 'input, textarea, select, [contenteditable="true"]');
    const formCount = countMatches(root, 'form');
    const iframeCount = countMatches(root, 'iframe');
    const feedCount = countMatches(root, '[role="feed"], [aria-label*="feed" i], [class*="feed" i]');

    return {
      url: String(root?.location?.href || global.location?.href || ''),
      hostname: String(root?.location?.hostname || global.location?.hostname || ''),
      title: String(root?.title || global.document?.title || ''),
      collectedAt: new Date().toISOString(),
      text: {
        sampleLength: textSample.length,
        wordCount: countWords(textSample),
        emojiCount: countEmojis(textSample),
        topTokens: extractTopTextTokens(textSample, options.textTokenLimit)
      },
      media: {
        imageCount,
        videoCount,
        audioCount,
        gifCount,
        iframeCount
      },
      interaction: {
        linkCount,
        buttonCount,
        inputCount,
        formCount
      },
      structure: {
        elementCount: countMatches(root, '*'),
        feedCount
      },
      activity: {
        ...getActivitySignals()
      }
    };
  }

  function sendPageSignals(options = {}) {
    if (global.top !== global.self) {
      return;
    }

    if (!global.DAD?.safeRuntimeSendMessage) {
      return;
    }

    const signals = collectPageSignals();
    const signature = `${signals.url}\n${signals.title}`;
    const now = Date.now();

    if (!options.force && signature === lastReportedSignature && now - lastReportedAt < DUPLICATE_REPORT_WINDOW_MS) {
      return;
    }

    lastReportedUrl = signals.url;
    lastReportedSignature = signature;
    lastReportedAt = now;

    global.DAD.safeRuntimeSendMessage({
      action: 'recordIntentPageSignals',
      signals
    });
  }

  function schedulePageSignalReport() {
    if (pendingSignalTimer) {
      global.clearTimeout(pendingSignalTimer);
    }

    pendingSignalTimer = global.setTimeout(() => {
      pendingSignalTimer = null;
      sendPageSignals();
    }, SIGNAL_SEND_DELAY_MS);
  }

  function scheduleIfUrlChanged() {
    const currentUrl = String(global.location?.href || '');
    if (currentUrl !== lastReportedUrl) {
      resetActivitySignals();
      schedulePageSignalReport();
    }
  }

  function installHistoryHooks() {
    const history = global.history;
    if (!history || history.__dadIntentHooksInstalled) {
      return;
    }

    ['pushState', 'replaceState'].forEach(methodName => {
      const originalMethod = history[methodName];
      if (typeof originalMethod !== 'function') {
        return;
      }

      history[methodName] = function(...args) {
        const result = originalMethod.apply(this, args);
        scheduleIfUrlChanged();
        return result;
      };
    });

    history.__dadIntentHooksInstalled = true;
  }

  function installMutationSignalObserver() {
    if (pageSignalObserver || !global.MutationObserver || !global.document.documentElement) {
      return;
    }

    pageSignalObserver = new global.MutationObserver(() => {
      schedulePageSignalReport();
    });
    pageSignalObserver.observe(global.document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function installActivitySignalListeners() {
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

  function initializePageSignalReporting() {
    resetActivitySignals();
    installHistoryHooks();
    installMutationSignalObserver();
    installActivitySignalListeners();

    if (global.document.readyState === 'loading') {
      global.document.addEventListener('DOMContentLoaded', () => {
        installMutationSignalObserver();
        schedulePageSignalReport();
      }, { once: true });
    } else {
      schedulePageSignalReport();
    }

    global.addEventListener('pageshow', schedulePageSignalReport);
    global.addEventListener('popstate', scheduleIfUrlChanged);
    global.document.addEventListener('visibilitychange', () => {
      updateActivePageTime();
      if (global.document.visibilityState === 'visible') {
        scheduleIfUrlChanged();
        schedulePageSignalReport();
      } else {
        sendPageSignals({ force: true });
      }
    });
  }

  global.DAD.PageSignals = {
    collectPageSignals,
    schedulePageSignalReport
  };

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'reportIntentPageSignals') {
      sendPageSignals({ force: true });
      sendResponse({ status: 'reported' });
      return false;
    }

    if (message.action === 'getPageSignalSnapshot') {
      sendResponse({
        status: 'ok',
        signals: collectPageSignals()
      });
      return false;
    }

    return false;
  });

  initializePageSignalReporting();
})(window);
