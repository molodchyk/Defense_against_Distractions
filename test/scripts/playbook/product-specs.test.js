// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

import {
  getProductSpecFailures,
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
});
