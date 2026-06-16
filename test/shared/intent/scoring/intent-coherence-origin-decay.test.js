// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getActiveIntentSession,
  getIntentInterventionDecision,
  recordIntentPageVisit
} from '../../../../src/js/shared/intentCoherence.js';

describe('intent coherence origin decay', () => {
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

  it('raises sustained origin-decay pressure for passive low-overlap chains', () => {
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

    assert.ok(activeSession.metrics.originAnchorStrength >= 0.45);
    assert.ok(activeSession.metrics.recentOriginSimilarity < 0.55);
    assert.ok(activeSession.metrics.originDecayLoad >= 0.55);
    assert.ok(reasonLines.includes('Sustained decay from the session origin'));
  });

  it('does not raise origin-decay pressure for connected low-passive reading', () => {
    let state = recordIntentPageVisit(null, pageSignal(), { now: () => 1000 });
    [
      ['https://docs.example.com/pde5-mechanism', 'PDE5 mechanism reference', ['pde5', 'mechanism', 'sildenafil']],
      ['https://docs.example.com/sildenafil-dosage', 'Sildenafil dosage reference', ['sildenafil', 'dosage', 'clinical']],
      ['https://docs.example.com/pulmonary-hypertension', 'Pulmonary hypertension reference', ['pulmonary', 'hypertension', 'clinical']],
      ['https://docs.example.com/adverse-effects', 'Adverse effects reference', ['adverse', 'effects', 'clinical']]
    ].forEach(([url, title, topTokens], index) => {
      state = recordIntentPageVisit(state, pageSignal({
        url,
        hostname: 'docs.example.com',
        title,
        text: {
          sampleLength: 2000,
          wordCount: 700,
          emojiCount: 0,
          topTokens
        },
        interaction: {
          linkCount: 18,
          buttonCount: 2,
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
      }), { now: () => 2000 + index });
    });

    const activeSession = getActiveIntentSession(state);
    const reasonLines = getIntentInterventionDecision(activeSession).reasonLines;

    assert.equal(activeSession.metrics.originDecayLoad, 0);
    assert.ok(!reasonLines.includes('Sustained decay from the session origin'));
  });
});
