// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildKeywordSuggestionCandidates,
  formatKeywordSuggestionEditorText
} from '../../../src/js/popup/pageSignalsPanel.js';

describe('popup page signals panel helpers', () => {
  it('builds bounded keyword ideas from current-page tokens without raw text', () => {
    const candidates = buildKeywordSuggestionCandidates({
      text: {
        selectedTextTokens: ['Sildenafil', 'mechanism'],
        clickedLinkTokens: ['PDE5', 'trial'],
        headingTokens: ['inhibitor', 'pde5'],
        descriptionTokens: ['therapy', 'mechanism'],
        topTokens: ['news', 'video', 'bad token!', 'go']
      }
    }, { limit: 5 });

    assert.deepEqual(candidates, [
      { token: 'sildenafil', score: 50, sources: ['selected'] },
      { token: 'mechanism', score: 50, sources: ['selected', 'description'] },
      { token: 'pde5', score: 45, sources: ['clicked', 'heading'] },
      { token: 'trial', score: 45, sources: ['clicked'] },
      { token: 'inhibitor', score: 40, sources: ['heading'] }
    ]);
  });

  it('formats keyword ideas for direct paste into the keyword editor', () => {
    assert.equal(formatKeywordSuggestionEditorText([
      { token: 'sildenafil', score: 50 },
      { token: 'pde5', score: 45 }
    ]), 'sildenafil, 50/100\npde5, 45/100');
  });
});
