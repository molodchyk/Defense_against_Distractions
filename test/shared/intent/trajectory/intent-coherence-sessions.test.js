// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getActiveIntentSession,
  recordIntentPageVisit
} from '../../../../src/js/shared/intentCoherence.js';

describe('intent coherence sessions', () => {
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

  it('creates a first intent session from a page signal', () => {
    const state = recordIntentPageVisit(null, pageSignal(), {
      now: () => 1000,
      tabId: 7
    });
    const activeSession = getActiveIntentSession(state);

    assert.equal(state.activeTabId, 7);
    assert.equal(state.sessions.length, 1);
    assert.equal(activeSession.visits.length, 1);
    assert.equal(activeSession.origin.hostname, 'docs.example.com');
    assert.equal(activeSession.coherenceScore, 100);
    assert.equal(activeSession.riskState, 'clear');
  });

  it('stores contributing plan policy metadata on intent visits', () => {
    const state = recordIntentPageVisit(null, pageSignal(), {
      now: () => 1000,
      planIds: ['plan_1'],
      planNames: ['Work'],
      policySource: 'plans'
    });
    const activeSession = getActiveIntentSession(state);
    const visit = activeSession.visits[0];

    assert.deepEqual(visit.policy.planIds, ['plan_1']);
    assert.deepEqual(visit.policy.planNames, ['Work']);
    assert.equal(visit.policy.source, 'plans');
  });

  it('keeps coherent related pages in the same session', () => {
    let state = recordIntentPageVisit(null, pageSignal(), { now: () => 1000 });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://wikipedia.org/wiki/PDE5',
      hostname: 'wikipedia.org',
      title: 'PDE5 mechanism and sildenafil',
      text: {
        sampleLength: 1200,
        wordCount: 160,
        emojiCount: 0,
        topTokens: ['pde5', 'mechanism', 'sildenafil', 'inhibitor']
      }
    }), { now: () => 2000 });
    const activeSession = getActiveIntentSession(state);

    assert.equal(state.sessions.length, 1);
    assert.equal(activeSession.visits.length, 2);
    assert.equal(activeSession.metrics.visitCount, 2);
    assert.notEqual(activeSession.riskState, 'drift');
    assert.notEqual(activeSession.riskState, 'intervene');
    assert.notEqual(activeSession.riskState, 'locked');
    assert.ok(activeSession.coherenceScore >= 60);
  });

  it('marks unrelated media-heavy pages as drift without enforcing anything', () => {
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
      }
    }), { now: () => 2000 });
    const activeSession = getActiveIntentSession(state);

    assert.equal(activeSession.visits.length, 2);
    assert.ok(activeSession.coherenceScore < 60);
    assert.equal(activeSession.riskState, 'drift');
    assert.equal(activeSession.firstDriftVisitId, activeSession.visits[1].id);
  });

  it('starts a new session after the idle reset window', () => {
    let state = recordIntentPageVisit(null, pageSignal(), {
      now: () => 1000,
      idleResetMs: 5000
    });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://news.example.com/',
      hostname: 'news.example.com',
      title: 'News'
    }), {
      now: () => 7000,
      idleResetMs: 5000
    });

    assert.equal(state.sessions.length, 2);
    assert.equal(getActiveIntentSession(state).origin.hostname, 'news.example.com');
  });

  it('can force the current page into a new isolated intent session', () => {
    let state = recordIntentPageVisit(null, pageSignal(), {
      now: () => 1000,
      idleResetMs: 100000
    });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://video.example.com/unrelated-feed',
      hostname: 'video.example.com',
      title: 'Unrelated video feed'
    }), {
      now: () => 2000,
      idleResetMs: 100000,
      forceNewSession: true
    });

    assert.equal(state.sessions.length, 2);
    assert.equal(getActiveIntentSession(state).origin.hostname, 'video.example.com');
    assert.equal(getActiveIntentSession(state).coherenceScore, 100);
  });
});
