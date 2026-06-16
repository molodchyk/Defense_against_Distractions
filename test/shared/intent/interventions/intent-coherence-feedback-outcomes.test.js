// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyIntentFeedbackCalibration,
  INTENT_INTERVENTION_ACTIONS,
  recordIntentFeedback,
  recordIntentPageVisit,
  summarizeIntentFeedback
} from '../../../../src/js/shared/intentCoherence.js';

describe('intent coherence feedback outcomes', () => {
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

  function distractorSignal(overrides = {}) {
    return pageSignal({
      url: 'https://video.example.com/celebrity-reaction-feed',
      hostname: 'video.example.com',
      title: 'Celebrity reaction clips and autoplay feed',
      text: {
        sampleLength: 1400,
        wordCount: 180,
        emojiCount: 20,
        topTokens: ['celebrity', 'reaction', 'clips', 'drama']
      },
      media: {
        imageCount: 20,
        videoCount: 8,
        audioCount: 0,
        gifCount: 6,
        iframeCount: 4
      },
      interaction: {
        linkCount: 90,
        buttonCount: 36,
        inputCount: 0,
        formCount: 0
      },
      structure: {
        elementCount: 1800,
        feedCount: 8
      },
      activity: {
        pageAgeMs: 180000,
        activePageMs: 170000,
        scrollEvents: 120,
        clickEvents: 34,
        recommenderClickEvents: 22,
        feedClickEvents: 18,
        commentClickEvents: 6,
        keyEvents: 0,
        inputEvents: 0,
        recommenderClickRatePerMinute: 8,
        feedClickRatePerMinute: 7,
        commentClickRatePerMinute: 2,
        maxScrollDepthRatio: 0.98
      },
      ...overrides
    });
  }

  function feedbackEntryWithOutcome(index, outcome = {}) {
    return {
      id: `feedback-${index}`,
      recordedAt: new Date(1000 + index).toISOString(),
      action: 'return',
      coherenceScore: 35,
      outcome: {
        observedAt: new Date(2000 + index).toISOString(),
        riskState: 'intervene',
        coherenceScore: 24,
        scoreDelta: -11,
        recovered: false,
        returnedToRecoveryHost: false,
        ...outcome
      }
    };
  }

  it('records a recovered outcome when feedback is followed by return to the recovery host', () => {
    let state = recordIntentPageVisit(null, pageSignal(), { now: () => 1000, tabId: 7 });
    state = recordIntentPageVisit(state, distractorSignal(), { now: () => 2000, tabId: 7 });
    state = recordIntentFeedback(state, {
      action: 'return',
      coherenceScore: 22,
      riskState: 'intervene',
      recoveryUrl: 'https://docs.example.com/pde5-mechanism'
    }, {
      now: () => 3000,
      tabId: 7
    });

    assert.equal(state.feedback[0].outcome, null);

    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://docs.example.com/pde5-mechanism#evidence',
      title: 'PDE5 inhibitor mechanism evidence'
    }), {
      now: () => 4000,
      tabId: 7
    });

    const outcome = state.feedback[0].outcome;
    const summary = summarizeIntentFeedback(state.feedback);

    assert.equal(outcome.recovered, true);
    assert.equal(outcome.returnedToRecoveryHost, true);
    assert.equal(outcome.tabId, 7);
    assert.ok(outcome.scoreDelta > 0);
    assert.equal(summary.outcomeTotal, 1);
    assert.equal(summary.outcomeRecovered, 1);
    assert.equal(summary.outcomeRecoveredRate, 1);
    assert.equal(summary.outcomeReturnHostRate, 1);
  });

  it('records an unrecovered outcome when feedback is followed by more high-pressure drift', () => {
    let state = recordIntentPageVisit(null, pageSignal(), { now: () => 1000, tabId: 7 });
    state = recordIntentPageVisit(state, distractorSignal(), { now: () => 2000, tabId: 7 });
    state = recordIntentFeedback(state, {
      action: 'continue',
      coherenceScore: 35,
      riskState: 'intervene',
      reason: 'I need one more reference.'
    }, {
      now: () => 3000,
      tabId: 7
    });
    state = recordIntentPageVisit(state, distractorSignal({
      url: 'https://video.example.com/celebrity-reaction-feed?page=2',
      title: 'More autoplay reactions'
    }), {
      now: () => 4000,
      tabId: 7
    });

    const outcome = state.feedback[0].outcome;
    const summary = summarizeIntentFeedback(state.feedback);

    assert.equal(outcome.recovered, false);
    assert.equal(outcome.returnedToRecoveryHost, false);
    assert.equal(summary.outcomeTotal, 1);
    assert.equal(summary.outcomeRecovered, 0);
    assert.equal(summary.outcomeRecoveredRate, 0);
    assert.equal(summary.continueOutcomeTotal, 1);
    assert.equal(summary.continueOutcomeRecovered, 0);
    assert.equal(summary.continueOutcomeRecoveredRate, 0);
    assert.equal(summary.continueOutcomeUnrecoveredRate, 1);
    assert.equal(summary.averageContinueOutcomeScoreDelta, outcome.scoreDelta);
    assert.equal(summary.averageOutcomeScoreDelta, outcome.scoreDelta);
  });

  it('summarizes Continue outcomes separately from recovery actions', () => {
    const feedback = [
      feedbackEntryWithOutcome(1, { recovered: true, scoreDelta: 22 }),
      {
        ...feedbackEntryWithOutcome(2, { recovered: false, scoreDelta: -14 }),
        action: 'continue',
        reason: 'Checking whether this is still useful.'
      },
      {
        ...feedbackEntryWithOutcome(3, { recovered: true, scoreDelta: 18 }),
        action: 'continue',
        reason: 'This looks related.'
      }
    ];

    const summary = summarizeIntentFeedback(feedback);

    assert.equal(summary.outcomeTotal, 3);
    assert.equal(summary.outcomeRecovered, 2);
    assert.equal(summary.outcomeRecoveredRate, 0.667);
    assert.equal(summary.continueOutcomeTotal, 2);
    assert.equal(summary.continueOutcomeRecovered, 1);
    assert.equal(summary.continueOutcomeRecoveredRate, 0.5);
    assert.equal(summary.continueOutcomeUnrecoveredRate, 0.5);
    assert.equal(summary.averageContinueOutcomeScoreDelta, 2);
  });

  it('escalates effective feedback calibration when observed outcomes keep failing', () => {
    const feedback = Array.from(
      { length: 3 },
      (_, index) => feedbackEntryWithOutcome(index)
    );
    const summary = summarizeIntentFeedback(feedback);
    const settings = applyIntentFeedbackCalibration({
      action: INTENT_INTERVENTION_ACTIONS.WARN,
      interventionThreshold: 40,
      lockedThreshold: 20
    }, summary);

    assert.equal(summary.outcomeTotal, 3);
    assert.equal(summary.outcomeRecoveredRate, 0);
    assert.equal(settings.action, INTENT_INTERVENTION_ACTIONS.GRAYSCALE);
    assert.equal(settings.interventionThreshold, 46);
    assert.equal(settings.calibration.actionEscalated, true);
    assert.equal(settings.calibration.thresholdDelta, 6);
    assert.equal(settings.calibration.reason, 'Post-intervention outcomes suggest reminders are not restoring control');
  });

  it('does not auto-escalate outcome calibration beyond prompts', () => {
    const summary = summarizeIntentFeedback(Array.from(
      { length: 3 },
      (_, index) => feedbackEntryWithOutcome(index)
    ));
    const settings = applyIntentFeedbackCalibration({
      action: INTENT_INTERVENTION_ACTIONS.PROMPT,
      interventionThreshold: 40,
      lockedThreshold: 20
    }, summary);

    assert.equal(settings.action, INTENT_INTERVENTION_ACTIONS.PROMPT);
    assert.equal(settings.interventionThreshold, 46);
    assert.equal(settings.calibration.actionEscalated, false);
  });
});
