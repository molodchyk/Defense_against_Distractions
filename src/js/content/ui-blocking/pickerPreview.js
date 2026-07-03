// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const elementBlocking = global.DAD.ElementBlocking = global.DAD.ElementBlocking || {};

  const OUTLINE_PREVIEW_ACTIONS = new Set(['click', 'clear', 'pauseMedia', 'hideImages', 'disableControls']);
  const ACTION_VERB_KEYS = {
    click: 'elementPickerPreviewClickingVerb',
    clear: 'elementPickerPreviewClearingVerb',
    pauseMedia: 'elementPickerPreviewPausingMediaVerb',
    hideImages: 'elementPickerPreviewHidingImagesVerb',
    disableControls: 'elementPickerPreviewDisablingControlsVerb'
  };

  function getEffectivePreviewMode(action, previewMode) {
    return OUTLINE_PREVIEW_ACTIONS.has(action) ? 'outline' : previewMode;
  }

  function getPreviewVerbKey(action, effectivePreviewMode) {
    return ACTION_VERB_KEYS[action] || (
      effectivePreviewMode === 'outline'
        ? 'elementPickerPreviewOutliningVerb'
        : 'elementPickerPreviewHidingVerb'
    );
  }

  elementBlocking.pickerPreview = {
    getEffectivePreviewMode,
    getPreviewVerbKey
  };
})(window);
