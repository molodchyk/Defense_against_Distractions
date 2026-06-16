// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getActiveIntentSession,
  getIntentInterventionDecision,
  recordIntentPageVisit
} from '../../../../src/js/shared/intentCoherence.js';

describe('intent coherence unanchored sessions', () => {
  function pageSignal(overrides = {}) {
    return {
      url: 'https://start.example.com/',
      hostname: 'start.example.com',
      title: 'Start',
      text: {
        sampleLength: 0,
        wordCount: 0,
        emojiCount: 0,
        topTokens: []
      },
      media: {
        imageCount: 1,
        videoCount: 0,
        audioCount: 0,
        gifCount: 0,
        iframeCount: 0
      },
      interaction: {
        linkCount: 4,
        buttonCount: 1,
        inputCount: 0,
        formCount: 0
      },
      structure: {
        elementCount: 80,
        feedCount: 0
      },
      activity: {
        pageAgeMs: 0,
        activePageMs: 0,
        scrollEvents: 0,
        clickEvents: 0,
        recommenderClickEvents: 0,
        keyEvents: 0,
        inputEvents: 0,
        recommenderClickRatePerMinute: 0,
        maxScrollDepthRatio: 0
      },
      ...overrides
    };
  }

  function passiveDriftSignal(url, hostname, title, topTokens = ['trending', 'reaction', 'clips']) {
    return pageSignal({
      url,
      hostname,
      title,
      text: {
        sampleLength: 1200,
        wordCount: 120,
        emojiCount: 4,
        topTokens
      },
      media: {
        imageCount: 28,
        videoCount: 3,
        audioCount: 0,
        gifCount: 5,
        iframeCount: 2
      },
      interaction: {
        linkCount: 220,
        buttonCount: 48,
        inputCount: 0,
        formCount: 0
      },
      structure: {
        elementCount: 360,
        feedCount: 3
      },
      activity: {
        pageAgeMs: 240_000,
        activePageMs: 220_000,
        scrollEvents: 20,
        clickEvents: 9,
        recommenderClickEvents: 3,
        keyEvents: 0,
        inputEvents: 0,
        recommenderClickRatePerMinute: 0.8,
        mediaPlaybackMs: 180_000,
        mediaPlayEvents: 1,
        maxScrollDepthRatio: 0.9
      }
    });
  }

  it('flags weak-origin passive fragmentation as an unanchored session', () => {
    let state = recordIntentPageVisit(null, pageSignal(), { now: () => 1000 });
    [
      passiveDriftSignal('https://video.example.com/feed', 'video.example.com', 'Trending reaction feed'),
      passiveDriftSignal('https://shop.example.com/deals', 'shop.example.com', 'Daily deal carousel', ['daily', 'deals', 'cart']),
      passiveDriftSignal('https://social.example.com/trending', 'social.example.com', 'Trending social clips')
    ].forEach((signal, index) => {
      state = recordIntentPageVisit(state, signal, { now: () => 2000 + index });
    });

    const activeSession = getActiveIntentSession(state);
    const reasonLines = getIntentInterventionDecision(activeSession).reasonLines;

    assert.ok(activeSession.metrics.originAnchorStrength < 0.45);
    assert.ok(activeSession.metrics.missingOriginAnchorLoad > 0.5);
    assert.ok(activeSession.metrics.unanchoredSessionLoad >= 0.55);
    assert.ok(reasonLines.includes('Unanchored passive or fragmented session'));
  });

  it('does not call a noisy chain unanchored when the origin was a clear search', () => {
    let state = recordIntentPageVisit(null, pageSignal({
      url: 'https://search.example.com/search?q=pde5+inhibitor+mechanism',
      hostname: 'search.example.com',
      title: 'Search results for PDE5 inhibitor mechanism',
      text: {
        sampleLength: 1000,
        wordCount: 120,
        emojiCount: 0,
        topTokens: ['pde5', 'inhibitor', 'mechanism', 'sildenafil']
      },
      interaction: {
        linkCount: 14,
        buttonCount: 2,
        inputCount: 1,
        formCount: 1
      },
      activity: {
        pageAgeMs: 0,
        activePageMs: 0,
        scrollEvents: 0,
        clickEvents: 0,
        recommenderClickEvents: 0,
        keyEvents: 4,
        inputEvents: 1,
        recommenderClickRatePerMinute: 0,
        maxScrollDepthRatio: 0
      }
    }), { now: () => 1000 });
    [
      passiveDriftSignal('https://video.example.com/feed', 'video.example.com', 'Trending reaction feed'),
      passiveDriftSignal('https://shop.example.com/deals', 'shop.example.com', 'Daily deal carousel', ['daily', 'deals', 'cart']),
      passiveDriftSignal('https://social.example.com/trending', 'social.example.com', 'Trending social clips')
    ].forEach((signal, index) => {
      state = recordIntentPageVisit(state, signal, { now: () => 2000 + index });
    });

    const activeSession = getActiveIntentSession(state);
    const reasonLines = getIntentInterventionDecision(activeSession).reasonLines;

    assert.ok(activeSession.metrics.originAnchorStrength >= 0.45);
    assert.equal(activeSession.metrics.unanchoredSessionLoad, 0);
    assert.ok(!reasonLines.includes('Unanchored passive or fragmented session'));
  });
});
