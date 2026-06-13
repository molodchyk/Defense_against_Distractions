// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};

  const panelStyle = global.DAD.PomodoroMiniPanelStyle || {};
  const panelLayout = global.DAD.PomodoroMiniPanelLayout || {};
  const panelRender = global.DAD.PomodoroMiniPanelRender || {};
  const panelTheme = global.DAD.PomodoroMiniPanelTheme || {};
  const PANEL_ID = panelStyle.PANEL_ID || 'dad-pomodoro-mini-panel';
  const REFRESH_MS = 1000;
  const RESIZE_DIRECTIONS = panelStyle.RESIZE_DIRECTIONS || ['nw', 'ne', 'sw', 'se'];
  const noop = () => {};
  const handleViewportResize = panelLayout.handleViewportResize || noop;
  const startDrag = panelLayout.startDrag || noop;
  const startResize = panelLayout.startResize || noop;

  let panelInterval = null;

  function isTopFrame() {
    try {
      return global.top === global.self;
    } catch (error) {
      return false;
    }
  }

  function getMessage(key, fallback, substitutions) {
    const uiMessage = global.DAD.UiLanguage?.getMessage?.(key, fallback, substitutions);
    if (uiMessage) {
      return uiMessage;
    }

    try {
      return global.chrome?.i18n?.getMessage?.(key, substitutions) || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function ensureStyle() {
    panelStyle.ensureStyle?.();
  }

  function applyPanelLanguage(panel) {
    global.DAD.UiLanguage?.applyDirection?.(panel);
  }

  function createPanel() {
    ensureStyle();
    panelTheme.install?.();

    const panel = document.createElement('aside');
    panel.id = PANEL_ID;
    panel.dataset.minimized = panelLayout.isMinimized?.() ? 'true' : 'false';
    panel.setAttribute('role', 'status');
    applyPanelLanguage(panel);

    const header = document.createElement('div');
    header.className = 'dad-mini-header';
    header.addEventListener('pointerdown', startDrag);

    const title = document.createElement('p');
    title.className = 'dad-mini-title';
    title.textContent = getMessage('pomodoroMiniPanelTitle', 'DaD Pomodoro');

    const actions = document.createElement('div');
    actions.className = 'dad-mini-actions';

    const minimizeButton = document.createElement('button');
    minimizeButton.type = 'button';
    minimizeButton.dataset.dadMiniMinimize = 'true';
    minimizeButton.textContent = panelLayout.isMinimized?.() ? '+' : '-';
    minimizeButton.title = panelLayout.isMinimized?.()
      ? getMessage('pomodoroMiniPanelExpandLabel', 'Expand')
      : getMessage('pomodoroMiniPanelMinimizeLabel', 'Minimize');
    minimizeButton.addEventListener('click', () => panelLayout.toggleMinimized?.(panel));

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.textContent = 'x';
    closeButton.title = getMessage('pomodoroMiniPanelCloseLabel', 'Close');
    closeButton.addEventListener('click', closePanel);

    actions.append(minimizeButton, closeButton);
    header.append(title, actions);

    const body = document.createElement('div');
    body.className = 'dad-mini-body';

    const timeRow = document.createElement('div');
    timeRow.className = 'dad-mini-time-row';
    const time = document.createElement('strong');
    time.className = 'dad-mini-time';
    time.dataset.dadMiniTime = 'true';
    time.textContent = '0:00';
    const phase = document.createElement('span');
    phase.className = 'dad-mini-phase';
    phase.dataset.dadMiniPhase = 'true';
    phase.textContent = getMessage('popupIdleLabel', 'Idle');
    timeRow.append(time, phase);

    const plan = document.createElement('div');
    plan.className = 'dad-mini-plan';
    plan.dataset.dadMiniPlan = 'true';
    plan.textContent = getMessage('popupNoActivePomodoroPlan', 'No active Pomodoro plan');

    const details = document.createElement('dl');
    details.dataset.dadMiniDetails = 'true';

    body.append(timeRow, plan, details);
    const resizeLabel = getMessage('pomodoroMiniPanelResizeLabel', 'Resize');
    const resizeHandles = RESIZE_DIRECTIONS.map(direction => {
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'dad-mini-resize-handle';
      resizeHandle.dataset.direction = direction;
      resizeHandle.title = resizeLabel;
      resizeHandle.setAttribute('role', 'separator');
      resizeHandle.setAttribute('aria-label', resizeLabel);
      resizeHandle.addEventListener('pointerdown', startResize);
      return resizeHandle;
    });

    panel.append(header, body, ...resizeHandles);
    panelLayout.apply?.(panel);
    panelTheme.apply?.(panel);
    return panel;
  }

  function renderPanel(payload) {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) {
      return;
    }

    panelRender.render?.(panel, payload);
  }

  function refreshPanel() {
    if (!document.getElementById(PANEL_ID)) {
      stopPanelRefresh();
      return;
    }

    global.DAD.safeRuntimeSendMessage({ action: 'getPomodoroState' }, payload => {
      if (payload) {
        renderPanel(payload);
      }
    });
  }

  function stopPanelRefresh() {
    if (panelInterval) {
      global.clearInterval(panelInterval);
      panelInterval = null;
    }
  }

  function showPanel() {
    if (!isTopFrame()) {
      return false;
    }

    panelLayout.load?.(() => {
      const loadedPanel = document.getElementById(PANEL_ID);
      if (loadedPanel) {
        panelLayout.apply?.(loadedPanel);
      }
    });

    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = createPanel();
      document.documentElement.appendChild(panel);
    }

    panelLayout.apply?.(panel);
    panelTheme.apply?.(panel);
    applyPanelLanguage(panel);
    refreshPanel();
    global.addEventListener('resize', handleViewportResize);

    if (!panelInterval) {
      panelInterval = global.setInterval(refreshPanel, REFRESH_MS);
    }

    return true;
  }

  function closePanel() {
    const panel = document.getElementById(PANEL_ID);
    if (panel) {
      panel.remove();
    }
    panelLayout.stopDrag?.();
    panelLayout.stopResize?.();
    stopPanelRefresh();
    global.removeEventListener('resize', handleViewportResize);
  }

  global.DAD.PomodoroMiniPanel = {
    close: closePanel,
    show: showPanel
  };

  global.DAD.UiLanguage?.onChange?.(() => {
    applyPanelLanguage(document.getElementById(PANEL_ID));
  });
})(window);
