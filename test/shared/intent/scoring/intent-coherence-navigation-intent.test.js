// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getActiveIntentSession,
  recordIntentPageVisit
} from '../../../../src/js/shared/intentCoherence.js';

describe('intent coherence navigation intent', () => {
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

  it('tracks typed navigation as a bounded deliberate transition signal', () => {
    const weakOrigin = pageSignal({
      url: 'https://docs.example.com/start',
      hostname: 'docs.example.com',
      title: '',
      text: { sampleLength: 0, wordCount: 0, emojiCount: 0, topTokens: [] }
    });
    const quietDetour = pageSignal({
      url: 'https://maps.example.com/route',
      hostname: 'maps.example.com',
      title: 'Transit route',
      text: { sampleLength: 400, wordCount: 60, emojiCount: 0, topTokens: ['transit', 'route', 'station'] },
      interaction: { linkCount: 8, buttonCount: 2, inputCount: 1, formCount: 0 },
      structure: { elementCount: 140, feedCount: 0 }
    });

    let state = recordIntentPageVisit(null, weakOrigin, { now: () => 1000, transitionType: 'typed' });
    state = recordIntentPageVisit(state, quietDetour, { now: () => 2000, transitionType: 'typed' });
    const typedSession = getActiveIntentSession(state);

    assert.equal(typedSession.metrics.originDirectNavigation, true);
    assert.equal(typedSession.metrics.latestDirectNavigation, true);
    assert.equal(typedSession.metrics.directNavigationCount, 2);
    assert.ok(typedSession.metrics.originAnchorStrength >= 0.35);
    assert.ok(typedSession.metrics.directNavigationRecovery >= 0.8);

    let linkState = recordIntentPageVisit(null, weakOrigin, { now: () => 1000, transitionType: 'typed' });
    linkState = recordIntentPageVisit(linkState, quietDetour, { now: () => 2000, transitionType: 'link' });
    const linkSession = getActiveIntentSession(linkState);

    assert.equal(linkSession.metrics.latestDirectNavigation, false);
    assert.equal(linkSession.metrics.directNavigationRecovery, 0);
    assert.ok(typedSession.coherenceScore > linkSession.coherenceScore);
  });

  it('does not use typed navigation to excuse high-pressure feed drift', () => {
    let state = recordIntentPageVisit(null, pageSignal(), { now: () => 1000, transitionType: 'typed' });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://video.example.com/feed',
      hostname: 'video.example.com',
      title: 'Reaction feed',
      text: {
        sampleLength: 2000,
        wordCount: 220,
        emojiCount: 5,
        topTokens: ['reaction', 'feed', 'clips']
      },
      media: {
        imageCount: 30,
        videoCount: 4,
        audioCount: 0,
        gifCount: 4,
        iframeCount: 2
      },
      interaction: {
        linkCount: 220,
        buttonCount: 80,
        inputCount: 0,
        formCount: 0
      },
      structure: {
        elementCount: 320,
        feedCount: 3
      },
      activity: {
        pageAgeMs: 60 * 1000,
        activePageMs: 60 * 1000,
        scrollEvents: 32,
        clickEvents: 6,
        recommenderClickEvents: 4,
        feedClickEvents: 3,
        commentClickEvents: 1,
        keyEvents: 0,
        inputEvents: 0,
        maxScrollDepthRatio: 0.9
      }
    }), { now: () => 2000, transitionType: 'typed' });

    const activeSession = getActiveIntentSession(state);

    assert.equal(activeSession.metrics.latestDirectNavigation, true);
    assert.equal(activeSession.metrics.directNavigationRecovery, 0);
    assert.ok(activeSession.metrics.feedCommentInteractionLoad >= 0.75);
  });
});
