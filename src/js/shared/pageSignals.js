// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

const DEFAULT_TEXT_SAMPLE_LIMIT = 20000;
const DEFAULT_TEXT_TOKEN_LIMIT = 24;
const MIN_RATE_WINDOW_MS = 30 * 1000;
const MAX_RATE_PER_MINUTE = 600;
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

function normalizeEventCount(value) {
  return Math.max(0, Number(value || 0));
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
  const recommenderClickEvents = normalizeEventCount(activity.recommenderClickEvents);
  const keyEvents = normalizeEventCount(activity.keyEvents);
  const inputEvents = normalizeEventCount(activity.inputEvents);

  return {
    pageAgeMs,
    activePageMs,
    scrollEvents,
    clickEvents,
    recommenderClickEvents,
    keyEvents,
    inputEvents,
    scrollRatePerMinute: calculateRatePerMinute(scrollEvents, activePageMs, pageAgeMs),
    clickRatePerMinute: calculateRatePerMinute(clickEvents, activePageMs, pageAgeMs),
    recommenderClickRatePerMinute: calculateRatePerMinute(recommenderClickEvents, activePageMs, pageAgeMs),
    keyRatePerMinute: calculateRatePerMinute(keyEvents, activePageMs, pageAgeMs),
    inputRatePerMinute: calculateRatePerMinute(inputEvents, activePageMs, pageAgeMs),
    maxScrollDepthRatio: clamp(Number(activity.maxScrollDepthRatio || 0), 0, 1)
  };
}

export function collectPageSignals(root = globalThis.document, options = {}) {
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
    url: String(root?.location?.href || globalThis.location?.href || ''),
    hostname: String(root?.location?.hostname || globalThis.location?.hostname || ''),
    title: String(root?.title || globalThis.document?.title || ''),
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
      ...normalizeActivitySignals(options.activity, options)
    }
  };
}
