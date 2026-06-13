// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getIntentSignalBreakdown
} from '../../../src/js/popup/intent/intentDiagnosticsPanel.js';
import {
  countKnownDriftDescendantTabs,
  formatDriftDescendantTabCount,
  formatIntentInterventionStatus,
  formatIntentPolicyStatus,
  formatReturnedChainStatus,
  getIntentRecoveryTimeline
} from '../../../src/js/popup/intent/intentRecoveryModel.js';
import {
  canContinueIntentIntervention,
  getIntentContinueControlState,
  normalizePopupIntentContinueReason
} from '../../../src/js/popup/intent/intentContinueControl.js';

function message(key, substitutions = []) {
  const messages = {
    popupIntentReturned: 'Returned to last coherent page.',
    popupIntentReturnedChain: `Returned current tab and ${substitutions[0]} drift ${substitutions[1]}.`,
    popupIntentTabSingular: 'tab',
    popupIntentTabPlural: 'tabs',
    popupNoneDetectedTitleCase: 'None detected',
    popupIntentInterventionInactive: 'Inactive',
    popupIntentActionPromptLabel: 'Prompt',
    popupIntentChainQuarantineLabel: 'Chain quarantine',
    popupIntentDriftDescendantLabel: 'drift descendant',
    popupIntentLockedChainLabel: 'locked chain',
    popupIntentAutoReturnIn: `auto-return in ${substitutions[0]}`,
    popupIntentAutoCloseReady: 'auto-close ready'
  };
  return messages[key] || key;
}

