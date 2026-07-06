// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { TRIGGERED_ACTION_TRIGGER_TYPES } from '../../../src/features/triggered-actions/core/index.js';
import { normalizePlanActionDraftPreset } from '../../../src/js/options/plans/actionEditor.js';
import { collectPlanTriggerFilterOptions } from '../../../src/js/options/plans/actionEditorTriggers.js';

describe('plan action editor trigger filters', () => {
  const plan = {
    groups: [{
      keywords: [
        'Rama Aurora, 40/100',
        'has:video',
        'rama aurora, 80/100',
        'has:links>=25, 100/100',
        'literal\\, comma, 30/100'
      ]
    }, {
      keywords: [
        'newsletter',
        'has:comments'
      ]
    }]
  };

  it('suggests existing non-structural plan keywords for keyword triggers', () => {
    assert.deepEqual(
      collectPlanTriggerFilterOptions(plan, TRIGGERED_ACTION_TRIGGER_TYPES.KEYWORD_BLOCK),
      ['Rama Aurora', 'newsletter']
    );
  });

  it('suggests existing structural tokens for structural triggers', () => {
    assert.deepEqual(
      collectPlanTriggerFilterOptions(plan, TRIGGERED_ACTION_TRIGGER_TYPES.STRUCTURAL),
      ['has:video', 'has:links>=25', 'has:comments']
    );
  });

  it('does not suggest filters for any-score triggers', () => {
    assert.deepEqual(
      collectPlanTriggerFilterOptions(plan, TRIGGERED_ACTION_TRIGGER_TYPES.BLOCK_SCORE),
      []
    );
  });

  it('accepts DaD Select action-chain prefill only for an existing plan keyword', () => {
    assert.deepEqual(normalizePlanActionDraftPreset(plan, {
      triggerType: TRIGGERED_ACTION_TRIGGER_TYPES.KEYWORD_BLOCK,
      triggerFilter: 'rama aurora'
    }), {
      triggerType: TRIGGERED_ACTION_TRIGGER_TYPES.KEYWORD_BLOCK,
      triggerFilter: 'Rama Aurora'
    });
    assert.deepEqual(normalizePlanActionDraftPreset(plan, {
      triggerType: TRIGGERED_ACTION_TRIGGER_TYPES.KEYWORD_BLOCK,
      triggerFilter: 'unknown'
    }), {});
  });
});
