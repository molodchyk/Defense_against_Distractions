// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

const DEFAULT_TEXT_SAMPLE_LIMIT = 20000;
const DEFAULT_TEXT_TOKEN_LIMIT = 24;
const DEFAULT_CONTEXT_TOKEN_LIMIT = 12;
const MAX_CONTEXT_TEXT_LENGTH = 1000;
const MIN_RATE_WINDOW_MS = 30 * 1000;
const MAX_RATE_PER_MINUTE = 600;
const FEED_SELECTOR = '[role="feed"], [aria-label*="feed" i], [class*="feed" i]';
const RECOMMENDATION_REGION_SELECTOR = [
  '[aria-label*="recommend" i], [aria-label*="related" i], [aria-label*="suggest" i]',
  '[id*="recommend" i], [id*="related" i], [id*="watch-next" i]',
  '[class*="recommend" i], [class*="related" i], [class*="suggest" i]',
  'ytd-watch-next-secondary-results-renderer',
  'ytd-compact-video-renderer'
].join(', ');
const COMMENT_SECTION_SELECTOR = [
  '[aria-label*="comment" i], [id*="comment" i], [class*="comment" i], [data-testid*="comment" i]',
  'ytd-comments',
  'shreddit-comment-tree'
].join(', ');
const SHORT_FORM_MEDIA_SELECTOR = [
  '[href*="/shorts/"], [href*="/reel/"], [href*="/reels/"]',
  '[aria-label*="shorts" i], [aria-label*="reels" i]',
  '[class*="shorts" i], [class*="reels" i]'
].join(', ');
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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function countMatches(root, selector) {
  if (!root?.querySelectorAll) return 0;
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

function normalizeEventCount(value) {
  return Math.max(0, Number(value || 0));
}

function normalizeDurationMs(value, maxMs = Number.MAX_SAFE_INTEGER) {
  const number = Number(value);
  const durationMs = Number.isFinite(number) ? Math.max(0, number) : 0;
  return Math.min(durationMs, maxMs);
}

function calculateRatePerMinute(count, activePageMs, pageAgeMs) {
  const eventCount = normalizeEventCount(count);
  if (eventCount <= 0) {
    return 0;
  }

  const measuredMs = activePageMs > 0 ? activePageMs : pageAgeMs;
  const minutes = Math.max(measuredMs, MIN_RATE_WINDOW_MS) / (60 * 1000);
  return Math.min(MAX_RATE_PER_MINUTE, Number((eventCount / minutes).toFixed(3)));
}

function getVisibleText(root, sampleLimit = DEFAULT_TEXT_SAMPLE_LIMIT) {
  const text = String(root?.body?.innerText || root?.documentElement?.innerText || root?.innerText || '');
  return text.replace(/\s+/g, ' ').trim().slice(0, sampleLimit);
}

function getNodeText(node) {
  return String(node?.innerText || node?.textContent || '').replace(/\s+/g, ' ').trim();
}

function getHeadingText(root) {
  if (!root?.querySelectorAll) {
    return '';
  }

  return Array.from(root.querySelectorAll('h1, h2'))
    .map(getNodeText)
    .filter(Boolean)
    .join(' ')
    .slice(0, MAX_CONTEXT_TEXT_LENGTH);
}

function getMetaDescription(root) {
  const node = root?.querySelector?.('meta[name="description"], meta[property="og:description"]');
  return String(node?.content || node?.getAttribute?.('content') || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_CONTEXT_TEXT_LENGTH);
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

export function extractTopTextTokens(text, tokenLimit = DEFAULT_TEXT_TOKEN_LIMIT) {
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

function normalizeContextTokens(value, tokenLimit = DEFAULT_CONTEXT_TOKEN_LIMIT) {
  return extractTopTextTokens(Array.isArray(value) ? value.join(' ') : value, tokenLimit);
}

function normalizeActivitySignals(activity = {}, options = {}) {
  const now = Number(options.now?.() || Date.now());
  const startedAt = Number(options.startedAt || now);
  const pageAgeMs = Number.isFinite(activity.pageAgeMs)
    ? Math.max(0, Number(activity.pageAgeMs))
    : Math.max(0, now - startedAt);
  const activePageMs = Number.isFinite(activity.activePageMs)
    ? Math.max(0, Math.min(pageAgeMs, Number(activity.activePageMs)))
    : pageAgeMs;
  const scrollEvents = normalizeEventCount(activity.scrollEvents);
  const clickEvents = normalizeEventCount(activity.clickEvents);
  const recommendationClickEvents = normalizeEventCount(activity.recommendationClickEvents);
  const feedClickEvents = normalizeEventCount(activity.feedClickEvents);
  const commentClickEvents = normalizeEventCount(activity.commentClickEvents);
  const zoneClickEvents = recommendationClickEvents + feedClickEvents + commentClickEvents;
  const recommenderClickEvents = Math.max(normalizeEventCount(activity.recommenderClickEvents), zoneClickEvents);
  const keyEvents = normalizeEventCount(activity.keyEvents);
  const inputEvents = normalizeEventCount(activity.inputEvents);
  const activeInputMs = normalizeDurationMs(activity.activeInputMs, activePageMs || pageAgeMs);
  const mediaPlayEvents = normalizeEventCount(activity.mediaPlayEvents);
  const mediaPauseEvents = normalizeEventCount(activity.mediaPauseEvents);
  const mediaEndEvents = normalizeEventCount(activity.mediaEndEvents);
  const mediaSourceChangeEvents = normalizeEventCount(activity.mediaSourceChangeEvents);
  const scrollDirectionChanges = normalizeEventCount(activity.scrollDirectionChanges);
  const scrollDistanceViewportUnits = clamp(Number(activity.scrollDistanceViewportUnits || 0), 0, 1000);
  const dynamicContentBatches = normalizeEventCount(activity.dynamicContentBatches);
  const dynamicAddedElements = normalizeEventCount(activity.dynamicAddedElements);
  const scrollLinkedContentBatches = normalizeEventCount(activity.scrollLinkedContentBatches);
  const scrollLinkedAddedElements = normalizeEventCount(activity.scrollLinkedAddedElements);
  const mediaPlaybackMs = normalizeDurationMs(activity.mediaPlaybackMs, activePageMs || pageAgeMs);

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
    scrollRatePerMinute: calculateRatePerMinute(scrollEvents, activePageMs, pageAgeMs),
    clickRatePerMinute: calculateRatePerMinute(clickEvents, activePageMs, pageAgeMs),
    recommenderClickRatePerMinute: calculateRatePerMinute(recommenderClickEvents, activePageMs, pageAgeMs),
    recommendationClickRatePerMinute: calculateRatePerMinute(recommendationClickEvents, activePageMs, pageAgeMs),
    feedClickRatePerMinute: calculateRatePerMinute(feedClickEvents, activePageMs, pageAgeMs),
    commentClickRatePerMinute: calculateRatePerMinute(commentClickEvents, activePageMs, pageAgeMs),
    keyRatePerMinute: calculateRatePerMinute(keyEvents, activePageMs, pageAgeMs),
    inputRatePerMinute: calculateRatePerMinute(inputEvents, activePageMs, pageAgeMs),
    mediaPlayRatePerMinute: calculateRatePerMinute(mediaPlayEvents, activePageMs, pageAgeMs),
    mediaPauseRatePerMinute: calculateRatePerMinute(mediaPauseEvents, activePageMs, pageAgeMs),
    mediaEndRatePerMinute: calculateRatePerMinute(mediaEndEvents, activePageMs, pageAgeMs),
    mediaSourceChangeRatePerMinute: calculateRatePerMinute(mediaSourceChangeEvents, activePageMs, pageAgeMs),
    maxScrollDepthRatio: clamp(Number(activity.maxScrollDepthRatio || 0), 0, 1)
  };
}

export function collectPageSignals(root = globalThis.document, options = {}) {
  const textSample = getVisibleText(root, options.textSampleLimit);
  const headingText = getHeadingText(root);
  const metaDescription = getMetaDescription(root);
  const contextTokenLimit = options.contextTokenLimit || DEFAULT_CONTEXT_TOKEN_LIMIT;
  const linkCount = countMatches(root, 'a[href]');
  const imageCount = countMatches(root, 'img, picture, svg');
  const videoCount = countMatches(root, 'video');
  const audioCount = countMatches(root, 'audio');
  const audibleMediaCount = countAudibleMedia(root);
  const gifCount = countMatches(root, 'img[src*=".gif" i], source[src*=".gif" i]');
  const buttonCount = countMatches(root, 'button, [role="button"]');
  const inputCount = countMatches(root, 'input, textarea, select, [contenteditable="true"]');
  const formCount = countMatches(root, 'form');
  const iframeCount = countMatches(root, 'iframe');
  const feedCount = countMatches(root, FEED_SELECTOR);
  const recommendationRegionCount = countMatches(root, RECOMMENDATION_REGION_SELECTOR);
  const commentSectionCount = countMatches(root, COMMENT_SECTION_SELECTOR);
  const shortFormMediaCount = countMatches(root, SHORT_FORM_MEDIA_SELECTOR);

  return {
    url: String(root?.location?.href || globalThis.location?.href || ''),
    hostname: String(root?.location?.hostname || globalThis.location?.hostname || ''),
    title: String(root?.title || globalThis.document?.title || ''),
    collectedAt: new Date().toISOString(),
    text: {
      sampleLength: textSample.length,
      wordCount: countWords(textSample),
      emojiCount: countEmojis(textSample),
      topTokens: extractTopTextTokens(textSample, options.textTokenLimit),
      headingTokens: extractTopTextTokens(headingText, contextTokenLimit),
      descriptionTokens: extractTopTextTokens(metaDescription, contextTokenLimit),
      clickedLinkTokens: normalizeContextTokens(options.activity?.clickedLinkTokens, contextTokenLimit),
      selectedTextTokens: normalizeContextTokens(options.activity?.selectedTextTokens, contextTokenLimit)
    },
    media: {
      imageCount,
      videoCount,
      audioCount,
      audibleMediaCount,
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
      feedCount,
      recommendationRegionCount,
      commentSectionCount,
      shortFormMediaCount
    },
    activity: {
      ...normalizeActivitySignals(options.activity, options)
    }
  };
}
