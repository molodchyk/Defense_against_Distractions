// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export const LEGACY_KEYWORD_BLOCK_SCORE_THRESHOLD = 1000;
export const NORMALIZED_KEYWORD_BLOCK_SCORE_THRESHOLD = 100;
export const STRUCTURAL_KEYWORD_PREFIX = 'has:';

const STRUCTURAL_KEYWORD_METRIC_ALIASES = {
  audio: 'audio',
  audios: 'audio',
  audible: 'audibleMedia',
  audiblemedia: 'audibleMedia',
  comment: 'commentSection',
  comments: 'commentSection',
  commentsection: 'commentSection',
  commentsections: 'commentSection',
  feed: 'feed',
  feeds: 'feed',
  gif: 'gif',
  gifs: 'gif',
  iframe: 'iframe',
  iframes: 'iframe',
  image: 'image',
  images: 'image',
  link: 'link',
  links: 'link',
  media: 'media',
  playingmedia: 'audibleMedia',
  recommendation: 'recommendationRegion',
  recommendations: 'recommendationRegion',
  recommendationregion: 'recommendationRegion',
  recommendationregions: 'recommendationRegion',
  recommended: 'recommendationRegion',
  related: 'recommendationRegion',
  reel: 'shortFormMedia',
  reels: 'shortFormMedia',
  sound: 'audibleMedia',
  sounds: 'audibleMedia',
  short: 'shortFormMedia',
  shorts: 'shortFormMedia',
  shortform: 'shortFormMedia',
  shortformmedia: 'shortFormMedia',
  active: 'activeSeconds',
  activesecond: 'activeSeconds',
  activeseconds: 'activeSeconds',
  activepage: 'activeSeconds',
  activepageseconds: 'activeSeconds',
  elapsed: 'pageSeconds',
  pageage: 'pageSeconds',
  pageageseconds: 'pageSeconds',
  pagesecond: 'pageSeconds',
  pageseconds: 'pageSeconds',
  seconds: 'pageSeconds',
  video: 'video',
  videos: 'video'
};

const NORMALIZED_KEYWORD_SCORE_PATTERN = /^([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*(?:%|\/\s*100)$/i;

function clampKeywordScore(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.min(Math.max(number, min), max);
}

export function splitKeywordEntry(keyword) {
  return keyword.split(/(?<!\\),/).map(part => part.trim().replace(/\\,/g, ','));
}

export function parseKeywordScoreValue(value) {
  const scoreText = String(value ?? '').trim();
  if (!scoreText) {
    return null;
  }

  const normalizedMatch = scoreText.match(NORMALIZED_KEYWORD_SCORE_PATTERN);
  if (normalizedMatch) {
    const normalizedScore = Number.parseFloat(normalizedMatch[1]);
    return Number.isFinite(normalizedScore)
      ? (normalizedScore / NORMALIZED_KEYWORD_BLOCK_SCORE_THRESHOLD) * LEGACY_KEYWORD_BLOCK_SCORE_THRESHOLD
      : null;
  }

  const legacyScore = Number(scoreText);
  return Number.isFinite(legacyScore) ? legacyScore : null;
}

export function isNormalizedKeywordScoreValue(value) {
  return NORMALIZED_KEYWORD_SCORE_PATTERN.test(String(value ?? '').trim());
}

export function parseKeywordForScanning(keywordStr) {
  let keyword = '';
  let operation = '+';
  let value = 1000;

  if (!keywordStr) {
    return { keyword, operation, value };
  }

  const parts = splitKeywordEntry(keywordStr);
  keyword = parts[0];

  if (parts.length > 1) {
    const secondPart = parts[1];
    const parsedScore = parseKeywordScoreValue(secondPart);
    if (parsedScore !== null) {
      value = parsedScore;
    } else {
      operation = secondPart === '+' || secondPart === '*' ? secondPart : '+';
    }
  }

  if (parts.length > 2) {
    const parsedScore = parseKeywordScoreValue(parts[2]);
    if (parsedScore !== null) {
      value = parsedScore;
    }
  }

  return { keyword, operation, value };
}

export function parseStructuralKeywordCondition(keyword = '') {
  const normalized = String(keyword || '').trim().toLowerCase();
  if (!normalized.startsWith(STRUCTURAL_KEYWORD_PREFIX)) {
    return null;
  }

  const expression = normalized.slice(STRUCTURAL_KEYWORD_PREFIX.length).trim();
  const match = expression.match(/^([a-z]+)\s*(?:(>=|>|=|==)\s*(\d+))?$/);
  if (!match) {
    return null;
  }

  const metric = STRUCTURAL_KEYWORD_METRIC_ALIASES[match[1]];
  if (!metric) {
    return null;
  }

  const operator = match[2] === '==' ? '=' : (match[2] || '>=');
  const count = Number.parseInt(match[3] || '1', 10);
  if (!Number.isFinite(count) || count < 0) {
    return null;
  }

  return { metric, operator, count };
}

export function parseKeywordForEditing(keyword) {
  const parts = splitKeywordEntry(keyword);
  const word = parts[0];
  const sign = parts.length === 3 ? parts[1] : null;
  const value = parts.length >= 2 ? parseKeywordScoreValue(parts[parts.length - 1]) : null;

  return [word, sign, value];
}

export function normalizeKeywordScore(score, threshold = LEGACY_KEYWORD_BLOCK_SCORE_THRESHOLD) {
  const normalizedThreshold = clampKeywordScore(threshold, 1, Number.MAX_SAFE_INTEGER);
  const normalizedScore = (clampKeywordScore(score, 0, Number.MAX_SAFE_INTEGER) / normalizedThreshold) * NORMALIZED_KEYWORD_BLOCK_SCORE_THRESHOLD;
  return Math.round(clampKeywordScore(normalizedScore, 0, NORMALIZED_KEYWORD_BLOCK_SCORE_THRESHOLD));
}

export function normalizeKeywordScoreDelta(value, threshold = LEGACY_KEYWORD_BLOCK_SCORE_THRESHOLD) {
  const normalizedThreshold = clampKeywordScore(threshold, 1, Number.MAX_SAFE_INTEGER);
  const normalizedDelta = (clampKeywordScore(value, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER) / normalizedThreshold) * NORMALIZED_KEYWORD_BLOCK_SCORE_THRESHOLD;
  return Math.round(clampKeywordScore(normalizedDelta, -NORMALIZED_KEYWORD_BLOCK_SCORE_THRESHOLD, NORMALIZED_KEYWORD_BLOCK_SCORE_THRESHOLD));
}
