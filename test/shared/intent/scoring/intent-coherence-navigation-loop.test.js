// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getActiveIntentSession,
  getIntentInterventionDecision,
  recordIntentNavigationTransition,
  recordIntentPageVisit
} from '../../../../src/js/shared/intentCoherence.js';

describe('intent coherence navigation loopiness', () => {
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

  it('tracks repeated reloads and same-page loops as coherence pressure', () => {
    const loopUrl = 'https://docs.example.com/pde5-mechanism';
    let state = recordIntentPageVisit(null, pageSignal({ url: loopUrl }), {
      now: () => 1000,
      tabId: 1
    });

    [2000, 3000, 4000].forEach(timestamp => {
      state = recordIntentNavigationTransition(state, {
        tabId: 1,
        frameId: 0,
        url: loopUrl,
        transitionType: 'reload'
      }, { now: () => timestamp });

      state = recordIntentPageVisit(state, pageSignal({ url: loopUrl }), {
        now: () => timestamp + 100,
        tabId: 1
      });
    });

    const activeSession = getActiveIntentSession(state);
    const reasonLines = getIntentInterventionDecision(activeSession).reasonLines;

    assert.equal(activeSession.metrics.samePageRepeatCount, 3);
    assert.equal(activeSession.metrics.immediatePageRepeatCount, 3);
    assert.equal(activeSession.metrics.reloadTransitionCount, 3);
    assert.equal(activeSession.metrics.navigationLoopLoad, 0.85);
    assert.equal(activeSession.metrics.latestTransitionType, 'reload');
    assert.ok(activeSession.coherenceScore < 100);
    assert.ok(reasonLines.includes('Repeated reload or same-page loop'));
  });
});
