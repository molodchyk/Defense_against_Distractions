// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

import {
  getProductSpecFailures,
  selectedTextQuickAddTraceFailure,
  selectedTextQuickAddSpecFailure,
  triggeredActionSpecFailure
} from '../../../scripts/playbook/product/specs.mjs';

async function readDocs() {
  const [potentialFunctionality, selectedTextQuickAdd, triggeredActions] = await Promise.all([
    readFile('docs/potential-functionality.md', 'utf8'),
    readFile('docs/selected-text-quick-add.md', 'utf8'),
    readFile('docs/triggered-actions.md', 'utf8')
  ]);

  return { potentialFunctionality, selectedTextQuickAdd, triggeredActions };
}

describe('product spec checks', () => {
  it('accepts the current triggered-action and quick-add specs', async () => {
    const docs = await readDocs();

    assert.deepEqual(getProductSpecFailures(docs), []);
  });

  it('rejects triggered-action specs that lose the arbitrary-automation boundary', async () => {
    const docs = await readDocs();
    const weakenedTriggeredActions = docs.triggeredActions.replace(
      'Triggered action chains must be narrower than arbitrary browser automation.',
      'Triggered action chains can run broader browser automation.'
    );

    assert.deepEqual(getProductSpecFailures({
      ...docs,
      triggeredActions: weakenedTriggeredActions
    }), [triggeredActionSpecFailure]);
  });

  it('rejects triggered-action specs that lose the current-page execution contract', async () => {
    const docs = await readDocs();
    const weakenedTriggeredActions = docs.triggeredActions.replace(
      'The first implementation should be current-page only.',
      'The first implementation can continue across pages when useful.'
    );

    assert.deepEqual(getProductSpecFailures({
      ...docs,
      triggeredActions: weakenedTriggeredActions
    }), [triggeredActionSpecFailure]);
  });

  it('rejects quick-add specs that blur creation shortcuts with action execution', async () => {
    const docs = await readDocs();
    const weakenedSelectedTextQuickAdd = docs.selectedTextQuickAdd.replace(
      'DaD Select is a creation shortcut. Triggered action chains are the execution model.',
      'DaD Select can own the complete action-chain execution model.'
    );

    assert.deepEqual(getProductSpecFailures({
      ...docs,
      selectedTextQuickAdd: weakenedSelectedTextQuickAdd
    }), [selectedTextQuickAddSpecFailure]);
  });

  it('rejects quick-add specs that lose the contextMenus permission boundary', async () => {
    const docs = await readDocs();
    const weakenedSelectedTextQuickAdd = docs.selectedTextQuickAdd.replace(
      'The first version should avoid adding a new permission if the popup path is enough.',
      'The first version may add a context menu whenever useful.'
    );

    assert.deepEqual(getProductSpecFailures({
      ...docs,
      selectedTextQuickAdd: weakenedSelectedTextQuickAdd
    }), [selectedTextQuickAddSpecFailure]);
  });

  it('rejects potential-functionality traces that lose the DaD Select raw wording', async () => {
    const docs = await readDocs();
    const weakenedPotentialFunctionality = docs.potentialFunctionality.replace(
      '- DaD select (right select) word, add with popup, estimate score, able to disable buttons + block images',
      '- DaD select shortcut'
    );

    assert.deepEqual(getProductSpecFailures({
      ...docs,
      potentialFunctionality: weakenedPotentialFunctionality
    }), [selectedTextQuickAddTraceFailure]);
  });
});
