// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getActiveIntentSession,
  getIntentInterventionDecision,
  recordIntentPageVisit
} from '../../../src/js/shared/intentCoherence.js';

describe('intent coherence search refinement loops', () => {
  function pageSignal(overrides = {}) {
    return {
      url: 'https://search.example.com/search?q=pde5+inhibitor+mechanism',
      hostname: 'search.example.com',
      title: 'Search results for PDE5 inhibitor mechanism',
      text: {
        sampleLength: 1000,
        wordCount: 120,
        emojiCount: 0,
        topTokens: ['pde5', 'inhibitor', 'mechanism', 'sildenafil']
      },
      media: {
        imageCount: 1,
        videoCount: 0,
        audioCount: 0,
        gifCount: 0,
        iframeCount: 0
      },
      interaction: {
        linkCount: 16,
        buttonCount: 2,
        inputCount: 1,
        formCount: 1
      },
      structure: {
        elementCount: 180,
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

  it('raises pressure for repeated disconnected search cycles', () => {
    let state = recordIntentPageVisit(null, pageSignal(), { now: () => 1000 });
    [
      pageSignal({
        url: 'https://docs.example.com/pde5-mechanism',
        hostname: 'docs.example.com',
        title: 'PDE5 mechanism reference',
        text: { sampleLength: 1000, wordCount: 250, emojiCount: 0, topTokens: ['pde5', 'mechanism', 'sildenafil'] }
      }),
      pageSignal({
        url: 'https://search.example.com/search?q=best+gaming+laptop+deals',
        hostname: 'search.example.com',
        title: 'Search results for gaming laptop deals',
        text: { sampleLength: 1000, wordCount: 120, emojiCount: 0, topTokens: ['gaming', 'laptop', 'deals'] }
      }),
      pageSignal({
        url: 'https://shop.example.com/laptops',
        hostname: 'shop.example.com',
        title: 'Laptop deals',
        text: { sampleLength: 1000, wordCount: 120, emojiCount: 0, topTokens: ['gaming', 'laptop', 'cart'] }
      }),
      pageSignal({
        url: 'https://search.example.com/search?q=celebrity+reaction+clips',
        hostname: 'search.example.com',
        title: 'Search results for celebrity reaction clips',
        text: { sampleLength: 1000, wordCount: 120, emojiCount: 0, topTokens: ['celebrity', 'reaction', 'clips'] }
      })
    ].forEach((signal, index) => {
      state = recordIntentPageVisit(state, signal, { now: () => 2000 + index });
    });

    const activeSession = getActiveIntentSession(state);

    assert.equal(activeSession.metrics.searchVisitCount, 3);
    assert.equal(activeSession.metrics.searchReturnCount, 2);
    assert.equal(activeSession.metrics.searchQueryShiftCount, 2);
    assert.ok(activeSession.metrics.searchRefinementLoad >= 0.55);
    assert.ok(getIntentInterventionDecision(activeSession).reasonLines.includes(
      'Repeated disconnected search cycles'
    ));
  });

  it('keeps connected search refinements low pressure', () => {
    let state = recordIntentPageVisit(null, pageSignal(), { now: () => 1000 });
    [
      pageSignal({
        url: 'https://docs.example.com/pde5-mechanism',
        hostname: 'docs.example.com',
        title: 'PDE5 mechanism reference',
        text: { sampleLength: 1000, wordCount: 260, emojiCount: 0, topTokens: ['pde5', 'mechanism', 'sildenafil'] }
      }),
      pageSignal({
        url: 'https://search.example.com/search?q=pde5+inhibitor+dosage',
        hostname: 'search.example.com',
        title: 'Search results for PDE5 inhibitor dosage',
        text: { sampleLength: 1000, wordCount: 120, emojiCount: 0, topTokens: ['pde5', 'inhibitor', 'dosage'] }
      }),
      pageSignal({
        url: 'https://reference.example.com/sildenafil-dosage',
        hostname: 'reference.example.com',
        title: 'Sildenafil dosage reference',
        text: { sampleLength: 1000, wordCount: 260, emojiCount: 0, topTokens: ['sildenafil', 'dosage', 'pde5'] }
      }),
      pageSignal({
        url: 'https://search.example.com/search?q=sildenafil+pde5+dosage',
        hostname: 'search.example.com',
        title: 'Search results for sildenafil PDE5 dosage',
        text: { sampleLength: 1000, wordCount: 120, emojiCount: 0, topTokens: ['sildenafil', 'pde5', 'dosage'] }
      })
    ].forEach((signal, index) => {
      state = recordIntentPageVisit(state, signal, { now: () => 2000 + index });
    });

    const activeSession = getActiveIntentSession(state);

    assert.equal(activeSession.metrics.searchVisitCount, 3);
    assert.equal(activeSession.metrics.searchReturnCount, 2);
    assert.equal(activeSession.metrics.searchQueryShiftCount, 0);
    assert.equal(activeSession.metrics.searchQueryContinuity, 0.5);
    assert.ok(activeSession.metrics.searchRefinementLoad < 0.25);
    assert.ok(!getIntentInterventionDecision(activeSession).reasonLines.includes(
      'Repeated disconnected search cycles'
    ));
  });
});
