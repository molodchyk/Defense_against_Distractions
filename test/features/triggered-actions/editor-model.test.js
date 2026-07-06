// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  TRIGGERED_ACTION_STEP_TYPES,
  TRIGGERED_ACTION_TRIGGER_TYPES,
  createSimpleTriggeredActionChain,
  getSimpleTriggeredActionChainDraftErrors
} from '../../../src/features/triggered-actions/core/index.js';

describe('triggered action editor model', () => {
  it('compiles a simple target-backed action chain with fallback blocking', () => {
    const chain = createSimpleTriggeredActionChain({
      planId: 'plan_1',
      idSeed: 'gmail-delete',
      name: 'Delete received mail',
      hostPattern: 'mail.google.com',
      targetRuleId: 'gmail_trash_button',
      stepType: TRIGGERED_ACTION_STEP_TYPES.CLICK_ONCE,
      triggerLocation: 'outsideEditable',
      minimumScore: 80
    });

    assert.equal(chain.id, 'plan_1_action_gmail-delete');
    assert.equal(chain.name, 'Delete received mail');
    assert.equal(chain.enabled, true);
    assert.equal(chain.hostPattern, 'mail.google.com');
    assert.deepEqual(chain.trigger, {
      type: TRIGGERED_ACTION_TRIGGER_TYPES.BLOCK_SCORE,
      keywordIds: [],
      structuralIds: [],
      minimumScore: 80
    });
    assert.deepEqual(chain.scenarios[0].guards, [{
      type: 'target',
      id: 'gmail_trash_button',
      invert: false
    }]);
    assert.equal(chain.scenarios[0].triggerLocation, 'outsideEditable');
    assert.deepEqual(chain.scenarios[0].steps.map(step => [step.type, step.targetRuleId]), [
      [TRIGGERED_ACTION_STEP_TYPES.CLICK_ONCE, 'gmail_trash_button'],
      [TRIGGERED_ACTION_STEP_TYPES.BLOCK_PAGE, '']
    ]);
    assert.equal(chain.scenarios[0].fallback.type, TRIGGERED_ACTION_STEP_TYPES.BLOCK_PAGE);
  });

  it('compiles a second ordered target-backed action before optional blocking', () => {
    const chain = createSimpleTriggeredActionChain({
      id: 'gmail_remove_thread',
      targetRuleId: 'gmail_trash_button',
      stepType: TRIGGERED_ACTION_STEP_TYPES.CLICK_ONCE,
      absentTargetRuleId: 'gmail_compose_editor',
      additionalSteps: [{
        targetRuleId: 'gmail_thread_row',
        stepType: TRIGGERED_ACTION_STEP_TYPES.HIDE_ELEMENT
      }]
    });

    assert.deepEqual(chain.scenarios[0].guards, [{
      type: 'target',
      id: 'gmail_trash_button',
      invert: false
    }, {
      type: 'target',
      id: 'gmail_thread_row',
      invert: false
    }, {
      type: 'target',
      id: 'gmail_compose_editor',
      invert: true
    }]);
    assert.deepEqual(chain.scenarios[0].steps.map(step => [step.type, step.targetRuleId]), [
      [TRIGGERED_ACTION_STEP_TYPES.CLICK_ONCE, 'gmail_trash_button'],
      [TRIGGERED_ACTION_STEP_TYPES.HIDE_ELEMENT, 'gmail_thread_row'],
      [TRIGGERED_ACTION_STEP_TYPES.BLOCK_PAGE, '']
    ]);
  });

  it('can compile an action-only chain while keeping fallback block explicit', () => {
    const chain = createSimpleTriggeredActionChain({
      id: 'quiet_page',
      targetRuleId: 'image_scope',
      stepType: TRIGGERED_ACTION_STEP_TYPES.HIDE_IMAGES,
      blockAfterAction: false,
      enabled: false,
      minimumScore: 1
    });

    assert.equal(chain.enabled, false);
    assert.deepEqual(chain.scenarios[0].steps.map(step => step.type), [
      TRIGGERED_ACTION_STEP_TYPES.HIDE_IMAGES
    ]);
    assert.equal(chain.scenarios[0].fallback.type, TRIGGERED_ACTION_STEP_TYPES.BLOCK_PAGE);
    assert.equal(chain.trigger.minimumScore, 1);
  });

  it('can compile keyword-specific and structural trigger filters', () => {
    const keywordChain = createSimpleTriggeredActionChain({
      id: 'delete_matching_mail',
      targetRuleId: 'gmail_trash_button',
      triggerType: TRIGGERED_ACTION_TRIGGER_TYPES.KEYWORD_BLOCK,
      triggerFilter: 'Rama Aurora, Rama Aurora',
      stepType: TRIGGERED_ACTION_STEP_TYPES.CLICK_ONCE
    });
    assert.equal(keywordChain.trigger.type, TRIGGERED_ACTION_TRIGGER_TYPES.KEYWORD_BLOCK);
    assert.deepEqual(keywordChain.trigger.keywordIds, ['Rama Aurora']);
    assert.deepEqual(keywordChain.trigger.structuralIds, []);

    const structuralChain = createSimpleTriggeredActionChain({
      id: 'hide_video_area',
      targetRuleId: 'video_scope',
      triggerType: TRIGGERED_ACTION_TRIGGER_TYPES.STRUCTURAL,
      triggerIds: ['has:video', 'has:audible'],
      stepType: TRIGGERED_ACTION_STEP_TYPES.HIDE_ELEMENT
    });
    assert.equal(structuralChain.trigger.type, TRIGGERED_ACTION_TRIGGER_TYPES.STRUCTURAL);
    assert.deepEqual(structuralChain.trigger.keywordIds, []);
    assert.deepEqual(structuralChain.trigger.structuralIds, ['has:video', 'has:audible']);
  });

  it('rejects drafts without a concrete target or supported action', () => {
    assert.deepEqual(getSimpleTriggeredActionChainDraftErrors({
      stepType: TRIGGERED_ACTION_STEP_TYPES.HIDE_ELEMENT
    }), ['targetRuleId']);

    assert.deepEqual(getSimpleTriggeredActionChainDraftErrors({
      targetRuleId: 'target',
      stepType: 'submitForm',
      triggerLocation: 'pageMode',
      triggerType: 'formSubmit'
    }), ['stepType', 'triggerLocation', 'triggerType']);

    assert.equal(createSimpleTriggeredActionChain({
      targetRuleId: '',
      stepType: TRIGGERED_ACTION_STEP_TYPES.HIDE_ELEMENT
    }), null);
  });

  it('rejects absent target guards that conflict with required action targets', () => {
    assert.deepEqual(getSimpleTriggeredActionChainDraftErrors({
      targetRuleId: 'target',
      absentTargetRuleId: 'target',
      stepType: TRIGGERED_ACTION_STEP_TYPES.HIDE_ELEMENT
    }), ['absentTargetRuleId']);

    assert.deepEqual(getSimpleTriggeredActionChainDraftErrors({
      targetRuleId: 'target',
      stepType: TRIGGERED_ACTION_STEP_TYPES.HIDE_ELEMENT,
      absentTargetRuleId: 'second',
      additionalSteps: [{
        targetRuleId: 'second',
        stepType: TRIGGERED_ACTION_STEP_TYPES.CLICK_ONCE
      }]
    }), ['absentTargetRuleId']);
  });

  it('rejects unsupported or unbounded additional action steps', () => {
    assert.deepEqual(getSimpleTriggeredActionChainDraftErrors({
      targetRuleId: 'target',
      stepType: TRIGGERED_ACTION_STEP_TYPES.HIDE_ELEMENT,
      additionalSteps: [{
        targetRuleId: '',
        stepType: TRIGGERED_ACTION_STEP_TYPES.CLICK_ONCE
      }]
    }), ['additionalSteps[0].targetRuleId']);

    assert.deepEqual(getSimpleTriggeredActionChainDraftErrors({
      targetRuleId: 'target',
      stepType: TRIGGERED_ACTION_STEP_TYPES.HIDE_ELEMENT,
      secondTargetRuleId: 'second-target',
      secondStepType: 'submitForm'
    }), ['additionalSteps[0].stepType']);

    assert.equal(createSimpleTriggeredActionChain({
      targetRuleId: 'target',
      stepType: TRIGGERED_ACTION_STEP_TYPES.HIDE_ELEMENT,
      additionalSteps: [{
        targetRuleId: 'second',
        stepType: TRIGGERED_ACTION_STEP_TYPES.HIDE_ELEMENT
      }, {
        targetRuleId: 'third',
        stepType: TRIGGERED_ACTION_STEP_TYPES.HIDE_ELEMENT
      }]
    }), null);
  });

  it('allocates a unique chain id when the generated id already exists', () => {
    const chain = createSimpleTriggeredActionChain({
      planId: 'plan_1',
      idSeed: 'cleanup',
      targetRuleId: 'target',
      stepType: TRIGGERED_ACTION_STEP_TYPES.DISABLE_CONTROLS
    }, [
      { id: 'plan_1_action_cleanup' },
      { id: 'plan_1_action_cleanup_2' }
    ]);

    assert.equal(chain.id, 'plan_1_action_cleanup_3');
  });
});
