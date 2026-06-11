// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};

  const DEFAULT_TEXT_SAMPLE_LIMIT = 20000;
  const DEFAULT_TEXT_TOKEN_LIMIT = 24;
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

  function countMatches(root, selector) {
    if (!root?.querySelectorAll) return 0;
    return root.querySelectorAll(selector).length;
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
        ...global.DAD.PageSignalsActivity.getActivitySignals()
      }
    };
  }

  global.DAD.PageSignalsCollector = {
    collectPageSignals,
    extractTopTextTokens
  };
})(window);
