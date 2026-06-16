// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  attachIntentInterventionTabScope
} from '../../../../src/js/background/intent/diagnostics.js';
import {
  INTENT_INTERVENTION_ACTIONS
} from '../../../../src/js/shared/intentCoherence.js';

describe('intent intervention tab scope', () => {
  it('adds count-only same-chain drift tab scope to hard-chain interventions', () => {
    const intervention = {
      action: INTENT_INTERVENTION_ACTIONS.BLOCK,
      hardBlocked: true,
      chainBlock: {
        active: true,
        cooldownActive: true
      }
    };
    const state = {
      tabLineage: [
        { tabId: 1, rootTabId: 1, driftDescendant: false },
        { tabId: 2, rootTabId: 1, driftDescendant: true },
        { tabId: 3, rootTabId: 1, driftDescendant: true },
        { tabId: 4, rootTabId: 4, driftDescendant: true },
        { tabId: 5, rootTabId: 1, driftDescendant: false }
      ]
    };

    const scopedIntervention = attachIntentInterventionTabScope(intervention, state, 1);

    assert.equal(scopedIntervention.chainBlock.driftDescendantTabCount, 2);
    assert.equal(scopedIntervention.chainBlock.chainReturnTabCount, 3);
    assert.equal(scopedIntervention.chainBlock.active, true);
    assert.equal('tabIds' in scopedIntervention.chainBlock, false);
  });
});
