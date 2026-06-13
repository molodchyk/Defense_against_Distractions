// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateIntentCoherence,
  getActiveIntentSession,
  getIntentInterventionDecision,
  recordIntentPageVisit
} from '../../../src/js/shared/intentCoherence.js';

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
      keyEvents: 0,
      inputEvents: 0,
      maxScrollDepthRatio: 0
    },
    ...overrides
  };
}

describe('intent coherence long-session pressure', () => {
  it('raises long-session load only when duration carries drift pressure', () => {
    let passiveState = recordIntentPageVisit(null, pageSignal(), { now: () => 1000 });
    [
      ['https://video.example.com/reaction-feed-1', 25],
      ['https://video.example.com/reaction-feed-2', 25]
    ].forEach(([url, activeMinutes], index) => {
      passiveState = recordIntentPageVisit(passiveState, pageSignal({
        url,
        hostname: 'video.example.com',
        title: 'Reaction feed queue',
        text: {
          sampleLength: 2200,
          wordCount: 260,
          emojiCount: 8,
          topTokens: ['reaction', 'feed', 'queue', 'clips']
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
          feedCount: 3,
          recommendationRegionCount: 2
        },
        activity: {
          pageAgeMs: (activeMinutes + 2) * 60 * 1000,
          activePageMs: activeMinutes * 60 * 1000,
          scrollEvents: 36,
          clickEvents: 14,
          keyEvents: 0,
          inputEvents: 0,
          maxScrollDepthRatio: 0.9
        }
      }), { now: () => 2000 + index });
    });

    const passiveSession = getActiveIntentSession(passiveState);
    assert.equal(passiveSession.metrics.totalActiveMs, 50 * 60 * 1000);
    assert.ok(passiveSession.metrics.longSessionLoad >= 0.7);
    assert.ok(getIntentInterventionDecision(passiveSession).reasonLines.includes(
      'Long session with persistent drift pressure'
    ));

    let deliberateState = recordIntentPageVisit(null, pageSignal(), { now: () => 1000 });
    deliberateState = recordIntentPageVisit(deliberateState, pageSignal({
      url: 'https://docs.example.com/working-notes',
      hostname: 'docs.example.com',
      title: 'Working notes',
      text: {
        sampleLength: 4200,
        wordCount: 1200,
        emojiCount: 0,
        topTokens: ['pde5', 'inhibitor', 'mechanism', 'notes']
      },
      media: {
        imageCount: 1,
        videoCount: 0,
        audioCount: 0,
        gifCount: 0,
        iframeCount: 0
      },
      interaction: {
        linkCount: 4,
        buttonCount: 2,
        inputCount: 2,
        formCount: 1
      },
      structure: {
        elementCount: 220,
        feedCount: 0
      },
      activity: {
        pageAgeMs: 58 * 60 * 1000,
        activePageMs: 55 * 60 * 1000,
        activeInputMs: 45 * 60 * 1000,
        scrollEvents: 4,
        clickEvents: 1,
        keyEvents: 300,
        inputEvents: 200,
        maxScrollDepthRatio: 0.2
      }
    }), { now: () => 3000 });

    const deliberateSession = getActiveIntentSession(deliberateState);
    assert.equal(deliberateSession.metrics.totalActiveMs, 55 * 60 * 1000);
    assert.ok(deliberateSession.metrics.longSessionLoad < 0.3);
  });

  it('reduces coherence for long sessions with drift pressure', () => {
    const calmScore = calculateIntentCoherence({
      originSimilarity: 0.8,
      localSimilarity: 0.8,
      domainEntropy: 0,
      passiveMediaLoad: 0,
      passiveInteractionLoad: 0,
      passiveTimeLoad: 0,
      longSessionLoad: 0,
      linkDensity: 0.1,
      domainChanges: 0,
      visitCount: 1
    });
    const longDriftScore = calculateIntentCoherence({
      originSimilarity: 0.8,
      localSimilarity: 0.8,
      domainEntropy: 0,
      passiveMediaLoad: 0,
      passiveInteractionLoad: 0,
      passiveTimeLoad: 0,
      longSessionLoad: 1,
      linkDensity: 0.1,
      domainChanges: 0,
      visitCount: 1
    });

    assert.equal(longDriftScore, calmScore - 6);
  });
});
