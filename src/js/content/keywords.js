// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const STRUCTURAL_KEYWORD_PREFIX = 'has:';
  const LEGACY_KEYWORD_BLOCK_SCORE_THRESHOLD = 1000;
  const NORMALIZED_KEYWORD_BLOCK_SCORE_THRESHOLD = 100;
  const NORMALIZED_KEYWORD_SCORE_PATTERN = /^([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*(?:%|\/\s*100)$/i;
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

  function parseKeywordScoreValue(value) {
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

  global.DAD.parseKeyword = function(keywordStr) {
    let keyword = '';
    let operation = '+';
    let value = 1000;

    if (!keywordStr) {
      return { keyword, operation, value };
    }

    const parts = keywordStr.split(/(?<!\\),/);
    keyword = parts[0].trim().replace(/\\,/g, ',');

    if (parts.length > 1) {
      const secondPart = parts[1].trim();
      const parsedScore = parseKeywordScoreValue(secondPart);
      if (parsedScore !== null) {
        value = parsedScore;
      } else {
        operation = secondPart === '+' || secondPart === '*' ? secondPart : '+';
      }
    }

    if (parts.length > 2) {
      const parsedScore = parseKeywordScoreValue(parts[2].trim());
      if (parsedScore !== null) {
        value = parsedScore;
      }
    }

    return { keyword, operation, value };
  };

  global.DAD.createKeywordRegex = function(keyword) {
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(escapedKeyword, 'gi');
  };

  global.DAD.parseStructuralKeywordCondition = function(keyword = '') {
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
  };
})(window);
