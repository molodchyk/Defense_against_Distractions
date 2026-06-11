// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk


import { TEXT_TOKEN_LIMIT, TOKEN_LIMIT } from './constants.js';
import {
  clamp,
  getHostnameFromUrl,
  getTimestamp,
  normalizeDurationMs,
  normalizeEventCount,
  normalizeRatePerMinute,
  normalizeString,
  normalizeTabId,
  normalizeTransitionQualifiers,
  normalizeTransitionType,
  tokenize,
  uniqueTokens
} from './utils.js';

function normalizeTokenArray(value, limit = TOKEN_LIMIT) {
  return Array.isArray(value)
    ? uniqueTokens(value.flatMap(token => tokenize(token))).slice(0, limit)
    : [];
}

export function extractIntentTokens(signal = {}) {
  const url = normalizeString(signal.url);
  const hostname = normalizeString(signal.hostname) || getHostnameFromUrl(url);
  const title = normalizeString(signal.title);

  return uniqueTokens([
    ...tokenize(hostname),
    ...tokenize(url),
    ...tokenize(title)
  ]);
}

function extractTextTokens(signal = {}) {
  return normalizeTokenArray(signal.text?.topTokens, TEXT_TOKEN_LIMIT);
}

export function calculateTokenSimilarity(firstTokens = [], secondTokens = []) {
  const first = new Set(firstTokens);
  const second = new Set(secondTokens);

  if (first.size === 0 && second.size === 0) {
    return 1;
  }

  if (first.size === 0 || second.size === 0) {
    return 0;
  }

  let intersection = 0;
  first.forEach(token => {
    if (second.has(token)) {
      intersection += 1;
    }
  });

  const union = new Set([...first, ...second]).size;
  return union === 0 ? 0 : intersection / union;
}

export function normalizePageSignalForIntent(signal = {}, options = {}) {
  const url = normalizeString(signal.url);
  const hostname = normalizeString(signal.hostname) || getHostnameFromUrl(url);
  const title = normalizeString(signal.title);
  const collectedAt = normalizeString(signal.collectedAt) || new Date(getTimestamp(options)).toISOString();
  const metadataTokens = extractIntentTokens({ url, hostname, title });
  const textTokens = extractTextTokens(signal);
  const tokens = uniqueTokens([...metadataTokens, ...textTokens]).slice(0, TOKEN_LIMIT + TEXT_TOKEN_LIMIT);
  const pageAgeMs = normalizeDurationMs(signal.activity?.pageAgeMs);
  const activePageMs = Math.min(
    pageAgeMs,
    normalizeDurationMs(signal.activity?.activePageMs, pageAgeMs)
  );
  const scrollEvents = normalizeEventCount(signal.activity?.scrollEvents);
  const clickEvents = normalizeEventCount(signal.activity?.clickEvents);
  const recommenderClickEvents = normalizeEventCount(signal.activity?.recommenderClickEvents);
  const keyEvents = normalizeEventCount(signal.activity?.keyEvents);
  const inputEvents = normalizeEventCount(signal.activity?.inputEvents);

  return {
    url,
    hostname,
    title,
    collectedAt,
    tokens,
    metadataTokens,
    textTokens,
    text: {
      wordCount: Number(signal.text?.wordCount || 0),
      sampleLength: Number(signal.text?.sampleLength || 0),
      emojiCount: Number(signal.text?.emojiCount || 0),
      topTokens: textTokens
    },
    media: {
      imageCount: Number(signal.media?.imageCount || 0),
      videoCount: Number(signal.media?.videoCount || 0),
      audioCount: Number(signal.media?.audioCount || 0),
      gifCount: Number(signal.media?.gifCount || 0),
      iframeCount: Number(signal.media?.iframeCount || 0)
    },
    interaction: {
      linkCount: Number(signal.interaction?.linkCount || 0),
      buttonCount: Number(signal.interaction?.buttonCount || 0),
      inputCount: Number(signal.interaction?.inputCount || 0),
      formCount: Number(signal.interaction?.formCount || 0)
    },
    structure: {
      elementCount: Number(signal.structure?.elementCount || 0),
      feedCount: Number(signal.structure?.feedCount || 0)
    },
    activity: {
      pageAgeMs,
      activePageMs,
      scrollEvents,
      clickEvents,
      recommenderClickEvents,
      keyEvents,
      inputEvents,
      scrollRatePerMinute: normalizeRatePerMinute(signal.activity?.scrollRatePerMinute, scrollEvents, activePageMs, pageAgeMs),
      clickRatePerMinute: normalizeRatePerMinute(signal.activity?.clickRatePerMinute, clickEvents, activePageMs, pageAgeMs),
      recommenderClickRatePerMinute: normalizeRatePerMinute(signal.activity?.recommenderClickRatePerMinute, recommenderClickEvents, activePageMs, pageAgeMs),
      keyRatePerMinute: normalizeRatePerMinute(signal.activity?.keyRatePerMinute, keyEvents, activePageMs, pageAgeMs),
      inputRatePerMinute: normalizeRatePerMinute(signal.activity?.inputRatePerMinute, inputEvents, activePageMs, pageAgeMs),
      maxScrollDepthRatio: clamp(Number(signal.activity?.maxScrollDepthRatio || 0), 0, 1)
    }
  };
}

export function normalizeIntentNavigationTransition(transition = {}, options = {}) {
  const now = getTimestamp(options);
  const tabId = normalizeTabId(transition.tabId);
  return {
    tabId,
    frameId: Number.isFinite(Number(transition.frameId)) ? Number(transition.frameId) : null,
    url: normalizeString(transition.url),
    transitionType: normalizeTransitionType(transition.transitionType),
    transitionQualifiers: normalizeTransitionQualifiers(transition.transitionQualifiers),
    transitionSource: normalizeString(transition.transitionSource || transition.source),
    transitionAt: normalizeString(transition.transitionAt) || new Date(now).toISOString()
  };
}
