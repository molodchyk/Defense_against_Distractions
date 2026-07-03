// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import vm from 'node:vm';

const PICKER_PREVIEW_PATH = 'src/js/content/ui-blocking/pickerPreview.js';

function loadPickerPreview() {
  const window = { DAD: { ElementBlocking: {} } };
  window.window = window;
  vm.createContext(window);
  vm.runInContext(readFileSync(PICKER_PREVIEW_PATH, 'utf8'), window);
  return window.DAD.ElementBlocking.pickerPreview;
}

describe('UI element picker preview semantics', () => {
  it('outlines bounded action scopes instead of hiding the whole target', () => {
    const preview = loadPickerPreview();

    assert.equal(preview.getEffectivePreviewMode('hideImages', 'hide'), 'outline');
    assert.equal(preview.getEffectivePreviewMode('disableControls', 'hide'), 'outline');
    assert.equal(preview.getEffectivePreviewMode('hide', 'hide'), 'hide');
  });

  it('labels scoped cleanup actions with action-specific preview verbs', () => {
    const preview = loadPickerPreview();

    assert.equal(preview.getPreviewVerbKey('hideImages', 'outline'), 'elementPickerPreviewHidingImagesVerb');
    assert.equal(preview.getPreviewVerbKey('disableControls', 'outline'), 'elementPickerPreviewDisablingControlsVerb');
    assert.equal(preview.getPreviewVerbKey('hide', 'outline'), 'elementPickerPreviewOutliningVerb');
  });
});
