// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createIntentTrajectoryState,
  getActiveIntentSession,
  getIntentInterventionDecision,
  recordIntentPageVisit
} from '../../../src/js/shared/intentCoherence.js';

describe('intent coherence diagnostics', () => {
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

  it('stores interaction velocity metrics for intent diagnostics', () => {
    let state = recordIntentPageVisit(null, pageSignal(), { now: () => 1000 });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://video.example.com/rapid-feed',
      hostname: 'video.example.com',
      title: 'Rapid clips feed',
      text: {
        sampleLength: 2000,
        wordCount: 220,
        emojiCount: 5,
        topTokens: ['rapid', 'clips', 'feed', 'reaction']
      },
      media: {
        imageCount: 35,
        videoCount: 4,
        audioCount: 0,
        gifCount: 5,
        iframeCount: 2
      },
      interaction: {
        linkCount: 220,
        buttonCount: 70,
        inputCount: 0,
        formCount: 0
      },
      structure: {
        elementCount: 300,
        feedCount: 2
      },
      activity: {
        pageAgeMs: 60 * 1000,
        activePageMs: 60 * 1000,
        scrollEvents: 90,
        clickEvents: 36,
        keyEvents: 0,
        inputEvents: 0,
        maxScrollDepthRatio: 0.95
      }
    }), { now: () => 2000 });

    const activeSession = getActiveIntentSession(state);

    assert.equal(activeSession.metrics.scrollRatePerMinute, 90);
    assert.equal(activeSession.metrics.clickRatePerMinute, 36);
    assert.ok(activeSession.metrics.interactionVelocityLoad >= 0.85);
    assert.ok(getIntentInterventionDecision(activeSession).reasonLines.includes(
      'High interaction velocity'
    ));
  });

  it('stores recommendation click metrics for intent diagnostics', () => {
    let state = recordIntentPageVisit(null, pageSignal(), { now: () => 1000 });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://video.example.com/recommended-chain',
      hostname: 'video.example.com',
      title: 'Recommended clips chain',
      text: {
        sampleLength: 1800,
        wordCount: 180,
        emojiCount: 4,
        topTokens: ['recommended', 'clips', 'chain', 'reaction']
      },
      media: {
        imageCount: 30,
        videoCount: 3,
        audioCount: 0,
        gifCount: 3,
        iframeCount: 2
      },
      interaction: {
        linkCount: 200,
        buttonCount: 60,
        inputCount: 0,
        formCount: 0
      },
      structure: {
        elementCount: 280,
        feedCount: 2
      },
      activity: {
        pageAgeMs: 60 * 1000,
        activePageMs: 60 * 1000,
        scrollEvents: 18,
        clickEvents: 5,
        recommenderClickEvents: 4,
        keyEvents: 0,
        inputEvents: 0,
        maxScrollDepthRatio: 0.8
      }
    }), { now: () => 2000 });

    const activeSession = getActiveIntentSession(state);

    assert.equal(activeSession.metrics.recommenderClickEvents, 4);
    assert.equal(activeSession.metrics.recommenderClickRatePerMinute, 4);
    assert.ok(activeSession.metrics.recommenderClickLoad >= 0.75);
    assert.ok(getIntentInterventionDecision(activeSession).reasonLines.includes(
      'Recommendation or feed clicks are driving the chain'
    ));
  });

  it('stores dwell and active-time metrics for intent diagnostics', () => {
    let state = recordIntentPageVisit(null, pageSignal(), { now: () => 1000 });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://video.example.com/celebrity-reaction-feed',
      hostname: 'video.example.com',
      title: 'Celebrity drama reaction clips',
      text: {
        sampleLength: 2000,
        wordCount: 300,
        emojiCount: 8,
        topTokens: ['celebrity', 'drama', 'reaction', 'clips']
      },
      media: {
        imageCount: 40,
        videoCount: 4,
        audioCount: 0,
        gifCount: 4,
        iframeCount: 2
      },
      interaction: {
        linkCount: 260,
        buttonCount: 80,
        inputCount: 0,
        formCount: 0
      },
      structure: {
        elementCount: 320,
        feedCount: 3
      },
      activity: {
        pageAgeMs: 12 * 60 * 1000,
        activePageMs: 10 * 60 * 1000,
        scrollEvents: 42,
        clickEvents: 16,
        keyEvents: 0,
        inputEvents: 0,
        maxScrollDepthRatio: 0.9
      }
    }), { now: () => 12 * 60 * 1000 });

    const activeSession = getActiveIntentSession(state);
    const latestVisit = activeSession.visits.at(-1);

    assert.equal(latestVisit.dwellMs, 12 * 60 * 1000);
    assert.equal(latestVisit.activeMs, 10 * 60 * 1000);
    assert.equal(activeSession.metrics.latestDwellMs, 12 * 60 * 1000);
    assert.equal(activeSession.metrics.latestActiveMs, 10 * 60 * 1000);
    assert.equal(activeSession.metrics.totalActiveMs, 10 * 60 * 1000);
    assert.ok(activeSession.metrics.passiveTimeLoad > 0.5);
    assert.ok(getIntentInterventionDecision(activeSession).reasonLines.includes(
      'Sustained active time on a passive page'
    ));
  });

  it('bounds stored sessions and visits', () => {
    let state = createIntentTrajectoryState(1000);
    for (let index = 0; index < 5; index += 1) {
      state = recordIntentPageVisit(state, pageSignal({
        url: `https://example${index}.com/`,
        hostname: `example${index}.com`
      }), {
        now: () => 1000 + index * 10000,
        idleResetMs: 1000,
        maxSessions: 3,
        maxVisitsPerSession: 2
      });
    }

    assert.equal(state.sessions.length, 3);
    assert.equal(state.sessions[0].origin.hostname, 'example2.com');
  });

  it('prunes intent diagnostic sessions outside configured retention', () => {
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
    let state = recordIntentPageVisit(null, pageSignal({
      url: 'https://old.example.com/',
      hostname: 'old.example.com'
    }), {
      now: () => 1000,
      intentSettings: {
        diagnosticsRetentionDays: 1
      }
    });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://new.example.com/',
      hostname: 'new.example.com'
    }), {
      now: () => 1000 + twoDaysMs,
      forceNewSession: true,
      intentSettings: {
        diagnosticsRetentionDays: 1
      }
    });

    assert.equal(state.sessions.length, 1);
    assert.equal(state.sessions[0].origin.hostname, 'new.example.com');
  });
});
