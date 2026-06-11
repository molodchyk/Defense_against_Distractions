// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const contentBlocking = global.DAD.ContentBlocking = global.DAD.ContentBlocking || {};
  const {
    BLOCK_OVERLAY_ID
  } = contentBlocking.constants;

  const STYLE_ID = 'dad-block-overlay-theme-style';

  function ensureThemeStyle() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${BLOCK_OVERLAY_ID} {
        --dad-block-bg: #101216;
        --dad-block-surface: #171b22;
        --dad-block-border: #323b4b;
        --dad-block-text: #ffffff;
        --dad-block-heading: #ff4444;
        --dad-block-muted: #c3cad6;
        --dad-block-diagnostics: #d7e0e7;
        --dad-block-accent: #3d8bfd;
        --dad-block-shadow: 0 18px 44px rgba(0, 0, 0, 0.28);
        color-scheme: dark;
      }

      #${BLOCK_OVERLAY_ID}[data-theme="light"] {
        --dad-block-bg: #f5f7fb;
        --dad-block-surface: #ffffff;
        --dad-block-border: #cfd6e2;
        --dad-block-text: #17202e;
        --dad-block-heading: #c73535;
        --dad-block-muted: #526173;
        --dad-block-diagnostics: #334155;
        --dad-block-accent: #2463d6;
        --dad-block-shadow: 0 18px 40px rgba(25, 37, 59, 0.12);
        color-scheme: light;
      }

      #${BLOCK_OVERLAY_ID} [data-dad-pomodoro] {
        margin-top: 18px;
        padding-top: 14px;
        border-top: 1px solid var(--dad-block-border);
        text-align: left;
      }

      #${BLOCK_OVERLAY_ID} [data-dad-pomodoro][hidden] {
        display: none;
      }

      #${BLOCK_OVERLAY_ID} [data-dad-pomodoro-title] {
        margin: 0 0 6px;
        color: var(--dad-block-text);
        font: 700 15px/1.35 Arial,sans-serif;
      }

      #${BLOCK_OVERLAY_ID} [data-dad-pomodoro-time] {
        display: inline-block;
        margin-right: 8px;
        color: var(--dad-block-accent);
        font: 700 22px/1 Arial,sans-serif;
      }

      #${BLOCK_OVERLAY_ID} [data-dad-pomodoro-message] {
        color: var(--dad-block-diagnostics);
        font: 14px/1.45 Arial,sans-serif;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function applyHostStyle(overlay) {
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:2147483647',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'padding:20px',
      'box-sizing:border-box',
      'background:var(--dad-block-bg)',
      'color:var(--dad-block-text)',
      'font:16px/1.5 Arial,sans-serif',
      'text-align:center',
      'pointer-events:auto'
    ].join(';');
    ensureThemeStyle();
    overlay.hidden = false;
  }

  contentBlocking.overlayStyle = {
    applyHostStyle,
    ensureThemeStyle
  };
})(window);
