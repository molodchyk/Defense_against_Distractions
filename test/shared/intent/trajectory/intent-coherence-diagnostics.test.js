// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createIntentTrajectoryState,
  getActiveIntentSession,
  getIntentInterventionDecision,
  recordIntentPageVisit
} from '../../../../src/js/shared/intentCoherence.js';

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
        scrollDirectionChanges: 0,
        scrollDistanceViewportUnits: 0,
        dynamicContentBatches: 0,
        dynamicAddedElements: 0,
        scrollLinkedContentBatches: 0,
        scrollLinkedAddedElements: 0,
        clickEvents: 0,
        recommenderClickEvents: 0,
        keyEvents: 0,
        inputEvents: 0,
        activeInputMs: 0,
        mediaEndEvents: 0,
        mediaSourceChangeEvents: 0,
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
        scrollDirectionChanges: 7,
        scrollDistanceViewportUnits: 42,
        clickEvents: 36,
        keyEvents: 0,
        inputEvents: 0,
        maxScrollDepthRatio: 0.95
      }
    }), { now: () => 2000 });

    const activeSession = getActiveIntentSession(state);
    assert.equal(activeSession.metrics.scrollRatePerMinute, 90);
    assert.equal(activeSession.metrics.scrollDirectionChanges, 7);
    assert.equal(activeSession.metrics.scrollDistanceViewportUnits, 42);
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

  it('stores active editable focus duration for intent diagnostics', () => {
    let state = recordIntentPageVisit(null, pageSignal(), { now: () => 1000 });
    state = recordIntentPageVisit(state, pageSignal({
      activity: {
        pageAgeMs: 120 * 1000,
        activePageMs: 120 * 1000,
        scrollEvents: 4,
        clickEvents: 1,
        keyEvents: 1,
        inputEvents: 0,
        activeInputMs: 90 * 1000,
        maxScrollDepthRatio: 0.3
      }
    }), { now: () => 2000 });

    const activeSession = getActiveIntentSession(state);

    assert.equal(activeSession.metrics.activeInputMs, 90 * 1000);
    assert.ok(activeSession.metrics.activeInputLoad >= 0.5);
    assert.ok(activeSession.metrics.constructiveDwell >= 0.5);
    assert.equal(activeSession.metrics.lowAgencyLoad, 0);
  });

  it('stores dynamic scroll-linked content growth for intent diagnostics', () => {
    let state = recordIntentPageVisit(null, pageSignal(), { now: () => 1000 });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://feed.example.com/infinite-scroll',
      hostname: 'feed.example.com',
      title: 'Infinite story feed',
      text: {
        sampleLength: 2200,
        wordCount: 260,
        emojiCount: 4,
        topTokens: ['infinite', 'story', 'feed', 'updates']
      },
      media: {
        imageCount: 24,
        videoCount: 2,
        audioCount: 0,
        gifCount: 3,
        iframeCount: 1
      },
      interaction: {
        linkCount: 180,
        buttonCount: 50,
        inputCount: 0,
        formCount: 0
      },
      structure: {
        elementCount: 360,
        feedCount: 2
      },
      activity: {
        pageAgeMs: 90 * 1000,
        activePageMs: 90 * 1000,
        scrollEvents: 16,
        dynamicContentBatches: 5,
        dynamicAddedElements: 140,
        scrollLinkedContentBatches: 4,
        scrollLinkedAddedElements: 120,
        clickEvents: 2,
        keyEvents: 0,
        inputEvents: 0,
        maxScrollDepthRatio: 0.95
      }
    }), { now: () => 2000 });

    const activeSession = getActiveIntentSession(state);
    assert.equal(activeSession.metrics.dynamicContentBatches, 5);
    assert.equal(activeSession.metrics.dynamicAddedElements, 140);
    assert.equal(activeSession.metrics.scrollLinkedContentBatches, 4);
    assert.equal(activeSession.metrics.scrollLinkedAddedElements, 120);
    assert.ok(activeSession.metrics.dynamicContentLoad >= 0.95);
    assert.ok(getIntentInterventionDecision(activeSession).reasonLines.includes(
      'Dynamic content keeps appending while scrolling'
    ));
  });

  it('stores feed and comment interaction metrics for intent diagnostics', () => {
    let state = recordIntentPageVisit(null, pageSignal(), { now: () => 1000 });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://reddit.example.com/rabbit-hole',
      hostname: 'reddit.example.com',
      title: 'Threaded reaction feed',
      text: {
        sampleLength: 2000,
        wordCount: 240,
        emojiCount: 6,
        topTokens: ['threaded', 'reaction', 'feed', 'comments']
      },
      media: {
        imageCount: 20,
        videoCount: 1,
        audioCount: 0,
        gifCount: 4,
        iframeCount: 1
      },
      interaction: {
        linkCount: 180,
        buttonCount: 80,
        inputCount: 0,
        formCount: 0
      },
      structure: {
        elementCount: 320,
        feedCount: 2,
        recommendationRegionCount: 1,
        commentSectionCount: 3,
        shortFormMediaCount: 1
      },
      activity: {
        pageAgeMs: 60 * 1000,
        activePageMs: 60 * 1000,
        scrollEvents: 24,
        clickEvents: 4,
        feedClickEvents: 2,
        commentClickEvents: 2,
        keyEvents: 0,
        inputEvents: 0,
        maxScrollDepthRatio: 0.9
      }
    }), { now: () => 2000 });

    const activeSession = getActiveIntentSession(state);
    assert.equal(activeSession.metrics.recommenderClickEvents, 4);
    assert.equal(activeSession.metrics.feedClickEvents, 2);
    assert.equal(activeSession.metrics.commentClickEvents, 2);
    assert.equal(activeSession.metrics.recommendationClickEvents, 0);
    assert.deepEqual([activeSession.metrics.recommendationRegionCount, activeSession.metrics.commentSectionCount, activeSession.metrics.shortFormMediaCount], [1, 3, 1]);
    assert.ok(activeSession.metrics.feedCommentInteractionLoad >= 0.75);
    assert.ok(getIntentInterventionDecision(activeSession).reasonLines.includes(
      'Feed or comment interactions are driving the chain'
    ));
  });

  it('stores media playback metrics for intent diagnostics', () => {
    let state = recordIntentPageVisit(null, pageSignal(), { now: () => 1000 });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://video.example.com/passive-watch',
      hostname: 'video.example.com',
      title: 'Passive video queue',
      text: {
        sampleLength: 1600,
        wordCount: 180,
        emojiCount: 2,
        topTokens: ['passive', 'video', 'queue', 'reaction']
      },
      media: {
        imageCount: 4,
        videoCount: 1,
        audioCount: 0,
        gifCount: 0,
        iframeCount: 1
      },
      interaction: {
        linkCount: 120,
        buttonCount: 45,
        inputCount: 0,
        formCount: 0
      },
      structure: {
        elementCount: 240,
        feedCount: 1
      },
      activity: {
        pageAgeMs: 8 * 60 * 1000,
        activePageMs: 8 * 60 * 1000,
        mediaPlaybackMs: 5 * 60 * 1000,
        mediaPlayEvents: 1,
        mediaPauseEvents: 0,
        mediaEndEvents: 1,
        mediaSourceChangeEvents: 2,
        scrollEvents: 3,
        clickEvents: 1,
        keyEvents: 0,
        inputEvents: 0,
        maxScrollDepthRatio: 0.25
      }
    }), { now: () => 2000 });

    const activeSession = getActiveIntentSession(state);
    assert.equal(activeSession.metrics.mediaPlaybackMs, 5 * 60 * 1000);
    assert.equal(activeSession.metrics.mediaPlayEvents, 1);
    assert.equal(activeSession.metrics.mediaEndEvents, 1);
    assert.equal(activeSession.metrics.mediaSourceChangeEvents, 2);
    assert.ok(activeSession.metrics.mediaPlaybackLoad >= 0.75);
    assert.ok(activeSession.metrics.passiveMediaLoad >= activeSession.metrics.mediaPlaybackLoad);
    assert.ok(getIntentInterventionDecision(activeSession).reasonLines.includes(
      'Sustained passive media playback'
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

  it('stores aggregate open-tab pressure for intent diagnostics', () => {
    let state = recordIntentPageVisit(null, pageSignal(), { now: () => 1000, tabCount: 4, windowCount: 1 });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://video.example.com/crowded-tab-loop',
      hostname: 'video.example.com',
      title: 'Crowded tab loop',
      text: {
        sampleLength: 1600,
        wordCount: 160,
        emojiCount: 2,
        topTokens: ['crowded', 'tabs', 'loop', 'reaction']
      },
      media: {
        imageCount: 8,
        videoCount: 1,
        audioCount: 0,
        gifCount: 1,
        iframeCount: 1
      },
      interaction: {
        linkCount: 90,
        buttonCount: 25,
        inputCount: 0,
        formCount: 0
      },
      structure: {
        elementCount: 210,
        feedCount: 1
      }
    }), { now: () => 2000, tabCount: 24, windowCount: 3 });

    const activeSession = getActiveIntentSession(state);

    assert.equal(activeSession.metrics.openTabCount, 24);
    assert.equal(activeSession.metrics.openWindowCount, 3);
    assert.ok(activeSession.metrics.tabPressureLoad >= 0.55);
    assert.ok(getIntentInterventionDecision(activeSession).reasonLines.includes(
      'High open-tab pressure'
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
