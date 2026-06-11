// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};

  const fallbackConstants = {
    PANEL_ID: 'dad-pomodoro-mini-panel',
    STYLE_ID: 'dad-pomodoro-mini-panel-style',
    PANEL_MARGIN: 8,
    DEFAULT_PANEL_WIDTH: 300,
    MIN_PANEL_WIDTH: 220,
    MIN_PANEL_HEIGHT: 132,
    COMPACT_PANEL_WIDTH: 260,
    SHORT_PANEL_HEIGHT: 210,
    RESIZE_DIRECTIONS: ['nw', 'ne', 'sw', 'se']
  };
  const constants = {
    ...fallbackConstants,
    ...(global.DAD.PomodoroMiniPanelStyleConstants || {})
  };
  const styleCss = global.DAD.PomodoroMiniPanelStyleCss || {};

  function buildFallbackCss() {
    return `
      #${constants.PANEL_ID} {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 2147483646;
        width: min(${constants.DEFAULT_PANEL_WIDTH}px, calc(100vw - 32px));
        min-width: ${constants.MIN_PANEL_WIDTH}px;
        border: 1px solid #344154;
        border-radius: 8px;
        background: #11161f;
        color: #f7fbff;
        font: 13px/1.4 Arial, sans-serif;
      }
    `;
  }

  function ensureStyle() {
    if (document.getElementById(constants.STYLE_ID)) {
      return;
    }

    const buildCss = typeof styleCss.buildMiniPanelCss === 'function'
      ? styleCss.buildMiniPanelCss
      : buildFallbackCss;
    const style = document.createElement('style');
    style.id = constants.STYLE_ID;
    style.textContent = buildCss(constants);
    document.documentElement.appendChild(style);
  }

  global.DAD.PomodoroMiniPanelStyle = {
    ...constants,
    ensureStyle
  };
})(window);
