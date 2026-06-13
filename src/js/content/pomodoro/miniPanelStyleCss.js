// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};

  const fallbackConstants = { PANEL_ID: 'dad-pomodoro-mini-panel', DEFAULT_PANEL_WIDTH: 300, MIN_PANEL_WIDTH: 220 };

  function buildMiniPanelCss(styleConstants = {}) {
    const constants = {
      ...fallbackConstants,
      ...styleConstants
    };

    return `
      #${constants.PANEL_ID} {
        --dad-panel-bg: #11161f;
        --dad-panel-surface: #151c27;
        --dad-panel-border: #344154;
        --dad-panel-text: #f7fbff;
        --dad-panel-muted: #b9c3d2;
        --dad-panel-primary: #3d8bfd;
        --dad-panel-success: #2ea66d;
        --dad-panel-danger: #dc3f45;
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 2147483646;
        display: flex;
        flex-direction: column;
        width: min(${constants.DEFAULT_PANEL_WIDTH}px, calc(100vw - 32px));
        max-width: calc(100vw - 16px);
        max-height: calc(100vh - 16px);
        min-width: ${constants.MIN_PANEL_WIDTH}px;
        min-height: 0;
        overflow: hidden;
        border: 1px solid var(--dad-panel-border);
        border-radius: 8px;
        background: var(--dad-panel-bg);
        box-shadow: 0 16px 44px rgba(0, 0, 0, 0.34);
        color: var(--dad-panel-text);
        font: 13px/1.4 Arial, sans-serif;
        text-align: left;
        color-scheme: dark;
      }

      #${constants.PANEL_ID}[dir="rtl"] { right: auto; left: 16px; text-align: right; }

      #${constants.PANEL_ID}[data-theme="light"] {
        --dad-panel-bg: #ffffff;
        --dad-panel-surface: #f3f6fb;
        --dad-panel-border: #c9d2df;
        --dad-panel-text: #142033;
        --dad-panel-muted: #526174;
        --dad-panel-primary: #2463d6;
        --dad-panel-success: #23875a;
        --dad-panel-danger: #c73535;
        box-shadow: 0 16px 40px rgba(28, 40, 60, 0.16);
        color-scheme: light;
      }

      #${constants.PANEL_ID} * {
        box-sizing: border-box;
      }

      #${constants.PANEL_ID} button {
        border: 1px solid var(--dad-panel-border);
        border-radius: 6px;
        background: var(--dad-panel-surface);
        color: var(--dad-panel-text);
        font: 700 12px/1 Arial, sans-serif;
        min-height: 28px;
        padding: 5px 8px;
        cursor: pointer;
      }

      #${constants.PANEL_ID} button:hover {
        border-color: var(--dad-panel-primary);
      }

      #${constants.PANEL_ID} .dad-mini-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 10px 12px;
        border-bottom: 1px solid var(--dad-panel-border);
        cursor: move;
        user-select: none;
      }

      #${constants.PANEL_ID} .dad-mini-title {
        min-width: 0;
        margin: 0;
        overflow: hidden;
        font: 700 14px/1.25 Arial, sans-serif;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #${constants.PANEL_ID} .dad-mini-actions {
        display: flex;
        gap: 6px;
        cursor: default;
      }

      #${constants.PANEL_ID} .dad-mini-body {
        display: grid;
        min-height: 0;
        gap: 8px;
        overflow: auto;
        overscroll-behavior: contain;
        padding: 10px 12px 12px;
        scrollbar-color: var(--dad-panel-border) transparent;
        scrollbar-width: thin;
      }

      #${constants.PANEL_ID}[data-minimized="true"] .dad-mini-body {
        display: none;
      }

      #${constants.PANEL_ID}[data-minimized="true"] {
        min-width: 0;
        min-height: 0;
        width: max-content;
        height: auto !important;
        max-width: min(190px, calc(100vw - 32px));
      }

      #${constants.PANEL_ID}[data-minimized="true"] .dad-mini-header {
        gap: 7px;
        border-bottom: 0;
        padding: 7px 8px 7px 10px;
      }

      #${constants.PANEL_ID}[data-minimized="true"] .dad-mini-title {
        max-width: 110px;
        font-size: 13px;
      }

      #${constants.PANEL_ID}[data-minimized="true"] .dad-mini-actions {
        gap: 4px;
      }

      #${constants.PANEL_ID}[data-minimized="true"] button {
        min-width: 26px;
        min-height: 24px;
        padding: 3px 7px;
      }

      #${constants.PANEL_ID} .dad-mini-resize-handle {
        position: absolute;
        width: 18px;
        height: 18px;
        border: 0;
        background: transparent;
        opacity: 0.72;
        touch-action: none;
      }

      #${constants.PANEL_ID} .dad-mini-resize-handle:hover {
        opacity: 1;
      }

      #${constants.PANEL_ID} .dad-mini-resize-handle::after {
        content: "";
        position: absolute;
        inset: 4px;
        opacity: 0;
        transition: opacity 120ms ease;
      }

      #${constants.PANEL_ID}:hover .dad-mini-resize-handle::after,
      #${constants.PANEL_ID}[data-resizing="true"] .dad-mini-resize-handle::after {
        opacity: 0.82;
      }

      #${constants.PANEL_ID} .dad-mini-resize-handle[data-direction="se"] {
        right: 0;
        bottom: 0;
        cursor: nwse-resize;
      }

      #${constants.PANEL_ID} .dad-mini-resize-handle[data-direction="sw"] {
        left: 0;
        bottom: 0;
        cursor: nesw-resize;
      }

      #${constants.PANEL_ID} .dad-mini-resize-handle[data-direction="ne"] {
        right: 0;
        top: 0;
        cursor: nesw-resize;
      }

      #${constants.PANEL_ID} .dad-mini-resize-handle[data-direction="nw"] {
        left: 0;
        top: 0;
        cursor: nwse-resize;
      }

      #${constants.PANEL_ID} .dad-mini-resize-handle[data-direction="se"]::after {
        border-right: 2px solid var(--dad-panel-muted);
        border-bottom: 2px solid var(--dad-panel-muted);
      }

      #${constants.PANEL_ID} .dad-mini-resize-handle[data-direction="sw"]::after {
        border-left: 2px solid var(--dad-panel-muted);
        border-bottom: 2px solid var(--dad-panel-muted);
      }

      #${constants.PANEL_ID} .dad-mini-resize-handle[data-direction="ne"]::after {
        border-right: 2px solid var(--dad-panel-muted);
        border-top: 2px solid var(--dad-panel-muted);
      }

      #${constants.PANEL_ID} .dad-mini-resize-handle[data-direction="nw"]::after {
        border-left: 2px solid var(--dad-panel-muted);
        border-top: 2px solid var(--dad-panel-muted);
      }

      #${constants.PANEL_ID}[data-minimized="true"] .dad-mini-resize-handle {
        display: none;
      }

      #${constants.PANEL_ID}[data-size="compact"] .dad-mini-time-row {
        align-items: flex-start;
        flex-direction: column;
      }

      #${constants.PANEL_ID}[data-size="compact"] .dad-mini-phase {
        max-width: 100%;
      }

      #${constants.PANEL_ID}[data-size="compact"] dl div {
        grid-template-columns: minmax(0, 1fr);
        gap: 1px;
      }

      #${constants.PANEL_ID}[data-size="compact"] dd {
        text-align: left;
      }

      #${constants.PANEL_ID}[dir="rtl"][data-size="compact"] dd { text-align: right; }

      #${constants.PANEL_ID}[data-height="short"] .dad-mini-header {
        padding: 7px 9px;
      }

      #${constants.PANEL_ID}[data-height="short"] .dad-mini-body {
        gap: 6px;
        padding: 8px 10px 10px;
      }

      #${constants.PANEL_ID}[data-height="short"] .dad-mini-time {
        font-size: 22px;
      }

      #${constants.PANEL_ID}[data-height="short"] dl {
        padding-top: 6px;
      }

      #${constants.PANEL_ID} .dad-mini-time-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      #${constants.PANEL_ID} .dad-mini-time {
        color: var(--dad-panel-primary);
        font: 700 28px/1 Arial, sans-serif;
      }

      #${constants.PANEL_ID} .dad-mini-phase {
        max-width: 130px;
        overflow: hidden;
        border: 1px solid var(--dad-panel-border);
        border-radius: 999px;
        color: var(--dad-panel-muted);
        font: 700 11px/1.2 Arial, sans-serif;
        padding: 3px 7px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #${constants.PANEL_ID} .dad-mini-phase[data-phase="work"] {
        border-color: var(--dad-panel-primary);
        color: var(--dad-panel-primary);
      }

      #${constants.PANEL_ID} .dad-mini-phase[data-phase="shortBreak"],
      #${constants.PANEL_ID} .dad-mini-phase[data-phase="longBreak"],
      #${constants.PANEL_ID} .dad-mini-phase[data-phase="completed"] {
        border-color: var(--dad-panel-success);
        color: var(--dad-panel-success);
      }

      #${constants.PANEL_ID} .dad-mini-plan {
        min-width: 0;
        overflow: hidden;
        color: var(--dad-panel-muted);
        font-size: 12px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #${constants.PANEL_ID} dl {
        display: grid;
        gap: 4px;
        margin: 0;
        border-top: 1px solid var(--dad-panel-border);
        padding-top: 8px;
      }

      #${constants.PANEL_ID} dl div {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 8px;
      }

      #${constants.PANEL_ID} dt,
      #${constants.PANEL_ID} dd {
        min-width: 0;
        margin: 0;
        overflow: hidden;
        font-size: 12px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #${constants.PANEL_ID} dt {
        color: var(--dad-panel-muted);
        font-weight: 700;
      }

      #${constants.PANEL_ID} dd {
        text-align: right;
      }

      #${constants.PANEL_ID}[dir="rtl"] dd { text-align: left; }
    `;
  }

  global.DAD.PomodoroMiniPanelStyleCss = {
    buildMiniPanelCss
  };
})(window);
