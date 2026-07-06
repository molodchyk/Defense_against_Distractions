// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  TRIGGERED_ACTION_RESULTS,
  TRIGGERED_ACTION_STEP_TYPES,
  areTriggeredActionChainsAtLeastAsStrict,
  createTriggeredActionOutcomeEvent,
  isTriggeredActionChainAtLeastAsStrict,
  normalizeTriggeredActionChain,
  selectTriggeredActionScenario
} from '../../../src/features/triggered-actions/core/index.js';

const baseChain = {
  id: 'gmail-delete-received',
  name: 'Delete received matching mail',
  enabled: true,
  hostPattern: 'mail.google.com',
  trigger: {
    type: 'keywordBlock',
    keywordIds: ['person-name'],
    minimumScore: 80
  },
  scenarios: [{
    id: 'received-message',
    guards: ['message-row-present', { type: 'target', id: 'trash-button-present' }],
    triggerLocation: 'outsideEditable',
    steps: [
      { type: 'clickOnce', targetRuleId: 'gmail-trash-button' },
      { type: 'blockPage', reason: 'cleanup-complete' }
    ],
    fallback: { type: 'blockPage' }
  }, {
    id: 'compose-draft',
    guards: ['compose-editor-present'],
    triggerLocation: 'editableField',
    steps: [
      { type: 'clearField', targetRuleId: 'gmail-compose-editor' },
      { type: 'blockPage' }
    ],
    fallback: { type: 'blockPage' }
  }],
  runPolicy: {
    oncePerPageVisit: true,
    cooldownSeconds: 30,
    stopOnFirstFailure: true
  }
};

