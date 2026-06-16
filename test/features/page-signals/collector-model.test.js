// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  collectPageSignals,
  extractTopTextTokens
} from '../../../src/features/page-signals/core/collectorModel.js';

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
        const value = counts[selector]
          ?? Object.entries(counts).find(([key]) => selector.includes(key))?.[1]
          ?? 0;
        return Array.isArray(value) ? value : Array.from({ length: value });
      }
    };
  }

  it('collects page media, interaction, and structure counts', () => {
    const root = createFakeRoot({
      'a[href]': 8,
      'img, picture, svg': 3,
      video: 2,
      audio: 1,
      'audio, video': [
        { tagName: 'VIDEO', paused: false, ended: false, muted: false, volume: 1 },
        { tagName: 'AUDIO', paused: false, ended: false, muted: true, volume: 1 },
        { tagName: 'VIDEO', paused: true, ended: false, muted: false, volume: 1 }
      ],
      'img[src*=".gif" i], source[src*=".gif" i]': 1,
      'button, [role="button"]': 5,
      'input, textarea, select, [contenteditable="true"]': 2,
      form: 1,
      iframe: 4,
      '[role="feed"], [aria-label*="feed" i], [class*="feed" i]': 1,
      recommend: 2,
      comment: 3,
      '/shorts/': 4,
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
        topTokens: ['hello', 'world'],
        headingTokens: [],
        descriptionTokens: [],
        clickedLinkTokens: [],
        selectedTextTokens: []
      },
      media: {
        imageCount: 3,
        videoCount: 2,
        audioCount: 1,
        audibleMediaCount: 1,
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
        feedCount: 1,
        recommendationRegionCount: 2,
        commentSectionCount: 3,
        shortFormMediaCount: 4
      },
      activity: {
        pageAgeMs: 0,
        activePageMs: 0,
        scrollEvents: 0,
        scrollDirectionChanges: 0,
        scrollDistanceViewportUnits: 0,
        dynamicContentBatches: 0,
        dynamicAddedElements: 0,
        scrollLinkedContentBatches: 0,
        scrollLinkedAddedElements: 0,
        clickEvents: 0,
        recommenderClickEvents: 0,
        recommendationClickEvents: 0,
        feedClickEvents: 0,
        commentClickEvents: 0,
        keyEvents: 0,
        inputEvents: 0,
        activeInputMs: 0,
        mediaPlaybackMs: 0,
        mediaPlayEvents: 0,
        mediaPauseEvents: 0,
        mediaEndEvents: 0,
        mediaSourceChangeEvents: 0,
        scrollRatePerMinute: 0,
        clickRatePerMinute: 0,
        recommenderClickRatePerMinute: 0,
        recommendationClickRatePerMinute: 0,
        feedClickRatePerMinute: 0,
        commentClickRatePerMinute: 0,
        keyRatePerMinute: 0,
        inputRatePerMinute: 0,
        mediaPlayRatePerMinute: 0,
        mediaPauseRatePerMinute: 0,
        mediaEndRatePerMinute: 0,
        mediaSourceChangeRatePerMinute: 0,
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

  it('extracts bounded heading and meta-description topic tokens', () => {
    const root = {
      ...createFakeRoot({}, 'body text'),
      querySelectorAll(selector) {
        if (selector === 'h1, h2') {
          return [
            { innerText: 'PDE5 inhibitor guide' },
            { textContent: 'Mechanism evidence' }
          ];
        }

        return [];
      },
      querySelector(selector) {
        if (selector === 'meta[name="description"], meta[property="og:description"]') {
          return { content: 'Sildenafil mechanism and inhibitor reference' };
        }

        return null;
      }
    };
    const signals = collectPageSignals(root, { contextTokenLimit: 3 });

    assert.deepEqual(signals.text.headingTokens, ['pde5', 'inhibitor', 'guide']);
    assert.deepEqual(signals.text.descriptionTokens, ['sildenafil', 'mechanism', 'inhibitor']);
  });

  it('normalizes clicked-link and selected-text context tokens from activity options', () => {
    const root = createFakeRoot({}, 'body text');
    const signals = collectPageSignals(root, {
      contextTokenLimit: 3,
      activity: {
        clickedLinkTokens: ['PDE5 inhibitor mechanism'],
        selectedTextTokens: ['sildenafil dosage evidence trial']
      }
    });

    assert.deepEqual(signals.text.clickedLinkTokens, ['pde5', 'inhibitor', 'mechanism']);
    assert.deepEqual(signals.text.selectedTextTokens, ['sildenafil', 'dosage', 'evidence']);
    assert.equal('clickedLinkTokens' in signals.activity, false);
    assert.equal('selectedTextTokens' in signals.activity, false);
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
        scrollDirectionChanges: 3,
        scrollDistanceViewportUnits: 8.5,
        dynamicContentBatches: 4,
        dynamicAddedElements: 90,
        scrollLinkedContentBatches: 2,
        scrollLinkedAddedElements: 60,
        clickEvents: 3,
        recommenderClickEvents: 2,
        recommendationClickEvents: 0,
        feedClickEvents: 1,
        commentClickEvents: 1,
        keyEvents: 4,
        inputEvents: 2,
        activeInputMs: 45000,
        mediaPlaybackMs: 30000,
        mediaPlayEvents: 1,
        mediaPauseEvents: 1,
        mediaEndEvents: 1,
        mediaSourceChangeEvents: 2,
        maxScrollDepthRatio: 0.8
      }
    });

    assert.deepEqual(signals.activity, {
      pageAgeMs: 60000,
      activePageMs: 60000,
      scrollEvents: 12,
      scrollDirectionChanges: 3,
      scrollDistanceViewportUnits: 8.5,
      dynamicContentBatches: 4,
      dynamicAddedElements: 90,
      scrollLinkedContentBatches: 2,
      scrollLinkedAddedElements: 60,
      clickEvents: 3,
      recommenderClickEvents: 2,
      recommendationClickEvents: 0,
      feedClickEvents: 1,
      commentClickEvents: 1,
      keyEvents: 4,
      inputEvents: 2,
      activeInputMs: 45000,
      mediaPlaybackMs: 30000,
      mediaPlayEvents: 1,
      mediaPauseEvents: 1,
      mediaEndEvents: 1,
      mediaSourceChangeEvents: 2,
      scrollRatePerMinute: 12,
      clickRatePerMinute: 3,
      recommenderClickRatePerMinute: 2,
      recommendationClickRatePerMinute: 0,
      feedClickRatePerMinute: 1,
      commentClickRatePerMinute: 1,
      keyRatePerMinute: 4,
      inputRatePerMinute: 2,
      mediaPlayRatePerMinute: 1,
      mediaPauseRatePerMinute: 1,
      mediaEndRatePerMinute: 1,
      mediaSourceChangeRatePerMinute: 2,
      maxScrollDepthRatio: 0.8
    });
  });
});