describe('popup intent recovery panel helpers', () => {
  it('formats compact intent signal breakdown rows', () => {
    assert.deepEqual(getIntentSignalBreakdown({
      originSimilarity: 0.42,
      localSimilarity: 0.81,
      passiveMediaLoad: 0.5,
      feedCommentInteractionLoad: 0.78,
      longSessionLoad: 0.84,
      mediaChainLoad: 0.34,
      agencyRatio: 0.64,
      lowAgencyLoad: 0.22,
      openTabCount: 12,
      tabSwitchCount: 7
    }), {
      origin: '42% origin / 81% local',
      passive: '84% load / 34% chain',
      agency: '64% agency / 22% low',
      navigation: '12 tabs / 7 switches'
    });
  });

  it('formats current-tab return when there are no other drift tabs', () => {
    assert.equal(formatReturnedChainStatus(0, message), 'Returned to last coherent page.');
  });

  it('formats combined chain return for one or more drift tabs', () => {
    assert.equal(formatReturnedChainStatus(1, message), 'Returned current tab and 1 drift tab.');
    assert.equal(formatReturnedChainStatus(3, message), 'Returned current tab and 3 drift tabs.');
  });

  it('counts only same-root known drift descendant tabs', () => {
    const debugState = {
      state: {
        tabLineage: [
          { tabId: 1, rootTabId: 1, driftDescendant: false },
          { tabId: 2, rootTabId: 1, driftDescendant: true },
          { tabId: 3, rootTabId: 1, driftDescendant: true },
          { tabId: 4, rootTabId: 4, driftDescendant: true },
          { tabId: 5, rootTabId: 1, driftDescendant: false },
          { tabId: 3, rootTabId: 1, driftDescendant: true }
        ]
      }
    };

    assert.equal(countKnownDriftDescendantTabs(debugState, 1), 2);
  });

  it('formats known drift descendant tab counts for popup details', () => {
    assert.equal(formatDriftDescendantTabCount(0, message), 'None detected');
    assert.equal(formatDriftDescendantTabCount(1, message), '1 tab');
    assert.equal(formatDriftDescendantTabCount(4, message), '4 tabs');
  });

  it('allows popup Continue only for active prompt-style interventions with a reason', () => {
    const promptIntervention = {
      shouldIntervene: true,
      action: 'prompt',
      settings: { enabled: true, action: 'prompt' }
    };

    assert.equal(canContinueIntentIntervention(promptIntervention), true);
    assert.equal(getIntentContinueControlState({
      intervention: promptIntervention,
      canActOnActiveTab: true,
      reason: '  Still part of the task.  '
    }).disabled, false);
    assert.deepEqual(getIntentContinueControlState({
      intervention: promptIntervention,
      canActOnActiveTab: true,
      reason: ''
    }), {
      available: true,
      disabled: true,
      maxLength: 160,
      reason: '',
      reasonLength: 0,
      titleKey: 'popupIntentContinueReasonRequired'
    });
  });

  it('keeps popup Continue unavailable for warning and hard chain quarantine actions', () => {
    assert.equal(canContinueIntentIntervention({
      shouldIntervene: true,
      action: 'warn',
      settings: { enabled: true, action: 'warn' }
    }), false);
    assert.equal(canContinueIntentIntervention({
      shouldIntervene: true,
      action: 'block',
      settings: { enabled: true, action: 'block' },
      chainBlock: { active: true }
    }), false);
  });

  it('normalizes popup Continue reasons with the shared length cap', () => {
    const normalized = normalizePopupIntentContinueReason(`  ${'reason '.repeat(40)}  `);

    assert.equal(normalized.length, 160);
    assert.equal(/\s{2,}/.test(normalized), false);
    assert.equal(normalized.startsWith('reason reason'), true);
  });

  it('builds a compact recovery timeline with origin, first drift, and current page', () => {
    const timeline = getIntentRecoveryTimeline([
      { id: 'v1', hostname: 'anki.local', title: 'Card', activeMs: 60000 },
      { id: 'v2', hostname: 'search.example', transitionType: 'typed', activeMs: 30000 },
      { id: 'v3', hostname: 'video.example', transitionType: 'link', activeMs: 45000 },
      { id: 'v4', hostname: 'feed.example', transitionType: 'link', activeMs: 20000 },
      { id: 'v5', hostname: 'comments.example', driftDescendant: true, transitionType: 'link', activeMs: 10000 }
    ], {
      firstDriftVisitId: 'v3',
      maxItems: 4
    });

    assert.deepEqual(timeline.map(item => item.id), ['v1', 'v3', 'v4', 'v5']);
    assert.deepEqual(timeline[0].markers, ['origin']);
    assert.deepEqual(timeline[1].markers, ['firstDrift']);
    assert.equal(timeline[1].skippedBefore, 1);
    assert.deepEqual(timeline[3].markers, ['driftDescendant', 'current']);
    assert.equal(timeline[3].label, 'comments.example');
  });

  it('formats active intent intervention status for the recovery card', () => {
    assert.equal(formatIntentInterventionStatus({
      shouldIntervene: false,
      settings: { enabled: true, action: 'prompt' }
    }, message), 'Inactive');

    assert.equal(formatIntentInterventionStatus({
      shouldIntervene: true,
      riskState: 'intervene',
      action: 'prompt',
      settings: { enabled: true, action: 'prompt' }
    }, message), 'Prompt - intervene');

    assert.equal(formatIntentInterventionStatus({
      settings: { enabled: true, action: 'block' },
      chainBlock: {
        active: true,
        mode: 'lockedChain',
        cooldownActive: true,
        cooldownRemainingMs: 45000,
        autoCloseCurrentTab: false
      }
    }, message), 'Chain quarantine - locked chain - auto-return in 45s');

    assert.equal(formatIntentInterventionStatus({
      settings: { enabled: true, action: 'block' },
      chainBlock: {
        active: true,
        mode: 'driftDescendant',
        cooldownActive: false,
        cooldownMs: 45000,
        autoCloseCurrentTab: true
      }
    }, message), 'Chain quarantine - drift descendant - auto-close ready');
  });

  it('formats compact effective intent policy status for the recovery card', () => {
    assert.equal(formatIntentPolicyStatus({
      settings: {
        enabled: true,
        action: 'grayscale',
        interventionThreshold: 46,
        calibration: {
          thresholdDelta: 6,
          actionEscalated: true,
          baselineAction: 'warn',
          effectiveAction: 'grayscale',
          outcomeTotal: 3
        }
      }
    }), 'grayscale <= 46 - warn -> grayscale - threshold +6 - 3 outcomes');
  });
});
