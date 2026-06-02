// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  global.DAD.ElementBlocking = global.DAD.ElementBlocking || {};

  global.DAD.ElementBlocking.constants = {
    PICKER_STYLE_ID: 'dad-element-picker-style',
    PICKER_PANEL_ID: 'dad-element-picker-panel',
    BLOCKED_ATTRIBUTE: 'data-dad-element-blocked',
    ORIGINAL_DISPLAY_ATTRIBUTE: 'data-dad-original-display',
    ORIGINAL_DISPLAY_PRIORITY_ATTRIBUTE: 'data-dad-original-display-priority',
    ORIGINAL_DISABLED_ATTRIBUTE: 'data-dad-original-disabled',
    ORIGINAL_ARIA_HIDDEN_ATTRIBUTE: 'data-dad-original-aria-hidden',
    PREVIEW_ATTRIBUTE: 'data-dad-element-block-preview',
    PREVIEW_DISPLAY_ATTRIBUTE: 'data-dad-preview-display',
    PREVIEW_DISPLAY_PRIORITY_ATTRIBUTE: 'data-dad-preview-display-priority',
    PREVIEW_DISABLED_ATTRIBUTE: 'data-dad-preview-disabled',
    PREVIEW_ARIA_HIDDEN_ATTRIBUTE: 'data-dad-preview-aria-hidden',
    PREVIEW_OUTLINE_ATTRIBUTE: 'data-dad-preview-outline',
    PREVIEW_OUTLINE_PRIORITY_ATTRIBUTE: 'data-dad-preview-outline-priority',
    PREVIEW_OUTLINE_OFFSET_ATTRIBUTE: 'data-dad-preview-outline-offset',
    PREVIEW_OUTLINE_OFFSET_PRIORITY_ATTRIBUTE: 'data-dad-preview-outline-offset-priority',
    PREVIEW_BOX_SHADOW_ATTRIBUTE: 'data-dad-preview-box-shadow',
    PREVIEW_BOX_SHADOW_PRIORITY_ATTRIBUTE: 'data-dad-preview-box-shadow-priority',
    PICKER_ATTRIBUTE: 'data-dad-element-picker-active',
    ELEMENT_RULE_VERSION: 1,
    ELEMENT_RULES_STORAGE_KEY: 'elementBlockRules',
    ELEMENT_RULE_IDS_STORAGE_KEY: 'elementBlockRuleIds',
    ELEMENT_RULE_ITEM_PREFIX: 'elementBlockRule.',
    DEFAULT_MIN_SCORE: 12,
    DEFAULT_ANCESTOR_DEPTH: 2,
    DEFAULT_PREVIEW_MODE: 'hide',
    DEFAULT_PICKER_ACTION_MODE: 'pick',
    DEFAULT_TARGET_LEVEL: 0,
    THEME_STORAGE_KEY: 'uiThemeMode',
    DEFAULT_THEME_MODE: 'system',
    SYNC_QUOTA_BYTES_FALLBACK: 102400,
    PROTECTED_SYNC_RESERVE_BYTES: 20480
  };
})(window);
