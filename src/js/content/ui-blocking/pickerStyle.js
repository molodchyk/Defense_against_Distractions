// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const elementBlocking = global.DAD.ElementBlocking = global.DAD.ElementBlocking || {};
  const {
    PICKER_STYLE_ID,
    PICKER_PANEL_ID,
    PICKER_ATTRIBUTE
  } = elementBlocking.constants;

  function ensurePickerStyle() {
    if (document.getElementById(PICKER_STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = PICKER_STYLE_ID;
    style.textContent = `
      #${PICKER_PANEL_ID} {
        --dad-picker-bg: #111318;
        --dad-picker-surface: #1a1e26;
        --dad-picker-field: #151922;
        --dad-picker-border: #343b49;
        --dad-picker-text: #eef2f7;
        --dad-picker-muted: #a8b0bf;
        --dad-picker-primary: #3d8bfd;
        --dad-picker-neutral: #343b49;
        --dad-picker-disabled: #596477;
        color-scheme: dark;
      }

      #${PICKER_PANEL_ID}[data-theme="light"] {
        --dad-picker-bg: #ffffff;
        --dad-picker-surface: #f5f7fb;
        --dad-picker-field: #ffffff;
        --dad-picker-border: #cfd6e2;
        --dad-picker-text: #17202e;
        --dad-picker-muted: #526173;
        --dad-picker-primary: #2463d6;
        --dad-picker-neutral: #68758a;
        --dad-picker-disabled: #d8dee8;
        color-scheme: light;
      }

      [${PICKER_ATTRIBUTE}="true"] {
        outline: 3px solid #3d8bfd !important;
        outline-offset: 3px !important;
        cursor: crosshair !important;
      }

      #${PICKER_PANEL_ID} {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 2147483647;
        width: min(420px, calc(100vw - 32px));
        border-radius: 8px;
        background: var(--dad-picker-bg);
        color: var(--dad-picker-text);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28);
        font: 14px/1.4 Arial, sans-serif;
        overflow: hidden;
      }

      #${PICKER_PANEL_ID} label {
        display: grid;
        gap: 4px;
        color: var(--dad-picker-muted);
        font: 700 12px/1.3 Arial, sans-serif;
      }

      #${PICKER_PANEL_ID} select,
      #${PICKER_PANEL_ID} input {
        appearance: auto !important;
        min-height: 32px;
        width: 100%;
        border: 1px solid var(--dad-picker-border);
        border-radius: 6px;
        background: var(--dad-picker-field);
        color: var(--dad-picker-text);
        padding: 6px 8px;
        font: 13px/1.3 Arial, sans-serif;
      }

      #${PICKER_PANEL_ID} input[type="number"]::-webkit-inner-spin-button,
      #${PICKER_PANEL_ID} input[type="number"]::-webkit-outer-spin-button {
        -webkit-appearance: auto !important;
        appearance: auto !important;
        background: transparent !important;
      }

      #${PICKER_PANEL_ID} button {
        min-height: 32px;
        border: 1px solid transparent;
        border-radius: 6px;
        padding: 6px 10px;
        background: var(--dad-picker-primary);
        color: #ffffff;
        cursor: pointer;
        font: 700 13px/1.2 Arial, sans-serif;
      }

      #${PICKER_PANEL_ID} button[data-dad-secondary="true"] {
        background: var(--dad-picker-neutral);
      }

      #${PICKER_PANEL_ID} button:disabled {
        background: var(--dad-picker-disabled);
        color: var(--dad-picker-muted);
        cursor: not-allowed;
      }

      #${PICKER_PANEL_ID} .dad-picker-wheel-toggle {
        min-height: 32px;
        width: 100%;
        border: 1px solid var(--dad-picker-border);
        border-radius: 6px;
        background: var(--dad-picker-field);
        color: var(--dad-picker-text);
        cursor: ns-resize;
        padding: 6px 8px;
        font: 13px/1.3 Arial, sans-serif;
      }

      #${PICKER_PANEL_ID} .dad-picker-wheel-toggle:focus-visible {
        outline: 2px solid var(--dad-picker-primary);
        outline-offset: 2px;
      }
    `;
    document.documentElement.appendChild(style);
  }

  elementBlocking.pickerStyle = {
    ensurePickerStyle
  };
})(window);
