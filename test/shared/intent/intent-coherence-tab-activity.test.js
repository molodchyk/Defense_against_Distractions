// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getActiveIntentSession,
  getIntentInterventionDecision,
  recordIntentPageVisit,
  recordIntentTabActivation
} from '../../../src/js/shared/intentCoherence.js';

describe('intent coherence tab activity', () => {
  function pageSignal(overrides = {}) {
    return {
      url: 'https://docs.example.com/pde5-mechanism',
      hostname: 'docs.example.com',
      title: 'PDE5 inhibitor mechanism',
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
        linkCount: 12,
        buttonCount: 2,
        inputCount: 1,
        formCount: 0
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
        keyEvents: 0,
        inputEvents: 0,
        recommenderClickRatePerMinute: 0,
        maxScrollDepthRatio: 0
      },
      ...overrides
    };
  }

  it('tracks rapid tab switching and short loops as coherence pressure', () => {
    let state = recordIntentPageVisit(null, pageSignal(), {
      now: () => 1000,
      tabId: 1
    });

    [1, 2, 1, 2, 1, 2, 1, 2].forEach((tabId, index) => {
      state = recordIntentTabActivation(state, tabId, {
        now: () => 2000 + index * 10_000
      });
    });

    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://docs.example.com/pde5-followup',
      hostname: 'docs.example.com',
      title: 'PDE5 follow-up notes'
    }), {
      now: () => 90_000,
      tabId: 2
    });

    const activeSession = getActiveIntentSession(state);
    const reasonLines = getIntentInterventionDecision(activeSession).reasonLines;

    assert.equal(activeSession.metrics.tabSwitchCount, 7);
    assert.equal(activeSession.metrics.tabSwitchLoopCount, 6);
    assert.equal(activeSession.metrics.tabSwitchRatePerMinute, 3.5);
    assert.ok(activeSession.metrics.tabSwitchLoad >= 0.5);
    assert.ok(activeSession.coherenceScore < 100);
    assert.ok(reasonLines.includes('Rapid recent tab switching'));
    assert.ok(reasonLines.includes('Short tab-switch loop detected'));
  });
});
