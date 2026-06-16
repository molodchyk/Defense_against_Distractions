// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyIntentFeedbackCalibration,
  createIntentTrajectoryState,
  deriveIntentFeedbackCalibration,
  getActiveIntentSession,
  getIntentInterventionDecision,
  getLastCoherentIntentVisit,
  INTENT_INTERVENTION_ACTIONS,
  MAX_INTENT_CONTINUE_REASON_LENGTH,
  recordIntentFeedback,
  recordIntentPageVisit,
  shouldFreezeIntentNewTabs,
  summarizeIntentFeedback
} from '../../../../src/js/shared/intentCoherence.js';

describe('intent coherence interventions', () => {
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

  it('selects the last coherent visit as an intervention recovery target', () => {
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
    }), { now: () => 3000 });

    const activeSession = getActiveIntentSession(state);
    const recoveryVisit = getLastCoherentIntentVisit(activeSession);
    const intervention = getIntentInterventionDecision(activeSession);

    assert.equal(recoveryVisit.hostname, 'wikipedia.org');
    assert.equal(intervention.riskState, 'intervene');
    assert.equal(intervention.shouldIntervene, true);
    assert.equal(intervention.recoveryUrl, 'https://wikipedia.org/wiki/PDE5');
    assert.equal(intervention.freezeNewTabs, true);
    assert.ok(intervention.reasonLines.length > 0);
  });

  it('freezes new child tabs only for active non-warning interventions', () => {
    assert.equal(shouldFreezeIntentNewTabs({
      shouldIntervene: true,
      action: INTENT_INTERVENTION_ACTIONS.PROMPT
    }), true);
    assert.equal(shouldFreezeIntentNewTabs({
      shouldIntervene: true,
      action: INTENT_INTERVENTION_ACTIONS.GRAYSCALE
    }), true);
    assert.equal(shouldFreezeIntentNewTabs({
      shouldIntervene: true,
      action: INTENT_INTERVENTION_ACTIONS.REDUCE_NOISE
    }), true);
    assert.equal(shouldFreezeIntentNewTabs({
      shouldIntervene: true,
      action: INTENT_INTERVENTION_ACTIONS.BLOCK
    }), true);
    assert.equal(shouldFreezeIntentNewTabs({
      shouldIntervene: true,
      action: INTENT_INTERVENTION_ACTIONS.WARN
    }), false);
    assert.equal(shouldFreezeIntentNewTabs({
      shouldIntervene: false,
      action: INTENT_INTERVENTION_ACTIONS.PROMPT
    }), false);
  });

  it('marks block-action locked sessions as hard chain blocks', () => {
    let state = recordIntentPageVisit(null, pageSignal({
      url: 'https://wikipedia.org/wiki/PDE5',
      hostname: 'wikipedia.org',
      title: 'PDE5 mechanism and sildenafil'
    }), { now: () => 1000 });
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

    const intervention = getIntentInterventionDecision(getActiveIntentSession(state), {
      intentSettings: {
        action: INTENT_INTERVENTION_ACTIONS.BLOCK,
        interventionThreshold: 80,
        lockedThreshold: 70
      },
      chainBlockCooldownMs: 5000,
      now: () => 3000
    });

    assert.equal(intervention.riskState, 'locked');
    assert.equal(intervention.shouldIntervene, true);
    assert.equal(intervention.hardBlocked, true);
    assert.equal(intervention.chainBlock.active, true);
    assert.equal(intervention.chainBlock.mode, 'lockedChain');
    assert.equal(intervention.chainBlock.reason, 'Session crossed the locked threshold');
    assert.equal(intervention.chainBlock.startedAt, new Date(2000).toISOString());
    assert.equal(intervention.chainBlock.cooldownActive, true);
    assert.equal(intervention.chainBlock.cooldownRemainingMs, 4000);

    const afterCooldown = getIntentInterventionDecision(getActiveIntentSession(state), {
      intentSettings: {
        action: INTENT_INTERVENTION_ACTIONS.BLOCK,
        interventionThreshold: 80,
        lockedThreshold: 70
      },
      chainBlockCooldownMs: 5000,
      now: () => 7000
    });

    assert.equal(afterCooldown.chainBlock.active, true);
    assert.equal(afterCooldown.chainBlock.cooldownActive, false);
    assert.equal(afterCooldown.chainBlock.cooldownRemainingMs, 0);
    assert.equal(afterCooldown.chainBlock.autoCloseCurrentTab, false);

    const autoCloseAfterCooldown = getIntentInterventionDecision(getActiveIntentSession(state), {
      intentSettings: {
        action: INTENT_INTERVENTION_ACTIONS.BLOCK,
        interventionThreshold: 80,
        lockedThreshold: 70,
        autoCloseQuarantinedTab: true
      },
      chainBlockCooldownMs: 5000,
      now: () => 7000
    });

    assert.equal(autoCloseAfterCooldown.chainBlock.active, true);
    assert.equal(autoCloseAfterCooldown.chainBlock.cooldownActive, false);
    assert.equal(autoCloseAfterCooldown.chainBlock.autoCloseCurrentTab, true);
  });

  it('records local intervention feedback against the active intent session', () => {
    let state = recordIntentPageVisit(null, pageSignal(), {
      now: () => 1000,
      tabId: 7
    });
    const activeSession = getActiveIntentSession(state);
    const activeVisit = activeSession.visits[0];

    state = recordIntentFeedback(state, {
      action: 'continue',
      interventionId: 'intent-session-1000:intervene:intent-visit-1000',
      coherenceScore: 33,
      riskState: 'intervene',
      policyAction: 'prompt',
      reason: '  Reviewing this citation\nfor the mechanism section.  '
    }, {
      now: () => 2000,
      tabId: 7
    });

    assert.equal(state.feedback.length, 1);
    assert.equal(state.feedback[0].action, 'continue');
    assert.equal(state.feedback[0].sessionId, activeSession.id);
    assert.equal(state.feedback[0].visitId, activeVisit.id);
    assert.equal(state.feedback[0].tabId, 7);
    assert.equal(state.feedback[0].riskState, 'intervene');
    assert.equal(state.feedback[0].coherenceScore, 33);
    assert.equal(state.feedback[0].policyAction, 'prompt');
    assert.equal(state.feedback[0].reason, 'Reviewing this citation for the mechanism section.');
    assert.equal(state.feedback[0].currentHostname, 'docs.example.com');
  });

  it('bounds continue reasons and ignores reasons for other feedback actions', () => {
    const longReason = ` ${'a'.repeat(MAX_INTENT_CONTINUE_REASON_LENGTH + 30)} `;
    let state = recordIntentFeedback(createIntentTrajectoryState(1000), {
      action: 'continue',
      reason: longReason
    }, {
      now: () => 2000
    });

    state = recordIntentFeedback(state, {
      action: 'return',
      reason: 'This should not be stored.'
    }, {
      now: () => 3000
    });

    assert.equal(state.feedback[0].reason.length, MAX_INTENT_CONTINUE_REASON_LENGTH);
    assert.equal(state.feedback[0].reason, 'a'.repeat(MAX_INTENT_CONTINUE_REASON_LENGTH));
    assert.equal(state.feedback[1].reason, '');
    assert.equal(summarizeIntentFeedback(state.feedback).continueReasonCount, 1);
  });

  it('records coherent marks as local false-positive feedback', () => {
    const state = recordIntentFeedback(createIntentTrajectoryState(1000), {
      action: 'markCoherent',
      coherenceScore: 31
    }, {
      now: () => 1001
    });

    const summary = summarizeIntentFeedback(state.feedback);

    assert.equal(state.feedback[0].action, 'markCoherent');
    assert.equal(summary.counts.markCoherent, 1);
    assert.equal(summary.markCoherentRate, 1);
    assert.equal(summary.averageCoherenceScore, 31);
  });

  it('bounds stored intervention feedback entries', () => {
    let state = createIntentTrajectoryState(1000);
    for (let index = 0; index < 30; index += 1) {
      state = recordIntentFeedback(state, {
        action: 'isolate',
        interventionId: `feedback-${index}`
      }, {
        now: () => 1000 + index,
        maxFeedbackEntries: 12
      });
    }

    assert.equal(state.feedback.length, 12);
    assert.equal(state.feedback[0].interventionId, 'feedback-18');
    assert.equal(state.feedback[11].interventionId, 'feedback-29');
  });

  it('summarizes intervention feedback for calibration diagnostics', () => {
    let state = createIntentTrajectoryState(1000);
    ['return', 'return', 'return', 'isolate', 'continue'].forEach((action, index) => {
      state = recordIntentFeedback(state, {
        action,
        coherenceScore: 20 + index,
        reason: action === 'continue' ? 'Still relevant to the task.' : ''
      }, {
        now: () => 1000 + index
      });
    });

    const summary = summarizeIntentFeedback(state.feedback);

    assert.equal(summary.total, 5);
    assert.equal(summary.counts.return, 3);
    assert.equal(summary.counts.isolate, 1);
    assert.equal(summary.returnRate, 0.6);
    assert.equal(summary.isolateRate, 0.2);
    assert.equal(summary.continueRate, 0.2);
    assert.equal(summary.continueReasonCount, 1);
    assert.equal(summary.averageCoherenceScore, 22);
    assert.equal(summary.recommendation, 'interventionsHelpful');
  });

  it('flags repeated continue, isolate, or coherent-mark feedback as a sensitivity diagnostic', () => {
    let state = createIntentTrajectoryState(1000);
    ['markCoherent', 'continue', 'markCoherent', 'isolate', 'continue'].forEach((action, index) => {
      state = recordIntentFeedback(state, { action }, { now: () => 1000 + index });
    });

    const summary = summarizeIntentFeedback(state.feedback);

    assert.equal(summary.markCoherentRate, 0.4);
    assert.equal(summary.recommendation, 'tooSensitive');
  });

  it('derives conservative local calibration from intervention feedback', () => {
    let helpfulState = createIntentTrajectoryState(1000);
    ['return', 'return', 'return', 'return', 'continue'].forEach((action, index) => {
      helpfulState = recordIntentFeedback(helpfulState, { action }, { now: () => 1000 + index });
    });

    const helpfulSummary = summarizeIntentFeedback(helpfulState.feedback);
    const helpfulCalibration = deriveIntentFeedbackCalibration(helpfulSummary, {
      interventionThreshold: 40,
      lockedThreshold: 20
    });

    assert.equal(helpfulCalibration.applied, true);
    assert.equal(helpfulCalibration.thresholdDelta, 6);
    assert.equal(helpfulCalibration.effectiveInterventionThreshold, 46);

    let sensitiveState = createIntentTrajectoryState(1000);
    ['continue', 'markCoherent', 'isolate', 'continue', 'acknowledge'].forEach((action, index) => {
      sensitiveState = recordIntentFeedback(sensitiveState, { action }, { now: () => 2000 + index });
    });

    const sensitiveSummary = summarizeIntentFeedback(sensitiveState.feedback);
    const calibratedSettings = applyIntentFeedbackCalibration({
      interventionThreshold: 40,
      lockedThreshold: 38
    }, sensitiveSummary);

    assert.equal(calibratedSettings.interventionThreshold, 39);
    assert.equal(calibratedSettings.lockedThreshold, 38);
    assert.equal(calibratedSettings.calibration.thresholdDelta, -1);
  });

  it('does not calibrate intent thresholds when auto calibration is disabled', () => {
    let state = createIntentTrajectoryState(1000);
    ['return', 'return', 'return', 'return', 'return'].forEach((action, index) => {
      state = recordIntentFeedback(state, { action }, { now: () => 1000 + index });
    });

    const calibratedSettings = applyIntentFeedbackCalibration({
      interventionThreshold: 40,
      lockedThreshold: 20,
      autoCalibration: false
    }, summarizeIntentFeedback(state.feedback));

    assert.equal(calibratedSettings.interventionThreshold, 40);
    assert.equal(calibratedSettings.autoCalibration, false);
    assert.equal(calibratedSettings.calibration.enabled, false);
    assert.equal(calibratedSettings.calibration.applied, false);
  });
});
