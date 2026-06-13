// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getPopupPaneForKey,
  normalizePopupPane,
  normalizeStoredPopupPane,
  POPUP_PANE_STORAGE_KEY
} from '../../../src/js/popup/shell.js';

describe('popup shell helpers', () => {
  it('normalizes unknown popup panes to the primary control pane', () => {
    assert.equal(normalizePopupPane('actions'), 'actions');
    assert.equal(normalizePopupPane('diagnostics'), 'diagnostics');
    assert.equal(normalizePopupPane('unknown'), 'actions');
    assert.equal(normalizePopupPane(null), 'actions');
  });

  it('normalizes persisted popup panes from local storage', () => {
    assert.equal(POPUP_PANE_STORAGE_KEY, 'popupActivePane');
    assert.equal(normalizeStoredPopupPane('actions'), 'actions');
    assert.equal(normalizeStoredPopupPane('diagnostics'), 'diagnostics');
    assert.equal(normalizeStoredPopupPane('blocked'), 'actions');
    assert.equal(normalizeStoredPopupPane(undefined), 'actions');
  });

  it('maps tablist keyboard navigation to the next popup pane', () => {
    assert.equal(getPopupPaneForKey('actions', 'ArrowRight'), 'diagnostics');
    assert.equal(getPopupPaneForKey('diagnostics', 'ArrowRight'), 'actions');
    assert.equal(getPopupPaneForKey('actions', 'ArrowLeft'), 'diagnostics');
    assert.equal(getPopupPaneForKey('diagnostics', 'ArrowLeft'), 'actions');
    assert.equal(getPopupPaneForKey('diagnostics', 'Home'), 'actions');
    assert.equal(getPopupPaneForKey('actions', 'End'), 'diagnostics');
    assert.equal(getPopupPaneForKey('actions', 'Enter'), null);
  });
});
