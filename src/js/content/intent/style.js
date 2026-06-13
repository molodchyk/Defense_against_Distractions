// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const intent = global.DAD.IntentIntervention = global.DAD.IntentIntervention || {};
  const {
    PROMPT_ID,
    STYLE_ID,
    GRAYSCALE_ATTRIBUTE
  } = intent.constants;

  function installStyle() {
    if (global.document.getElementById(STYLE_ID)) {
      return;
    }

    const style = global.document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${PROMPT_ID} {
        --dad-intent-bg: #101216;
        --dad-intent-surface: #171b22;
        --dad-intent-border: #323b4b;
        --dad-intent-text: #eef2f7;
        --dad-intent-muted: #a8b0bf;
        --dad-intent-primary: #3d8bfd;
        --dad-intent-primary-hover: #2f74d3;
        --dad-intent-neutral: #596477;
        --dad-intent-warning: #d6a03d;
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 2147483646;
        box-sizing: border-box;
        width: min(420px, calc(100vw - 36px));
        overflow: hidden;
        border: 1px solid var(--dad-intent-border);
        border-radius: 8px;
        background: var(--dad-intent-surface);
        color: var(--dad-intent-text);
        box-shadow: 0 18px 44px rgba(0, 0, 0, 0.28);
        font: 14px/1.45 Arial, sans-serif;
        text-align: left;
        color-scheme: dark;
      }

      #${PROMPT_ID}[dir="rtl"] {
        right: auto;
        left: 18px;
        text-align: right;
      }

      html[${GRAYSCALE_ATTRIBUTE}="true"] body > *:not(#${PROMPT_ID}) {
        filter: grayscale(1) saturate(0.25) contrast(0.95) !important;
        transition: filter 160ms ease;
      }

      #${PROMPT_ID}[data-action="block"] {
        inset: 0;
        right: auto;
        bottom: auto;
        display: grid;
        place-items: center;
        width: auto;
        padding: 20px;
        border: 0;
        border-radius: 0;
        background: rgba(8, 10, 14, 0.78);
        box-shadow: none;
      }

      #${PROMPT_ID}[data-theme="light"] {
        --dad-intent-bg: #f5f7fb;
        --dad-intent-surface: #ffffff;
        --dad-intent-border: #cfd6e2;
        --dad-intent-text: #17202e;
        --dad-intent-muted: #526173;
        --dad-intent-primary: #2463d6;
        --dad-intent-primary-hover: #1e50aa;
        --dad-intent-neutral: #68758a;
        --dad-intent-warning: #9a6b12;
        color-scheme: light;
      }

      #${PROMPT_ID} * {
        box-sizing: border-box;
      }

      #${PROMPT_ID} [data-dad-intent-body] {
        display: grid;
        gap: 10px;
        padding: 14px;
      }

      #${PROMPT_ID}[data-action="block"] [data-dad-intent-body],
      #${PROMPT_ID}[data-action="block"] [data-dad-intent-actions] {
        width: min(520px, 100%);
        background: var(--dad-intent-surface);
      }

      #${PROMPT_ID}[data-action="block"] [data-dad-intent-body] {
        border: 1px solid var(--dad-intent-border);
        border-bottom: 0;
        border-radius: 8px 8px 0 0;
        padding: 18px;
      }

      #${PROMPT_ID}[data-action="block"] [data-dad-intent-actions] {
        border: 1px solid var(--dad-intent-border);
        border-top: 1px solid var(--dad-intent-border);
        border-radius: 0 0 8px 8px;
        padding: 12px 18px 18px;
      }

      #${PROMPT_ID} [data-dad-intent-title] {
        margin: 0;
        color: var(--dad-intent-text);
        font: 700 16px/1.3 Arial, sans-serif;
      }

      #${PROMPT_ID} [data-dad-intent-summary],
      #${PROMPT_ID} [data-dad-intent-meta] {
        margin: 0;
        color: var(--dad-intent-muted);
        font: 13px/1.45 Arial, sans-serif;
      }

      #${PROMPT_ID} [data-dad-intent-meta] strong {
        color: var(--dad-intent-text);
      }

      #${PROMPT_ID} [data-dad-intent-reasons] {
        display: grid;
        gap: 4px;
        margin: 0;
        padding: 0;
        list-style: none;
      }

      #${PROMPT_ID} [data-dad-intent-reasons] li {
        color: var(--dad-intent-muted);
        font: 12px/1.35 Arial, sans-serif;
      }

      #${PROMPT_ID} [data-dad-intent-reasons] li::before {
        content: "";
        display: inline-block;
        width: 6px;
        height: 6px;
        margin-right: 7px;
        border-radius: 999px;
        background: var(--dad-intent-warning);
        vertical-align: 1px;
      }

      #${PROMPT_ID}[dir="rtl"] [data-dad-intent-reasons] li::before {
        margin-right: 0;
        margin-left: 7px;
      }

      #${PROMPT_ID} [data-dad-intent-continue-reason] {
        display: grid;
        gap: 6px;
      }

      #${PROMPT_ID} [data-dad-intent-continue-reason] label {
        color: var(--dad-intent-text);
        font: 700 12px/1.2 Arial, sans-serif;
      }

      #${PROMPT_ID} [data-dad-intent-continue-reason] textarea {
        width: 100%;
        min-height: 56px;
        max-height: 110px;
        resize: vertical;
        border: 1px solid var(--dad-intent-border);
        border-radius: 6px;
        background: var(--dad-intent-bg);
        color: var(--dad-intent-text);
        font: 13px/1.4 Arial, sans-serif;
        padding: 8px;
      }

      #${PROMPT_ID} [data-dad-intent-continue-reason] textarea::placeholder {
        color: var(--dad-intent-muted);
      }

      #${PROMPT_ID} [data-dad-intent-continue-reason-count] {
        justify-self: end;
        color: var(--dad-intent-muted);
        font: 11px/1.2 Arial, sans-serif;
      }

      #${PROMPT_ID} [data-dad-intent-actions] {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 8px;
        padding: 10px 14px 14px;
        border-top: 1px solid var(--dad-intent-border);
      }

      #${PROMPT_ID} button {
        min-height: 34px;
        border: 1px solid transparent;
        border-radius: 6px;
        background: var(--dad-intent-neutral);
        color: #ffffff;
        cursor: pointer;
        font: 700 13px/1 Arial, sans-serif;
        padding: 8px 11px;
      }

      #${PROMPT_ID} button:disabled {
        cursor: not-allowed;
        opacity: 0.58;
      }

      #${PROMPT_ID} button[data-dad-intent-primary] {
        background: var(--dad-intent-primary);
      }

      #${PROMPT_ID} button[data-dad-intent-primary]:hover {
        background: var(--dad-intent-primary-hover);
      }
    `;
    global.document.documentElement.appendChild(style);
  }

  intent.style = {
    installStyle
  };
})(window);
