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

  it('rejects triggered-action specs that reopen multi-page chains as a first-version question', async () => {
    const docs = await readDocs();
    const weakenedTriggeredActions = docs.triggeredActions.replace(
      'This resolves the first-version boundary: v1 is current-page only. Multi-page chains are a future product, not a hidden extension of this model. If they are ever reconsidered, they need a separate design, permission/privacy review, destructive-action safety model, and tests before they can be treated as part of DaD\'s bounded action-chain system.',
      'The first version may optionally support multi-page chains when useful.'
    ).replace(
      'Post-v1 only: if multi-page chains are ever considered, what separate permission/privacy/safety model would make them acceptable?',
      'Should multi-page chains be allowed, or should v1 be current-page only?'
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

  it('rejects quick-add specs that expose cleanup presets without picker scope', async () => {
    const docs = await readDocs();
    const weakenedSelectedTextQuickAdd = docs.selectedTextQuickAdd.replace(
      'Do not expose `Keyword + hide images` or `Keyword + disable controls` as selectable popup controls until the picker can attach a concrete action scope in the same flow.',
      'Expose `Keyword + hide images` and `Keyword + disable controls` as selectable popup controls whenever selected text exists.'
    ).replace(
      'Whole-page fallback is not an acceptable implicit scope for these presets.',
      'Whole-page fallback can be used as the implicit scope for these presets.'
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
