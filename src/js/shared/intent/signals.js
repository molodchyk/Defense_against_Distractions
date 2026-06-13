// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk


import { TEXT_TOKEN_LIMIT, TOKEN_LIMIT } from './constants.js';
import { normalizeIntentActivitySignals } from './signals/activitySignals.js';
import {
  getHostnameFromUrl,
  getTimestamp,
  normalizeString,
  normalizeTabId,
  normalizeTransitionQualifiers,
  normalizeTransitionType,
  tokenize,
  uniqueTokens
} from './utils.js';

const SEARCH_QUERY_PARAMS = ['q', 'query', 'search', 'text', 'p'];
const TOKEN_WEIGHTS = {
  url: 1,
  title: 3,
  search: 4,
  heading: 2,
  description: 2,
  clickedLink: 3,
  selectedText: 3
};

function normalizeTokenArray(value, limit = TOKEN_LIMIT) {
  return Array.isArray(value)
    ? uniqueTokens(value.flatMap(token => tokenize(token))).slice(0, limit)
    : [];
}

function getParsedUrl(url) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function extractUrlPathText(url) {
  const parsedUrl = getParsedUrl(url);
  return parsedUrl ? parsedUrl.pathname : url;
}

function extractSearchQueryText(url) {
  const parsedUrl = getParsedUrl(url);
  if (!parsedUrl) {
    return '';
  }

  return SEARCH_QUERY_PARAMS
    .flatMap(param => parsedUrl.searchParams.getAll(param))
    .join(' ');
}

function addWeightedTokens(entries, value, source, weight, limit = TOKEN_LIMIT) {
  const tokens = Array.isArray(value)
    ? normalizeTokenArray(value, limit)
    : tokenize(value).slice(0, limit);

  tokens.forEach(token => entries.push({ token, source, weight }));
}

function normalizeWeightedTokenEntries(entries, limit = TOKEN_LIMIT) {
  const weightedTokens = new Map();

  entries.forEach(entry => {
    const token = tokenize(entry?.token)[0];
    const weight = Math.max(0, Number(entry?.weight || 0));
    const source = normalizeString(entry?.source);

    if (!token || weight <= 0 || !source) {
      return;
    }

    const current = weightedTokens.get(token);
    if (!current || weight > current.weight) {
      weightedTokens.set(token, { token, source, weight });
    }
  });

  return Array.from(weightedTokens.values()).slice(0, limit);
}

export function extractWeightedIntentTokens(signal = {}) {
  const url = normalizeString(signal.url);
  const hostname = normalizeString(signal.hostname) || getHostnameFromUrl(url);
  const title = normalizeString(signal.title);
  const entries = [];

  addWeightedTokens(entries, hostname, 'url', TOKEN_WEIGHTS.url);
  addWeightedTokens(entries, extractUrlPathText(url), 'url', TOKEN_WEIGHTS.url);
  addWeightedTokens(entries, extractSearchQueryText(url), 'search', TOKEN_WEIGHTS.search);
  addWeightedTokens(entries, title, 'title', TOKEN_WEIGHTS.title);
  addWeightedTokens(entries, signal.text?.headingTokens, 'heading', TOKEN_WEIGHTS.heading, TEXT_TOKEN_LIMIT);
  addWeightedTokens(entries, signal.text?.descriptionTokens, 'description', TOKEN_WEIGHTS.description, TEXT_TOKEN_LIMIT);
  addWeightedTokens(entries, signal.text?.clickedLinkTokens, 'clickedLink', TOKEN_WEIGHTS.clickedLink, TEXT_TOKEN_LIMIT);
  addWeightedTokens(entries, signal.text?.selectedTextTokens, 'selectedText', TOKEN_WEIGHTS.selectedText, TEXT_TOKEN_LIMIT);

  return normalizeWeightedTokenEntries(entries);
}

export function extractIntentTokens(signal = {}) {
  return extractWeightedIntentTokens(signal).map(entry => entry.token);
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

function toWeightedTokenMap(entries = []) {
  const weightedTokens = new Map();

  (Array.isArray(entries) ? entries : []).forEach(entry => {
    const tokenValue = typeof entry === 'string' ? entry : entry?.token;
    const weight = typeof entry === 'string'
      ? 1
      : Math.max(0, Number(entry?.weight || 0));

    tokenize(tokenValue).forEach(token => {
      const current = weightedTokens.get(token) || 0;
      weightedTokens.set(token, Math.max(current, weight));
    });
  });

  return weightedTokens;
}

export function calculateWeightedTokenSimilarity(firstTokens = [], secondTokens = []) {
  const first = toWeightedTokenMap(firstTokens);
  const second = toWeightedTokenMap(secondTokens);

  if (first.size === 0 && second.size === 0) {
    return 1;
  }

  if (first.size === 0 || second.size === 0) {
    return 0;
  }

  let intersection = 0;
  let union = 0;
  const tokens = new Set([...first.keys(), ...second.keys()]);
  tokens.forEach(token => {
    const firstWeight = first.get(token) || 0;
    const secondWeight = second.get(token) || 0;
    intersection += Math.min(firstWeight, secondWeight);
    union += Math.max(firstWeight, secondWeight);
  });

  return union === 0 ? 0 : intersection / union;
}

export function normalizePageSignalForIntent(signal = {}, options = {}) {
  const url = normalizeString(signal.url);
  const hostname = normalizeString(signal.hostname) || getHostnameFromUrl(url);
  const title = normalizeString(signal.title);
  const collectedAt = normalizeString(signal.collectedAt) || new Date(getTimestamp(options)).toISOString();
  const headingTokens = normalizeTokenArray(signal.text?.headingTokens, TEXT_TOKEN_LIMIT);
  const descriptionTokens = normalizeTokenArray(signal.text?.descriptionTokens, TEXT_TOKEN_LIMIT);
  const clickedLinkTokens = normalizeTokenArray(signal.text?.clickedLinkTokens, TEXT_TOKEN_LIMIT);
  const selectedTextTokens = normalizeTokenArray(signal.text?.selectedTextTokens, TEXT_TOKEN_LIMIT);
  const weightedMetadataTokens = extractWeightedIntentTokens({
    url,
    hostname,
    title,
    text: {
      headingTokens,
      descriptionTokens,
      clickedLinkTokens,
      selectedTextTokens
    }
  });
  const metadataTokens = weightedMetadataTokens.map(entry => entry.token);
  const textTokens = extractTextTokens(signal);
  const tokens = uniqueTokens([...metadataTokens, ...textTokens]).slice(0, TOKEN_LIMIT + TEXT_TOKEN_LIMIT);
  const activitySignals = normalizeIntentActivitySignals(signal.activity);

  return {
    url,
    hostname,
    title,
    collectedAt,
    tokens,
    metadataTokens,
    weightedMetadataTokens,
    textTokens,
    text: {
      wordCount: Number(signal.text?.wordCount || 0),
      sampleLength: Number(signal.text?.sampleLength || 0),
      emojiCount: Number(signal.text?.emojiCount || 0),
      topTokens: textTokens,
      headingTokens,
      descriptionTokens,
      clickedLinkTokens,
      selectedTextTokens
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
      feedCount: Number(signal.structure?.feedCount || 0),
      recommendationRegionCount: Number(signal.structure?.recommendationRegionCount || 0),
      commentSectionCount: Number(signal.structure?.commentSectionCount || 0),
      shortFormMediaCount: Number(signal.structure?.shortFormMediaCount || 0)
    },
    activity: activitySignals
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
