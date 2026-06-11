// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  collectPageSignals,
  extractTopTextTokens
} from '../../../src/js/shared/pageSignals.js';

describe('page signal helpers', () => {
  function createFakeRoot(counts, text = '') {
    return {
      location: {
        href: 'https://example.com/feed',
        hostname: 'example.com'
      },
      body: {
        innerText: text
      },
      querySelectorAll(selector) {
        return Array.from({ length: counts[selector] || 0 });
      }
    };
  }

  it('collects page media, interaction, and structure counts', () => {
    const root = createFakeRoot({
      'a[href]': 8,
      'img, picture, svg': 3,
      video: 2,
      audio: 1,
      'img[src*=".gif" i], source[src*=".gif" i]': 1,
      'button, [role="button"]': 5,
      'input, textarea, select, [contenteditable="true"]': 2,
      form: 1,
      iframe: 4,
      '[role="feed"], [aria-label*="feed" i], [class*="feed" i]': 1,
      '*': 40
    }, 'hello world 🎯');
    const signals = collectPageSignals(root);

    assert.match(signals.collectedAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.deepEqual({
      ...signals,
      collectedAt: 'timestamp'
    }, {
      url: 'https://example.com/feed',
      hostname: 'example.com',
      title: '',
      collectedAt: 'timestamp',
      text: {
        sampleLength: 14,
        wordCount: 2,
        emojiCount: 1,
        topTokens: ['hello', 'world']
      },
      media: {
        imageCount: 3,
        videoCount: 2,
        audioCount: 1,
        gifCount: 1,
        iframeCount: 4
      },
      interaction: {
        linkCount: 8,
        buttonCount: 5,
        inputCount: 2,
        formCount: 1
      },
      structure: {
        elementCount: 40,
        feedCount: 1
      },
      activity: {
        pageAgeMs: 0,
        activePageMs: 0,
        scrollEvents: 0,
        clickEvents: 0,
        recommenderClickEvents: 0,
        keyEvents: 0,
        inputEvents: 0,
        scrollRatePerMinute: 0,
        clickRatePerMinute: 0,
        recommenderClickRatePerMinute: 0,
        keyRatePerMinute: 0,
        inputRatePerMinute: 0,
        maxScrollDepthRatio: 0
      }
    });
  });

  it('extracts bounded visible-text topic tokens by frequency', () => {
    assert.deepEqual(
      extractTopTextTokens('PDE5 mechanism PDE5 sildenafil news news news', 3),
      ['news', 'pde5', 'mechanism']
    );
  });

  it('limits text samples before counting text signals', () => {
    const root = createFakeRoot({}, 'one two three four');
    const signals = collectPageSignals(root, { textSampleLimit: 7 });

    assert.equal(signals.text.sampleLength, 7);
    assert.equal(signals.text.wordCount, 2);
    assert.deepEqual(signals.text.topTokens, ['one', 'two']);
  });

  it('includes summarized activity signals without recording raw input', () => {
    const root = createFakeRoot({}, 'activity test');
    const signals = collectPageSignals(root, {
      activity: {
        pageAgeMs: 60000,
        activePageMs: 60000,
        scrollEvents: 12,
        clickEvents: 3,
        recommenderClickEvents: 2,
        keyEvents: 4,
        inputEvents: 2,
        maxScrollDepthRatio: 0.8
      }
    });

    assert.deepEqual(signals.activity, {
      pageAgeMs: 60000,
      activePageMs: 60000,
      scrollEvents: 12,
      clickEvents: 3,
      recommenderClickEvents: 2,
      keyEvents: 4,
      inputEvents: 2,
      scrollRatePerMinute: 12,
      clickRatePerMinute: 3,
      recommenderClickRatePerMinute: 2,
      keyRatePerMinute: 4,
      inputRatePerMinute: 2,
      maxScrollDepthRatio: 0.8
    });
  });
});
