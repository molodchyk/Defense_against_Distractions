// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const contentBlocking = global.DAD.ContentBlocking = global.DAD.ContentBlocking || {};

  const STRUCTURAL_SELECTORS = {
    audio: 'audio',
    commentSection: '[role="comment"], [aria-label*="comment" i], [class*="comment" i], [id*="comment" i], [data-testid*="comment" i]',
    feed: '[role="feed"], [aria-label*="feed" i], [class*="feed" i]',
    gif: 'img[src*=".gif" i], source[src*=".gif" i]',
    iframe: 'iframe',
    image: 'img, picture, svg',
    link: 'a[href]',
    media: 'audio, video',
    recommendationRegion: '[aria-label*="recommend" i], [aria-label*="related" i], [class*="recommend" i], [class*="related" i], [id*="recommend" i], [id*="related" i], [data-testid*="recommend" i], [data-testid*="related" i]',
    shortFormMedia: '[href*="/shorts" i], [href*="/reels" i], [href*="/reel" i], [href*="/short" i], [aria-label*="shorts" i], [aria-label*="reels" i], [class*="shorts" i], [class*="reels" i], [id*="shorts" i], [id*="reels" i], [data-testid*="shorts" i], [data-testid*="reels" i]',
    video: 'video'
  };
  const TIME_METRICS = new Set(['activeSeconds', 'pageSeconds']);
  const STRUCTURAL_METRIC_TEXT = {
    audibleMedia: ['audible media element', 'audible media elements'],
    commentSection: ['comment section', 'comment sections'],
    recommendationRegion: ['recommendation region', 'recommendation regions'],
    shortFormMedia: ['short-form media region', 'short-form media regions']
  };

  function countMatches(root, selector) {
    if (!root?.querySelectorAll || !selector) return 0;
    return root.querySelectorAll(selector).length;
  }

  function isAudibleMediaElement(element) {
    const tagName = String(element?.tagName || '').toLowerCase();
    if (tagName !== 'audio' && tagName !== 'video') {
      return false;
    }

    if (element.paused !== false || element.ended === true || element.muted === true) {
      return false;
    }

    const volume = Number(element.volume);
    return !Number.isFinite(volume) || volume > 0;
  }

  function countAudibleMedia(root) {
    if (!root?.querySelectorAll) return 0;
    return Array.from(root.querySelectorAll('audio, video')).filter(isAudibleMediaElement).length;
  }

  function conditionMatches(count, condition) {
    if (condition.operator === '>') {
      return count > condition.count;
    }

    if (condition.operator === '=') {
      return count === condition.count;
    }

    return count >= condition.count;
  }

  function isTimeMetric(metric) {
    return TIME_METRICS.has(metric);
  }

  function getStructuralTriggerKey(keywordObj = {}) {
    return [
      keywordObj.keyword || '',
      keywordObj.operation || '+',
      String(keywordObj.value ?? '')
    ].join('|');
  }

  function getStructuralContext(condition, count) {
    if (isTimeMetric(condition.metric)) {
      const label = condition.metric === 'activeSeconds' ? 'active visible time' : 'page time';
      return `Detected ${count}s ${label} on the page`;
    }

    const metricText = STRUCTURAL_METRIC_TEXT[condition.metric];
    if (metricText) {
      return `Detected ${count} ${count === 1 ? metricText[0] : metricText[1]} on the page`;
    }

    const noun = count === 1 ? 'element' : 'elements';
    return `Detected ${count} ${condition.metric} ${noun} on the page`;
  }

  function getConditionValue(condition, root) {
    if (isTimeMetric(condition.metric)) {
      const activity = global.DAD.PageSignalsActivity?.getActivitySignals?.() || {};
      const durationMs = condition.metric === 'activeSeconds'
        ? activity.activePageMs
        : activity.pageAgeMs;
      return Math.floor(Math.max(0, Number(durationMs || 0)) / 1000);
    }

    if (condition.metric === 'audibleMedia') {
      return countAudibleMedia(root);
    }

    return countMatches(root, STRUCTURAL_SELECTORS[condition.metric]);
  }

  function hasTimeStructuralTrigger(parsedKeywords = []) {
    return parsedKeywords.some(keywordObj => {
      const condition = global.DAD.parseStructuralKeywordCondition?.(keywordObj?.keyword);
      return Boolean(condition && isTimeMetric(condition.metric));
    });
  }

  function scanStructuralTriggers(parsedKeywords = [], calculateScore, root = global.document) {
    if (global.pageBlocked || typeof calculateScore !== 'function') {
      return 0;
    }

    let appliedCount = 0;

    parsedKeywords.forEach(keywordObj => {
      const condition = global.DAD.parseStructuralKeywordCondition?.(keywordObj?.keyword);
      if (!condition) {
        return;
      }

      const key = getStructuralTriggerKey(keywordObj);
      if (global.structuralTriggerKeys?.has(key)) {
        return;
      }

      const count = getConditionValue(condition, root);
      if (!conditionMatches(count, condition)) {
        return;
      }

      global.structuralTriggerKeys?.add(key);
      calculateScore(
        keywordObj.operation,
        keywordObj.value,
        keywordObj.keyword,
        getStructuralContext(condition, count),
        'structural'
      );
      appliedCount += 1;
    });

    return appliedCount;
  }

  contentBlocking.structuralTriggers = {
    conditionMatches,
    countMatches,
    hasTimeStructuralTrigger,
    scanStructuralTriggers
  };
})(window);
