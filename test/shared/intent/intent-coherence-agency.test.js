// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getActiveIntentSession,
  getIntentInterventionDecision,
  recordIntentPageVisit
} from '../../../src/js/shared/intentCoherence.js';

describe('intent coherence agency ratio', () => {
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
        activeInputMs: 0,
        recommenderClickRatePerMinute: 0,
        maxScrollDepthRatio: 0
      },
      ...overrides
    };
  }

  it('raises low-agency load for passive loops without input', () => {
    let state = recordIntentPageVisit(null, pageSignal(), { now: () => 1000 });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://feed.example.com/recommended-loop',
      hostname: 'feed.example.com',
      title: 'Recommended loop',
      activity: {
        pageAgeMs: 120_000,
        activePageMs: 120_000,
        scrollEvents: 30,
        clickEvents: 20,
        recommenderClickEvents: 4,
        keyEvents: 0,
        inputEvents: 0,
        recommenderClickRatePerMinute: 2,
        maxScrollDepthRatio: 0.9
      }
    }), { now: () => 2000 });

    const activeSession = getActiveIntentSession(state);

    assert.equal(activeSession.metrics.agencyRatio, 0);
    assert.equal(activeSession.metrics.lowAgencyLoad, 1);
    assert.ok(activeSession.coherenceScore < 100);
    assert.ok(getIntentInterventionDecision(activeSession).reasonLines.includes(
      'Low deliberate-action ratio'
    ));
  });

  it('does not penalize high-input deliberate activity as low agency', () => {
    let state = recordIntentPageVisit(null, pageSignal(), { now: () => 1000 });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://docs.example.com/edit-note',
      hostname: 'docs.example.com',
      title: 'Editing focused note',
      activity: {
        pageAgeMs: 120_000,
        activePageMs: 120_000,
        scrollEvents: 5,
        clickEvents: 2,
        recommenderClickEvents: 0,
        keyEvents: 20,
        inputEvents: 12,
        recommenderClickRatePerMinute: 0,
        maxScrollDepthRatio: 0.25
      }
    }), { now: () => 2000 });

    const activeSession = getActiveIntentSession(state);

    assert.ok(activeSession.metrics.agencyRatio > 0.85);
    assert.equal(activeSession.metrics.lowAgencyLoad, 0);
  });

  it('treats active editable focus time as deliberate agency', () => {
    let state = recordIntentPageVisit(null, pageSignal(), { now: () => 1000 });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://docs.example.com/edit-note',
      hostname: 'docs.example.com',
      title: 'Editing focused note',
      activity: {
        pageAgeMs: 120_000,
        activePageMs: 120_000,
        scrollEvents: 3,
        clickEvents: 1,
        recommenderClickEvents: 0,
        keyEvents: 0,
        inputEvents: 0,
        activeInputMs: 90_000,
        recommenderClickRatePerMinute: 0,
        maxScrollDepthRatio: 0.25
      }
    }), { now: () => 2000 });

    const activeSession = getActiveIntentSession(state);

    assert.ok(activeSession.metrics.activeInputLoad >= 0.5);
    assert.ok(activeSession.metrics.agencyRatio >= 0.5);
    assert.equal(activeSession.metrics.lowAgencyLoad, 0);
  });
});
