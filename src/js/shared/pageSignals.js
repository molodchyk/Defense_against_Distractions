// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

const DEFAULT_TEXT_SAMPLE_LIMIT = 20000;

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
    collectedAt: new Date().toISOString(),
    text: {
      sampleLength: textSample.length,
      wordCount: countWords(textSample),
      emojiCount: countEmojis(textSample)
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
    }
  };
}
