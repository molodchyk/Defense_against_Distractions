// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateIntentCoherence,
  calculateTokenSimilarity,
  calculateWeightedTokenSimilarity,
  DEFAULT_INTENT_SETTINGS,
  extractIntentTokens,
  extractWeightedIntentTokens,
  getActiveIntentSession,
  getIntentInterventionDecision,
  getIntentRiskState,
  INTENT_INTERVENTION_ACTIONS,
  INTENT_POMODORO_INFLUENCE_MODES,
  isIntentSettingsAtLeastAsStrict,
  normalizePageSignalForIntent,
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

  it('weights search, title, heading, and description tokens for metadata similarity', () => {
    const weightedTokens = extractWeightedIntentTokens({
      url: 'https://example.com/search?q=PDE5+inhibitor',
      hostname: 'example.com',
      title: 'PDE5 mechanism',
      text: {
        headingTokens: ['inhibitor evidence'],
        descriptionTokens: ['pulmonary hypertension therapy'],
        clickedLinkTokens: ['clinical trial'],
        selectedTextTokens: ['dosage reference']
      }
    });

    assert.deepEqual(
      weightedTokens.filter(entry => ['pde5', 'inhibitor', 'mechanism', 'pulmonary', 'clinical', 'dosage'].includes(entry.token)),
      [
        { token: 'pde5', source: 'search', weight: 4 },
        { token: 'inhibitor', source: 'search', weight: 4 },
        { token: 'mechanism', source: 'title', weight: 3 },
        { token: 'pulmonary', source: 'description', weight: 2 },
        { token: 'clinical', source: 'clickedLink', weight: 3 },
        { token: 'dosage', source: 'selectedText', weight: 3 }
      ]
    );
    assert.ok(calculateWeightedTokenSimilarity(
      [{ token: 'pde5', weight: 4 }, { token: 'mechanism', weight: 1 }],
      [{ token: 'pde5', weight: 4 }, { token: 'video', weight: 1 }]
    ) > calculateTokenSimilarity(['pde5', 'mechanism'], ['pde5', 'video']));
  });

  it('normalizes semantic page tokens without raw heading or description text', () => {
    const signal = normalizePageSignalForIntent(pageSignal({
      url: 'https://docs.example.com/reference',
      hostname: 'docs.example.com',
      title: 'Reference page',
      text: {
        sampleLength: 1000,
        wordCount: 140,
        emojiCount: 0,
        topTokens: ['reference', 'dosage'],
        headingTokens: ['PDE5 inhibitor guide'],
        descriptionTokens: ['Sildenafil mechanism reference'],
        clickedLinkTokens: ['Clinical trial'],
        selectedTextTokens: ['Dosage evidence']
      }
    }), { now: () => 1000 });

    assert.deepEqual(signal.text.headingTokens, ['pde5', 'inhibitor', 'guide']);
    assert.deepEqual(signal.text.descriptionTokens, ['sildenafil', 'mechanism', 'reference']);
    assert.deepEqual(signal.text.clickedLinkTokens, ['clinical', 'trial']);
    assert.deepEqual(signal.text.selectedTextTokens, ['dosage', 'evidence']);
    assert.deepEqual(
      signal.weightedMetadataTokens.filter(entry => ['pde5', 'sildenafil', 'clinical', 'dosage'].includes(entry.token)),
      [
        { token: 'pde5', source: 'heading', weight: 2 },
        { token: 'sildenafil', source: 'description', weight: 2 },
        { token: 'clinical', source: 'clickedLink', weight: 3 },
        { token: 'dosage', source: 'selectedText', weight: 3 }
      ]
    );
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
      autoCalibration: true,
      autoCloseQuarantinedTab: false
    });
    assert.equal(getIntentRiskState(30, { ...settings, enabled: true }), 'intervene');
    assert.equal(getIntentRiskState(25, settings), 'clear');
    assert.equal(
      normalizeIntentSettings({ action: INTENT_INTERVENTION_ACTIONS.GRAYSCALE }).action,
      INTENT_INTERVENTION_ACTIONS.GRAYSCALE
    );
    assert.equal(
      normalizeIntentSettings({ action: INTENT_INTERVENTION_ACTIONS.REDUCE_NOISE }).action,
      INTENT_INTERVENTION_ACTIONS.REDUCE_NOISE
    );
    assert.equal(normalizeIntentSettings({ diagnosticsRetentionDays: 0 }).diagnosticsRetentionDays, 1);
    assert.equal(normalizeIntentSettings({ diagnosticsRetentionDays: 100 }).diagnosticsRetentionDays, 30);
  });

  it('allows protected-schedule intent changes that make settings stricter', () => {
    assert.equal(isIntentSettingsAtLeastAsStrict(
      { ...DEFAULT_INTENT_SETTINGS, enabled: false },
      { ...DEFAULT_INTENT_SETTINGS, enabled: true }
    ), true);

    assert.equal(isIntentSettingsAtLeastAsStrict({
      ...DEFAULT_INTENT_SETTINGS,
      enabled: true,
      action: INTENT_INTERVENTION_ACTIONS.GRAYSCALE,
      interventionThreshold: 40,
      lockedThreshold: 20,
      pomodoroInfluence: INTENT_POMODORO_INFLUENCE_MODES.BOTH,
      diagnosticsRetentionDays: 14,
      autoCalibration: true
    }, {
      ...DEFAULT_INTENT_SETTINGS,
      enabled: true,
      action: INTENT_INTERVENTION_ACTIONS.BLOCK,
      interventionThreshold: 55,
      lockedThreshold: 35,
      pomodoroInfluence: INTENT_POMODORO_INFLUENCE_MODES.WORK_STRICTER,
      diagnosticsRetentionDays: 7,
      autoCalibration: true,
      autoCloseQuarantinedTab: true
    }), true);
  });

  it('rejects protected-schedule intent changes that relax settings', () => {
    const protectedSettings = {
      ...DEFAULT_INTENT_SETTINGS,
      enabled: true,
      action: INTENT_INTERVENTION_ACTIONS.PROMPT,
      interventionThreshold: 50,
      lockedThreshold: 25,
      pomodoroInfluence: INTENT_POMODORO_INFLUENCE_MODES.WORK_STRICTER,
      diagnosticsRetentionDays: 7,
      autoCalibration: true,
      autoCloseQuarantinedTab: true
    };

    [
      { ...protectedSettings, enabled: false },
      { ...protectedSettings, action: INTENT_INTERVENTION_ACTIONS.WARN },
      { ...protectedSettings, interventionThreshold: 49 },
      { ...protectedSettings, lockedThreshold: 24 },
      { ...protectedSettings, pomodoroInfluence: INTENT_POMODORO_INFLUENCE_MODES.BOTH },
      { ...protectedSettings, diagnosticsRetentionDays: 8 },
      { ...protectedSettings, autoCalibration: false },
      { ...protectedSettings, autoCloseQuarantinedTab: false }
    ].forEach(nextSettings => {
      assert.equal(isIntentSettingsAtLeastAsStrict(protectedSettings, nextSettings), false);
    });
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

  it('tracks low return to origin or hub pages in fragmented sessions', () => {
    let state = recordIntentPageVisit(null, pageSignal(), { now: () => 1000 });
    [
      ['https://news.example.com/story', 'news.example.com', 'Breaking story', ['breaking', 'story', 'headline']],
      ['https://shop.example.com/deal', 'shop.example.com', 'Shopping deal', ['shopping', 'deal', 'cart']],
      ['https://video.example.com/feed', 'video.example.com', 'Reaction feed', ['reaction', 'feed', 'clips']]
    ].forEach(([url, hostname, title, topTokens], index) => {
      state = recordIntentPageVisit(state, pageSignal({
        url,
        hostname,
        title,
        text: { sampleLength: 1000, wordCount: 120, emojiCount: 0, topTokens }
      }), { now: () => 2000 + index });
    });

    const activeSession = getActiveIntentSession(state);

    assert.equal(activeSession.metrics.returnRate, 0);
    assert.equal(activeSession.metrics.originReturnRate, 0);
    assert.equal(activeSession.metrics.lowReturnLoad, 1);
    assert.ok(getIntentInterventionDecision(activeSession).reasonLines.includes(
      'Low return to origin or hub pages'
    ));
  });

  it('reduces low-return load when a fragmented session revisits a hub', () => {
    let state = recordIntentPageVisit(null, pageSignal(), { now: () => 1000 });
    [
      ['https://news.example.com/story', 'news.example.com', 'Breaking story', ['breaking', 'story']],
      ['https://docs.example.com/pde5-mechanism', 'docs.example.com', 'PDE5 notes', ['pde5', 'notes']],
      ['https://news.example.com/followup', 'news.example.com', 'Follow up story', ['followup', 'story']]
    ].forEach(([url, hostname, title, topTokens], index) => {
      state = recordIntentPageVisit(state, pageSignal({
        url,
        hostname,
        title,
        text: { sampleLength: 1000, wordCount: 120, emojiCount: 0, topTokens }
      }), { now: () => 2000 + index });
    });

    const activeSession = getActiveIntentSession(state);

    assert.equal(activeSession.metrics.domainReturnCount, 2);
    assert.equal(activeSession.metrics.returnRate, 0.667);
    assert.equal(activeSession.metrics.lowReturnLoad, 0.333);
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

  it('reduces coherence for high aggregate open-tab pressure', () => {
    const calmScore = calculateIntentCoherence({
      originSimilarity: 0.8,
      localSimilarity: 0.8,
      domainEntropy: 0,
      passiveMediaLoad: 0,
      linkDensity: 0.1,
      domainChanges: 0,
      visitCount: 1,
      tabPressureLoad: 0
    });
    const highPressureScore = calculateIntentCoherence({
      originSimilarity: 0.8,
      localSimilarity: 0.8,
      domainEntropy: 0,
      passiveMediaLoad: 0,
      linkDensity: 0.1,
      domainChanges: 0,
      visitCount: 1,
      tabPressureLoad: 1
    });

    assert.equal(highPressureScore, calmScore - 6);
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
