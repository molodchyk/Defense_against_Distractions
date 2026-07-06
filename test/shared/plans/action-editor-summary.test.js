// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  TRIGGERED_ACTION_STEP_TYPES,
  createSimpleTriggeredActionChain
} from '../../../src/features/triggered-actions/core/index.js';
import { formatChainSummary } from '../../../src/js/options/plans/actionEditorSummary.js';

describe('plan action editor summaries', () => {
  it('includes both bounded scenarios in a compact chain summary', () => {
    const chain = createSimpleTriggeredActionChain({
      id: 'gmail_two_state_cleanup',
      hostPattern: 'mail.google.com',
      targetRuleId: 'gmail_trash_button',
      stepType: TRIGGERED_ACTION_STEP_TYPES.CLICK_ONCE,
      absentTargetRuleId: 'gmail_compose_editor',
      triggerLocation: 'outsideEditable',
      scenarioDrafts: [{
        targetRuleId: 'gmail_compose_editor',
        stepType: TRIGGERED_ACTION_STEP_TYPES.CLEAR_FIELD,
        absentTargetRuleId: 'gmail_trash_button',
        triggerLocation: 'editableField'
      }]
    });

    const summary = formatChainSummary(chain, [{
      id: 'gmail_trash_button',
      name: 'Trash button'
    }, {
      id: 'gmail_compose_editor',
      name: 'Compose editor'
    }]);

    assert.equal(
      summary,
      'Enabled · mail.google.com · Any block score · Click once: Trash button · without: Compose editor · Outside editable fields · blocks after action / Clear field: Compose editor · without: Trash button · Inside editable field · blocks after action'
    );
  });
});
