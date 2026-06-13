// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getActiveIntentSession,
  getIntentInterventionDecision,
  recordIntentPageVisit
} from '../../../src/js/shared/intentCoherence.js';

describe('intent coherence media chains', () => {
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
        linkCount: 14,
        buttonCount: 2,
        inputCount: 1,
        formCount: 1
      },
      structure: {
        elementCount: 160,
        feedCount: 0
      },
      activity: {
        pageAgeMs: 0,
        activePageMs: 0,
        scrollEvents: 0,
        clickEvents: 0,
        recommenderClickEvents: 0,
        keyEvents: 3,
        inputEvents: 1,
        recommenderClickRatePerMinute: 0,
        maxScrollDepthRatio: 0
      },
      ...overrides
    };
  }

  function passiveVideoSignal(title, topTokens) {
    return pageSignal({
      url: `https://video.example.com/watch/${title.toLowerCase().replaceAll(' ', '-')}`,
      hostname: 'video.example.com',
      title,
      text: {
        sampleLength: 1400,
        wordCount: 160,
        emojiCount: 5,
        topTokens
      },
      media: {
        imageCount: 18,
        videoCount: 2,
        audioCount: 0,
        gifCount: 3,
        iframeCount: 2
      },
      interaction: {
        linkCount: 180,
        buttonCount: 42,
        inputCount: 0,
        formCount: 0
      },
      structure: {
        elementCount: 320,
        feedCount: 2
      },
      activity: {
        pageAgeMs: 240_000,
        activePageMs: 220_000,
        scrollEvents: 18,
        clickEvents: 8,
        recommenderClickEvents: 2,
        keyEvents: 0,
        inputEvents: 0,
        recommenderClickRatePerMinute: 0.55,
        mediaPlaybackMs: 190_000,
        mediaPlayEvents: 1,
        maxScrollDepthRatio: 0.9
      }
    });
  }

  it('raises pressure for repeated passive media chains with drift context', () => {
    let state = recordIntentPageVisit(null, pageSignal(), { now: () => 1000 });
    [
      passiveVideoSignal('PDE5 mechanism explained', ['pde5', 'mechanism', 'explained']),
      passiveVideoSignal('Doctor reacts to weird health facts', ['doctor', 'reacts', 'weird', 'facts']),
      passiveVideoSignal('Celebrity health reaction clips', ['celebrity', 'health', 'reaction', 'clips']),
      passiveVideoSignal('Celebrity drama reaction compilation', ['celebrity', 'drama', 'reaction', 'compilation'])
    ].forEach((signal, index) => {
      state = recordIntentPageVisit(state, signal, { now: () => 2000 + index });
    });

    const activeSession = getActiveIntentSession(state);
    const reasonLines = getIntentInterventionDecision(activeSession).reasonLines;

    assert.equal(activeSession.metrics.consecutiveMediaVisitCount, 4);
    assert.equal(activeSession.metrics.recentMediaVisitCount, 4);
    assert.ok(activeSession.metrics.mediaChainLoad >= 0.55);
    assert.ok(reasonLines.includes('Repeated passive media chain'));
  });

  it('does not treat a single coherent tutorial video as a media chain', () => {
    let state = recordIntentPageVisit(null, pageSignal(), { now: () => 1000 });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://video.example.com/watch/pde5-mechanism-tutorial',
      hostname: 'video.example.com',
      title: 'PDE5 mechanism tutorial',
      text: {
        sampleLength: 1200,
        wordCount: 180,
        emojiCount: 0,
        topTokens: ['pde5', 'mechanism', 'sildenafil']
      },
      media: {
        imageCount: 4,
        videoCount: 1,
        audioCount: 0,
        gifCount: 0,
        iframeCount: 1
      },
      activity: {
        pageAgeMs: 300_000,
        activePageMs: 280_000,
        mediaPlaybackMs: 240_000,
        mediaPlayEvents: 1,
        scrollEvents: 2,
        clickEvents: 1,
        recommenderClickEvents: 0,
        keyEvents: 0,
        inputEvents: 0,
        recommenderClickRatePerMinute: 0,
        maxScrollDepthRatio: 0.3
      }
    }), { now: () => 2000 });

    const activeSession = getActiveIntentSession(state);
    const reasonLines = getIntentInterventionDecision(activeSession).reasonLines;

    assert.equal(activeSession.metrics.consecutiveMediaVisitCount, 1);
    assert.equal(activeSession.metrics.mediaChainLoad, 0);
    assert.ok(!reasonLines.includes('Repeated passive media chain'));
  });
});
