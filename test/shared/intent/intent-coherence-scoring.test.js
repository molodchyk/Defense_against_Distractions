// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateIntentCoherence,
  calculateTokenSimilarity,
  DEFAULT_INTENT_SETTINGS,
  extractIntentTokens,
  getActiveIntentSession,
  getIntentRiskState,
  INTENT_INTERVENTION_ACTIONS,
  INTENT_POMODORO_INFLUENCE_MODES,
  normalizeIntentSettings,
  recordIntentPageVisit
} from '../../../src/js/shared/intentCoherence.js';

describe('intent coherence scoring', () => {
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

  it('extracts comparable local tokens from page metadata', () => {
    assert.deepEqual(extractIntentTokens({
      url: 'https://example.com/search?q=PDE5+inhibitor',
      hostname: 'example.com',
      title: 'PDE5 inhibitor mechanism'
    }).slice(0, 5), ['example', 'search', 'pde5', 'inhibitor', 'mechanism']);
  });

  it('calculates token overlap as a bounded similarity score', () => {
    assert.equal(calculateTokenSimilarity(['pde5', 'mechanism'], ['pde5', 'video']), 1 / 3);
    assert.equal(calculateTokenSimilarity([], []), 1);
    assert.equal(calculateTokenSimilarity(['pde5'], []), 0);
  });

  it('normalizes configurable intent settings and risk thresholds', () => {
    const settings = normalizeIntentSettings({
      enabled: false,
      action: INTENT_INTERVENTION_ACTIONS.BLOCK,
      interventionThreshold: 30,
      lockedThreshold: 50,
      pomodoroInfluence: INTENT_POMODORO_INFLUENCE_MODES.BREAK_LENIENT
    });

    assert.deepEqual(settings, {
      enabled: false,
      action: INTENT_INTERVENTION_ACTIONS.BLOCK,
      interventionThreshold: 30,
      lockedThreshold: 29,
      pomodoroInfluence: INTENT_POMODORO_INFLUENCE_MODES.BREAK_LENIENT,
      diagnosticsRetentionDays: DEFAULT_INTENT_SETTINGS.diagnosticsRetentionDays,
      autoCalibration: true
    });
    assert.equal(getIntentRiskState(30, { ...settings, enabled: true }), 'intervene');
    assert.equal(getIntentRiskState(25, settings), 'clear');
    assert.equal(
      normalizeIntentSettings({ action: INTENT_INTERVENTION_ACTIONS.GRAYSCALE }).action,
      INTENT_INTERVENTION_ACTIONS.GRAYSCALE
    );
    assert.equal(normalizeIntentSettings({ diagnosticsRetentionDays: 0 }).diagnosticsRetentionDays, 1);
    assert.equal(normalizeIntentSettings({ diagnosticsRetentionDays: 100 }).diagnosticsRetentionDays, 30);
  });

  it('uses visible-text topic overlap when metadata is too weak', () => {
    let state = recordIntentPageVisit(null, pageSignal({
      url: 'https://example.com/a',
      hostname: 'example.com',
      title: 'Reference page',
      text: {
        sampleLength: 1000,
        wordCount: 140,
        emojiCount: 0,
        topTokens: ['pde5', 'inhibitor', 'mechanism', 'sildenafil']
      }
    }), { now: () => 1000 });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://other.example.org/b',
      hostname: 'other.example.org',
      title: 'Different page',
      text: {
        sampleLength: 1000,
        wordCount: 140,
        emojiCount: 0,
        topTokens: ['pde5', 'mechanism', 'sildenafil', 'dosage']
      }
    }), { now: () => 2000 });

    const activeSession = getActiveIntentSession(state);
    assert.ok(activeSession.metrics.textOriginSimilarity > activeSession.metrics.metadataOriginSimilarity);
    assert.ok(activeSession.coherenceScore >= 60);
  });

  it('reduces coherence for passive scrolling and click pressure', () => {
    const calmScore = calculateIntentCoherence({
      originSimilarity: 0.8,
      localSimilarity: 0.8,
      domainEntropy: 0,
      passiveMediaLoad: 0,
      passiveInteractionLoad: 0,
      linkDensity: 0.1,
      domainChanges: 0,
      visitCount: 1
    });
    const loopScore = calculateIntentCoherence({
      originSimilarity: 0.8,
      localSimilarity: 0.8,
      domainEntropy: 0,
      passiveMediaLoad: 0,
      passiveInteractionLoad: 1,
      linkDensity: 0.1,
      domainChanges: 0,
      visitCount: 1
    });

    assert.equal(loopScore, calmScore - 10);
  });

  it('reduces coherence for sustained active time on passive pages', () => {
    const calmScore = calculateIntentCoherence({
      originSimilarity: 0.8,
      localSimilarity: 0.8,
      domainEntropy: 0,
      passiveMediaLoad: 0,
      passiveInteractionLoad: 0,
      passiveTimeLoad: 0,
      linkDensity: 0.1,
      domainChanges: 0,
      visitCount: 1
    });
    const sustainedPassiveScore = calculateIntentCoherence({
      originSimilarity: 0.8,
      localSimilarity: 0.8,
      domainEntropy: 0,
      passiveMediaLoad: 0,
      passiveInteractionLoad: 0,
      passiveTimeLoad: 1,
      linkDensity: 0.1,
      domainChanges: 0,
      visitCount: 1
    });

    assert.equal(sustainedPassiveScore, calmScore - 8);
  });

  it('reduces coherence for high interaction velocity', () => {
    const calmScore = calculateIntentCoherence({
      originSimilarity: 0.8,
      localSimilarity: 0.8,
      domainEntropy: 0,
      passiveMediaLoad: 0,
      passiveInteractionLoad: 0,
      passiveTimeLoad: 0,
      interactionVelocityLoad: 0,
      linkDensity: 0.1,
      domainChanges: 0,
      visitCount: 1
    });
    const highVelocityScore = calculateIntentCoherence({
      originSimilarity: 0.8,
      localSimilarity: 0.8,
      domainEntropy: 0,
      passiveMediaLoad: 0,
      passiveInteractionLoad: 0,
      passiveTimeLoad: 0,
      interactionVelocityLoad: 1,
      linkDensity: 0.1,
      domainChanges: 0,
      visitCount: 1
    });

    assert.equal(highVelocityScore, calmScore - 8);
  });

  it('reduces coherence for recommendation or feed click dependence', () => {
    const calmScore = calculateIntentCoherence({
      originSimilarity: 0.8,
      localSimilarity: 0.8,
      domainEntropy: 0,
      passiveMediaLoad: 0,
      passiveInteractionLoad: 0,
      passiveTimeLoad: 0,
      interactionVelocityLoad: 0,
      recommenderClickLoad: 0,
      linkDensity: 0.1,
      domainChanges: 0,
      visitCount: 1
    });
    const recommendationDrivenScore = calculateIntentCoherence({
      originSimilarity: 0.8,
      localSimilarity: 0.8,
      domainEntropy: 0,
      passiveMediaLoad: 0,
      passiveInteractionLoad: 0,
      passiveTimeLoad: 0,
      interactionVelocityLoad: 0,
      recommenderClickLoad: 1,
      linkDensity: 0.1,
      domainChanges: 0,
      visitCount: 1
    });

    assert.equal(recommendationDrivenScore, calmScore - 12);
  });

  it('reduces coherence for redirect-heavy navigation chains', () => {
    const calmScore = calculateIntentCoherence({
      originSimilarity: 0.8,
      localSimilarity: 0.8,
      domainEntropy: 0,
      passiveMediaLoad: 0,
      linkDensity: 0.1,
      domainChanges: 0,
      visitCount: 3,
      redirectTransitionLoad: 0
    });
    const redirectedScore = calculateIntentCoherence({
      originSimilarity: 0.8,
      localSimilarity: 0.8,
      domainEntropy: 0,
      passiveMediaLoad: 0,
      linkDensity: 0.1,
      domainChanges: 0,
      visitCount: 3,
      redirectTransitionLoad: 1
    });

    assert.equal(redirectedScore, calmScore - 5);
  });

  it('keeps coherence scoring bounded', () => {
    assert.equal(calculateIntentCoherence({
      originSimilarity: 0,
      localSimilarity: 0,
      domainEntropy: 1,
      passiveMediaLoad: 1,
      linkDensity: 1,
      domainChanges: 20,
      visitCount: 10
    }), 15);
  });
});