describe('triggered action chain model', () => {
  it('normalizes bounded current-page action-chain configuration', () => {
    const normalized = normalizeTriggeredActionChain({
      ...baseChain,
      version: 99,
      scenarios: [{
        id: 'received message',
        guards: ['message-row-present', 'message-row-present', { type: 'target', id: 'trash-button-present' }],
        steps: [
          { type: 'clickOnce', targetRuleId: 'gmail-trash-button' },
          { type: 'unknownDangerousAction', targetRuleId: 'ignored' },
          { type: 'blockPage' }
        ]
      }]
    });

    assert.equal(normalized.version, 1);
    assert.equal(normalized.hostPattern, 'mail.google.com');
    assert.deepEqual(normalized.trigger.keywordIds, ['person-name']);
    assert.equal(normalized.trigger.minimumScore, 80);
    assert.equal(normalized.scenarios[0].id, 'received_message');
    assert.deepEqual(normalized.scenarios[0].guards.map(guard => `${guard.type}:${guard.id}`), [
      'named:message-row-present',
      'target:trash-button-present'
    ]);
    assert.deepEqual(normalized.scenarios[0].steps.map(step => step.type), [
      TRIGGERED_ACTION_STEP_TYPES.CLICK_ONCE,
      TRIGGERED_ACTION_STEP_TYPES.BLOCK_PAGE
    ]);
  });

  it('selects exactly one matching scenario and exposes fallback for no-match cases', () => {
    const matched = selectTriggeredActionScenario(baseChain, {
      host: 'mail.google.com',
      triggerLocation: 'outsideEditable',
      guards: ['message-row-present', 'target:trash-button-present']
    });

    assert.equal(matched.status, TRIGGERED_ACTION_RESULTS.MATCHED);
    assert.equal(matched.scenarioId, 'received-message');
    assert.deepEqual(matched.steps.map(step => step.type), [
      TRIGGERED_ACTION_STEP_TYPES.CLICK_ONCE,
      TRIGGERED_ACTION_STEP_TYPES.BLOCK_PAGE
    ]);

    const notMatched = selectTriggeredActionScenario(baseChain, {
      host: 'mail.google.com',
      triggerLocation: 'outsideEditable',
      guards: ['message-row-present']
    });
    assert.equal(notMatched.status, TRIGGERED_ACTION_RESULTS.NOT_MATCHED);
    assert.equal(notMatched.fallback.type, TRIGGERED_ACTION_STEP_TYPES.BLOCK_PAGE);

    const hostMismatch = selectTriggeredActionScenario(baseChain, {
      host: 'docs.google.com',
      guards: ['message-row-present', 'target:trash-button-present']
    });
    assert.equal(hostMismatch.status, TRIGGERED_ACTION_RESULTS.HOST_MISMATCH);
  });

  it('uses inverted target guards to require an element rule to be absent', () => {
    const chain = {
      ...baseChain,
      scenarios: [{
        ...baseChain.scenarios[0],
        guards: [
          { type: 'target', id: 'trash-button-present' },
          { type: 'target', id: 'compose-editor-present', invert: true }
        ]
      }]
    };

    const receivedMessage = selectTriggeredActionScenario(chain, {
      host: 'mail.google.com',
      triggerLocation: 'outsideEditable',
      guards: ['target:trash-button-present']
    });
    assert.equal(receivedMessage.status, TRIGGERED_ACTION_RESULTS.MATCHED);

    const composeOpen = selectTriggeredActionScenario(chain, {
      host: 'mail.google.com',
      triggerLocation: 'outsideEditable',
      guards: ['target:trash-button-present', 'target:compose-editor-present']
    });
    assert.equal(composeOpen.status, TRIGGERED_ACTION_RESULTS.NOT_MATCHED);
    assert.equal(composeOpen.fallback.type, TRIGGERED_ACTION_STEP_TYPES.BLOCK_PAGE);
  });

  it('treats multiple matching scenarios as ambiguous and does not select steps', () => {
    const ambiguous = selectTriggeredActionScenario({
      ...baseChain,
      scenarios: [{
        id: 'first',
        guards: ['target-present'],
        steps: [{ type: 'clickOnce', targetRuleId: 'first-button' }]
      }, {
        id: 'second',
        guards: ['target-present'],
        steps: [{ type: 'clickOnce', targetRuleId: 'second-button' }]
      }]
    }, {
      host: 'mail.google.com',
      guards: ['target-present']
    });

    assert.equal(ambiguous.status, TRIGGERED_ACTION_RESULTS.AMBIGUOUS);
    assert.deepEqual(ambiguous.matchingScenarioIds, ['first', 'second']);
    assert.deepEqual(ambiguous.steps, []);
  });

  it('treats removing ordered target-backed action steps as less strict', () => {
    const multiActionChain = {
      ...baseChain,
      scenarios: [{
        ...baseChain.scenarios[0],
        guards: [
          { type: 'target', id: 'trash-button-present' },
          { type: 'target', id: 'gmail-thread-row' }
        ],
        steps: [
          { type: 'clickOnce', targetRuleId: 'gmail-trash-button' },
          { type: 'hideElement', targetRuleId: 'gmail-thread-row' },
          { type: 'blockPage', reason: 'cleanup-complete' }
        ]
      }]
    };

    assert.equal(isTriggeredActionChainAtLeastAsStrict(multiActionChain, {
      ...multiActionChain,
      scenarios: [{
        ...multiActionChain.scenarios[0],
        steps: [
          { type: 'clickOnce', targetRuleId: 'gmail-trash-button' },
          { type: 'blockPage', reason: 'cleanup-complete' }
        ]
      }]
    }), false);
  });

  it('treats adding an absent-target guard as strict only when fallback stays protective', () => {
    const guardedChain = {
      ...baseChain,
      scenarios: [{
        ...baseChain.scenarios[0],
        guards: [
          ...baseChain.scenarios[0].guards,
          { type: 'target', id: 'compose-editor-present', invert: true }
        ]
      }, baseChain.scenarios[1]]
    };

    assert.equal(isTriggeredActionChainAtLeastAsStrict(baseChain, guardedChain), true);

    assert.equal(isTriggeredActionChainAtLeastAsStrict({
      ...baseChain,
      scenarios: [{
        ...baseChain.scenarios[0],
        steps: [{ type: 'clickOnce', targetRuleId: 'gmail-trash-button' }],
        fallback: { type: 'stop' }
      }]
    }, {
      ...baseChain,
      scenarios: [{
        ...baseChain.scenarios[0],
        guards: [
          ...baseChain.scenarios[0].guards,
          { type: 'target', id: 'compose-editor-present', invert: true }
        ],
        steps: [{ type: 'clickOnce', targetRuleId: 'gmail-trash-button' }],
        fallback: { type: 'stop' }
      }]
    }), false);
  });

  it('creates bounded local outcome events without raw trigger text or page content', () => {
    const event = createTriggeredActionOutcomeEvent({
      chain: baseChain,
      scenario: baseChain.scenarios[0],
      step: baseChain.scenarios[0].steps[0],
      stepIndex: 0,
      result: TRIGGERED_ACTION_RESULTS.RAN,
      host: 'https://mail.google.com/mail/u/0/#inbox?query=secret',
      timestamp: '2026-07-05T13:42:17.000Z'
    });

    assert.deepEqual(event, {
      chainId: 'gmail-delete-received',
      scenarioId: 'received-message',
      triggerType: 'keywordBlock',
      stepType: TRIGGERED_ACTION_STEP_TYPES.CLICK_ONCE,
      stepIndex: 0,
      result: TRIGGERED_ACTION_RESULTS.RAN,
      fallbackType: TRIGGERED_ACTION_STEP_TYPES.BLOCK_PAGE,
      host: 'mail.google.com',
      timestampBucket: '2026-07-05T13:00:00.000Z'
    });
    assert.equal('triggerText' in event, false);
    assert.equal('url' in event, false);
    assert.equal('pageText' in event, false);
  });

  it('classifies protected-schedule action-chain edits conservatively', () => {
    const stricter = {
      ...baseChain,
      trigger: {
        ...baseChain.trigger,
        minimumScore: 60
      },
      scenarios: [{
        ...baseChain.scenarios[0],
        steps: [
          ...baseChain.scenarios[0].steps,
          { type: 'blockPage', reason: 'extra-block' }
        ]
      }, baseChain.scenarios[1]],
      runPolicy: {
        ...baseChain.runPolicy,
        cooldownSeconds: 15
      }
    };

    assert.equal(isTriggeredActionChainAtLeastAsStrict(baseChain, stricter), true);
    assert.equal(areTriggeredActionChainsAtLeastAsStrict([baseChain], [stricter, {
      ...baseChain,
      id: 'new-chain',
      scenarios: []
    }]), true);
    assert.equal(areTriggeredActionChainsAtLeastAsStrict([], [{
      ...baseChain,
      id: 'new-blocking-chain'
    }]), true);
    assert.equal(areTriggeredActionChainsAtLeastAsStrict([], [{
      ...baseChain,
      id: 'new-action-only-chain',
      scenarios: [{
        ...baseChain.scenarios[0],
        steps: [{ type: 'hideImages', targetRuleId: 'image_scope' }]
      }]
    }]), false);
    assert.equal(areTriggeredActionChainsAtLeastAsStrict([], [{
      ...baseChain,
      id: 'new-disabled-action-only-chain',
      enabled: false,
      scenarios: [{
        ...baseChain.scenarios[0],
        steps: [{ type: 'hideImages', targetRuleId: 'image_scope' }]
      }]
    }]), true);

    assert.equal(isTriggeredActionChainAtLeastAsStrict({
      ...baseChain,
      trigger: {
        type: 'blockScore',
        minimumScore: 80
      }
    }, {
      ...baseChain,
      trigger: {
        type: 'keywordBlock',
        keywordIds: ['person-name'],
        minimumScore: 80
      }
    }), false);

    assert.equal(isTriggeredActionChainAtLeastAsStrict({
      ...baseChain,
      trigger: {
        type: 'keywordBlock',
        keywordIds: ['person-name'],
        minimumScore: 80
      }
    }, {
      ...baseChain,
      trigger: {
        type: 'keywordBlock',
        keywordIds: ['person-name', 'other-name'],
        minimumScore: 80
      }
    }), true);

    assert.equal(isTriggeredActionChainAtLeastAsStrict({
      ...baseChain,
      trigger: {
        type: 'keywordBlock',
        minimumScore: 80
      }
    }, {
      ...baseChain,
      trigger: {
        type: 'keywordBlock',
        keywordIds: ['person-name'],
        minimumScore: 80
      }
    }), false);

    [
      { ...baseChain, enabled: false },
      { ...baseChain, trigger: { ...baseChain.trigger, minimumScore: 95 } },
      { ...baseChain, scenarios: [baseChain.scenarios[1]] },
      { ...baseChain, scenarios: [{ ...baseChain.scenarios[0], guards: ['message-row-present'] }, baseChain.scenarios[1]] },
      { ...baseChain, scenarios: [{ ...baseChain.scenarios[0], steps: [{ type: 'clickOnce', targetRuleId: 'gmail-trash-button' }] }, baseChain.scenarios[1]] },
      { ...baseChain, fallback: { type: 'stop' } },
      { ...baseChain, runPolicy: { ...baseChain.runPolicy, cooldownSeconds: 60 } }
    ].forEach(nextChain => {
      assert.equal(isTriggeredActionChainAtLeastAsStrict(baseChain, nextChain), false);
    });

    assert.equal(areTriggeredActionChainsAtLeastAsStrict([baseChain], []), false);
  });
});
