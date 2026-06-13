// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getActiveIntentSession,
  getIntentInterventionDecision,
  recordIntentPageVisit
} from '../../../src/js/shared/intentCoherence.js';

describe('intent coherence timing signals', () => {
  function pageSignal(overrides = {}) {
    return {
      url: 'https://search.example.com/search?q=pde5+inhibitor+mechanism',
      hostname: 'search.example.com',
      title: 'Search results for PDE5 inhibitor mechanism',
      text: {
        sampleLength: 1000,
        wordCount: 140,
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
        keyEvents: 0,
        inputEvents: 0,
        recommenderClickRatePerMinute: 0,
        maxScrollDepthRatio: 0
      },
      ...overrides
    };
  }

  it('raises pressure after a long passive gap since search or input', () => {
    let state = recordIntentPageVisit(null, pageSignal(), { now: () => 1_000 });
    [
      ['https://video.example.com/watch/1', 'video.example.com', 'Recommended clip one'],
      ['https://video.example.com/watch/2', 'video.example.com', 'Recommended clip two'],
      ['https://video.example.com/watch/3', 'video.example.com', 'Recommended clip three'],
      ['https://video.example.com/watch/4', 'video.example.com', 'Recommended clip four']
    ].forEach(([url, hostname, title], index) => {
      state = recordIntentPageVisit(state, pageSignal({
        url,
        hostname,
        title,
        text: {
          sampleLength: 1000,
          wordCount: 90,
          emojiCount: 0,
          topTokens: ['recommended', 'clip', 'reaction']
        },
        media: {
          imageCount: 4,
          videoCount: 1,
          audioCount: 0,
          gifCount: 0,
          iframeCount: 1
        },
        structure: {
          elementCount: 220,
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
          recommenderClickRatePerMinute: 0.5,
          mediaPlaybackMs: 180_000,
          mediaPlayEvents: 1,
          maxScrollDepthRatio: 0.9
        }
      }), { now: () => 1_000 + (index + 1) * 240_000 });
    });

    const activeSession = getActiveIntentSession(state);

    assert.equal(activeSession.metrics.visitsSinceDeliberateAction, 4);
    assert.equal(activeSession.metrics.passiveVisitsSinceDeliberate, 4);
    assert.equal(activeSession.metrics.sessionAgeMs, 960_000);
    assert.equal(activeSession.metrics.deliberateGapMs, 960_000);
    assert.ok(activeSession.metrics.deliberateStalenessLoad >= 0.7);
    assert.ok(getIntentInterventionDecision(activeSession).reasonLines.includes(
      'Long gap since search or input'
    ));
  });

  it('does not treat long connected reading as a stale-control loop', () => {
    let state = recordIntentPageVisit(null, pageSignal(), { now: () => 1_000 });
    [
      ['https://docs.example.com/pde5-mechanism', 'PDE5 mechanism reference'],
      ['https://docs.example.com/sildenafil-dosage', 'Sildenafil dosage reference'],
      ['https://docs.example.com/clinical-evidence', 'Clinical evidence reference'],
      ['https://docs.example.com/adverse-effects', 'Adverse effects reference']
    ].forEach(([url, title], index) => {
      state = recordIntentPageVisit(state, pageSignal({
        url,
        hostname: 'docs.example.com',
        title,
        text: {
          sampleLength: 2000,
          wordCount: 650,
          emojiCount: 0,
          topTokens: ['pde5', 'sildenafil', 'dosage', 'clinical']
        },
        interaction: {
          linkCount: 18,
          buttonCount: 1,
          inputCount: 0,
          formCount: 0
        },
        activity: {
          pageAgeMs: 240_000,
          activePageMs: 220_000,
          scrollEvents: 3,
          clickEvents: 1,
          recommenderClickEvents: 0,
          keyEvents: 0,
          inputEvents: 0,
          recommenderClickRatePerMinute: 0,
          maxScrollDepthRatio: 0.55
        }
      }), { now: () => 1_000 + (index + 1) * 240_000 });
    });

    const activeSession = getActiveIntentSession(state);

    assert.equal(activeSession.metrics.visitsSinceDeliberateAction, 4);
    assert.equal(activeSession.metrics.passiveVisitsSinceDeliberate, 0);
    assert.equal(activeSession.metrics.deliberateStalenessLoad, 0);
    assert.ok(!getIntentInterventionDecision(activeSession).reasonLines.includes(
      'Long gap since search or input'
    ));
  });
});
