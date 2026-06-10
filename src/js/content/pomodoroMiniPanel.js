// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};

  const PANEL_ID = 'dad-pomodoro-mini-panel';
  const STYLE_ID = 'dad-pomodoro-mini-panel-style';
  const THEME_STORAGE_KEY = 'uiThemeMode';
  const DEFAULT_THEME_MODE = 'system';
  const THEME_QUERY = '(prefers-color-scheme: dark)';
  const REFRESH_MS = 1000;
  const BREAK_PHASES = new Set(['shortBreak', 'longBreak']);
  const PANEL_MARGIN = 8;
  const DEFAULT_PANEL_WIDTH = 300;
  const MIN_PANEL_WIDTH = 220;
  const MIN_PANEL_HEIGHT = 132;
  const COMPACT_PANEL_WIDTH = 260;
  const SHORT_PANEL_HEIGHT = 210;
  const RESIZE_DIRECTIONS = ['nw', 'ne', 'sw', 'se'];

  let panelThemeMode = DEFAULT_THEME_MODE;
  let panelInterval = null;
  let themeListenersInstalled = false;
  let panelStateLoaded = false;
  let minimized = false;
  let panelPosition = null;
  let panelSize = null;
  let dragState = null;
  let resizeState = null;

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

  function normalizeThemeMode(mode) {
    return ['system', 'dark', 'light'].includes(mode) ? mode : DEFAULT_THEME_MODE;
  }

  function resolveThemeMode(mode) {
    const normalizedMode = normalizeThemeMode(mode);
    if (normalizedMode === 'system') {
      return global.matchMedia(THEME_QUERY).matches ? 'dark' : 'light';
    }

    return normalizedMode;
  }

  function formatDuration(milliseconds) {
    const totalSeconds = Math.max(0, Math.floor(Number(milliseconds || 0) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
  }

  function formatClock(value) {
    const date = new Date(value || '');
    if (!Number.isFinite(date.getTime())) {
      return '--';
    }

    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getBreakDurationMs(phase, settings = {}, completedWorkSessions = 0) {
    const shortBreakMinutes = Number(settings.shortBreakMinutes || 0);
    const longBreakMinutes = Number(settings.longBreakMinutes || 0);
    const sessionsBeforeLongBreak = Math.max(1, Number(settings.sessionsBeforeLongBreak || 1));

    if (phase === 'longBreak') {
      return longBreakMinutes * 60 * 1000;
    }

    if (phase === 'shortBreak') {
      return shortBreakMinutes * 60 * 1000;
    }

    const nextCompletedCount = completedWorkSessions + 1;
    return nextCompletedCount % sessionsBeforeLongBreak === 0
      ? longBreakMinutes * 60 * 1000
      : shortBreakMinutes * 60 * 1000;
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID} {
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
        width: min(${DEFAULT_PANEL_WIDTH}px, calc(100vw - 32px));
        max-width: calc(100vw - 16px);
        max-height: calc(100vh - 16px);
        min-width: ${MIN_PANEL_WIDTH}px;
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

      #${PANEL_ID}[data-theme="light"] {
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

      #${PANEL_ID} * {
        box-sizing: border-box;
      }

      #${PANEL_ID} button {
        border: 1px solid var(--dad-panel-border);
        border-radius: 6px;
        background: var(--dad-panel-surface);
        color: var(--dad-panel-text);
        font: 700 12px/1 Arial, sans-serif;
        min-height: 28px;
        padding: 5px 8px;
        cursor: pointer;
      }

      #${PANEL_ID} button:hover {
        border-color: var(--dad-panel-primary);
      }

      #${PANEL_ID} .dad-mini-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 10px 12px;
        border-bottom: 1px solid var(--dad-panel-border);
        cursor: move;
        user-select: none;
      }

      #${PANEL_ID} .dad-mini-title {
        min-width: 0;
        margin: 0;
        overflow: hidden;
        font: 700 14px/1.25 Arial, sans-serif;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #${PANEL_ID} .dad-mini-actions {
        display: flex;
        gap: 6px;
        cursor: default;
      }

      #${PANEL_ID} .dad-mini-body {
        display: grid;
        min-height: 0;
        gap: 8px;
        overflow: auto;
        overscroll-behavior: contain;
        padding: 10px 12px 12px;
        scrollbar-color: var(--dad-panel-border) transparent;
        scrollbar-width: thin;
      }

      #${PANEL_ID}[data-minimized="true"] .dad-mini-body {
        display: none;
      }

      #${PANEL_ID}[data-minimized="true"] {
        min-width: 0;
        min-height: 0;
        width: max-content;
        height: auto !important;
        max-width: min(190px, calc(100vw - 32px));
      }

      #${PANEL_ID}[data-minimized="true"] .dad-mini-header {
        gap: 7px;
        border-bottom: 0;
        padding: 7px 8px 7px 10px;
      }

      #${PANEL_ID}[data-minimized="true"] .dad-mini-title {
        max-width: 110px;
        font-size: 13px;
      }

      #${PANEL_ID}[data-minimized="true"] .dad-mini-actions {
        gap: 4px;
      }

      #${PANEL_ID}[data-minimized="true"] button {
        min-width: 26px;
        min-height: 24px;
        padding: 3px 7px;
      }

      #${PANEL_ID} .dad-mini-resize-handle {
        position: absolute;
        width: 18px;
        height: 18px;
        border: 0;
        background: transparent;
        opacity: 0.72;
        touch-action: none;
      }

      #${PANEL_ID} .dad-mini-resize-handle:hover {
        opacity: 1;
      }

      #${PANEL_ID} .dad-mini-resize-handle::after {
        content: "";
        position: absolute;
        inset: 4px;
        opacity: 0;
        transition: opacity 120ms ease;
      }

      #${PANEL_ID}:hover .dad-mini-resize-handle::after,
      #${PANEL_ID}[data-resizing="true"] .dad-mini-resize-handle::after {
        opacity: 0.82;
      }

      #${PANEL_ID} .dad-mini-resize-handle[data-direction="se"] {
        right: 0;
        bottom: 0;
        cursor: nwse-resize;
      }

      #${PANEL_ID} .dad-mini-resize-handle[data-direction="sw"] {
        left: 0;
        bottom: 0;
        cursor: nesw-resize;
      }

      #${PANEL_ID} .dad-mini-resize-handle[data-direction="ne"] {
        right: 0;
        top: 0;
        cursor: nesw-resize;
      }

      #${PANEL_ID} .dad-mini-resize-handle[data-direction="nw"] {
        left: 0;
        top: 0;
        cursor: nwse-resize;
      }

      #${PANEL_ID} .dad-mini-resize-handle[data-direction="se"]::after {
        border-right: 2px solid var(--dad-panel-muted);
        border-bottom: 2px solid var(--dad-panel-muted);
      }

      #${PANEL_ID} .dad-mini-resize-handle[data-direction="sw"]::after {
        border-left: 2px solid var(--dad-panel-muted);
        border-bottom: 2px solid var(--dad-panel-muted);
      }

      #${PANEL_ID} .dad-mini-resize-handle[data-direction="ne"]::after {
        border-right: 2px solid var(--dad-panel-muted);
        border-top: 2px solid var(--dad-panel-muted);
      }

      #${PANEL_ID} .dad-mini-resize-handle[data-direction="nw"]::after {
        border-left: 2px solid var(--dad-panel-muted);
        border-top: 2px solid var(--dad-panel-muted);
      }

      #${PANEL_ID}[data-minimized="true"] .dad-mini-resize-handle {
        display: none;
      }

      #${PANEL_ID}[data-size="compact"] .dad-mini-time-row {
        align-items: flex-start;
        flex-direction: column;
      }

      #${PANEL_ID}[data-size="compact"] .dad-mini-phase {
        max-width: 100%;
      }

      #${PANEL_ID}[data-size="compact"] dl div {
        grid-template-columns: minmax(0, 1fr);
        gap: 1px;
      }

      #${PANEL_ID}[data-size="compact"] dd {
        text-align: left;
      }

      #${PANEL_ID}[data-height="short"] .dad-mini-header {
        padding: 7px 9px;
      }

      #${PANEL_ID}[data-height="short"] .dad-mini-body {
        gap: 6px;
        padding: 8px 10px 10px;
      }

      #${PANEL_ID}[data-height="short"] .dad-mini-time {
        font-size: 22px;
      }

      #${PANEL_ID}[data-height="short"] dl {
        padding-top: 6px;
      }

      #${PANEL_ID} .dad-mini-time-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      #${PANEL_ID} .dad-mini-time {
        color: var(--dad-panel-primary);
        font: 700 28px/1 Arial, sans-serif;
      }

      #${PANEL_ID} .dad-mini-phase {
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

      #${PANEL_ID} .dad-mini-phase[data-phase="work"] {
        border-color: var(--dad-panel-primary);
        color: var(--dad-panel-primary);
      }

      #${PANEL_ID} .dad-mini-phase[data-phase="shortBreak"],
      #${PANEL_ID} .dad-mini-phase[data-phase="longBreak"],
      #${PANEL_ID} .dad-mini-phase[data-phase="completed"] {
        border-color: var(--dad-panel-success);
        color: var(--dad-panel-success);
      }

      #${PANEL_ID} .dad-mini-plan {
        min-width: 0;
        overflow: hidden;
        color: var(--dad-panel-muted);
        font-size: 12px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #${PANEL_ID} dl {
        display: grid;
        gap: 4px;
        margin: 0;
        border-top: 1px solid var(--dad-panel-border);
        padding-top: 8px;
      }

      #${PANEL_ID} dl div {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 8px;
      }

      #${PANEL_ID} dt,
      #${PANEL_ID} dd {
        min-width: 0;
        margin: 0;
        overflow: hidden;
        font-size: 12px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #${PANEL_ID} dt {
        color: var(--dad-panel-muted);
        font-weight: 700;
      }

      #${PANEL_ID} dd {
        text-align: right;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function applyTheme() {
    const panel = document.getElementById(PANEL_ID);
    if (panel) {
      panel.dataset.theme = resolveThemeMode(panelThemeMode);
      panel.dataset.themeMode = normalizeThemeMode(panelThemeMode);
    }
  }

  function installThemeSync() {
    if (themeListenersInstalled) {
      return;
    }

    global.DAD.safeSyncStorageGet({ [THEME_STORAGE_KEY]: DEFAULT_THEME_MODE }, result => {
      if (!result) {
        return;
      }

      panelThemeMode = normalizeThemeMode(result[THEME_STORAGE_KEY]);
      applyTheme();
    });

    global.DAD.safeStorageOnChangedAddListener((changes, areaName) => {
      if (areaName !== 'sync' || !changes[THEME_STORAGE_KEY]) {
        return;
      }

      panelThemeMode = normalizeThemeMode(changes[THEME_STORAGE_KEY].newValue);
      applyTheme();
    });

    global.matchMedia(THEME_QUERY).addEventListener('change', () => {
      if (panelThemeMode === DEFAULT_THEME_MODE) {
        applyTheme();
      }
    });

    themeListenersInstalled = true;
  }

  function createRow(label, value) {
    const row = document.createElement('div');
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label;
    description.textContent = value || '--';
    row.append(term, description);
    return row;
  }

  function loadPanelUiState(callback = null) {
    if (panelStateLoaded) {
      if (callback) callback();
      return;
    }

    if (!global.DAD.PomodoroMiniPanelState) {
      panelStateLoaded = true;
      if (callback) callback();
      return;
    }

    global.DAD.PomodoroMiniPanelState.load(storedState => {
      minimized = storedState.minimized;
      panelSize = storedState.size;
      panelPosition = storedState.position;
      panelStateLoaded = true;
      if (callback) callback();
    }, clampPanelSize);
  }

  function savePanelUiState() {
    global.DAD.PomodoroMiniPanelState?.save({
      minimized,
      size: panelSize,
      position: panelPosition
    });
  }

  function clampPanelPosition(left, top, panel) {
    const rect = panel.getBoundingClientRect();
    const maxLeft = Math.max(PANEL_MARGIN, global.innerWidth - rect.width - PANEL_MARGIN);
    const maxTop = Math.max(PANEL_MARGIN, global.innerHeight - rect.height - PANEL_MARGIN);

    return {
      left: Math.min(Math.max(Math.round(left), PANEL_MARGIN), maxLeft),
      top: Math.min(Math.max(Math.round(top), PANEL_MARGIN), maxTop)
    };
  }

  function clampPanelSize(width, height) {
    const maxWidth = Math.max(MIN_PANEL_WIDTH, global.innerWidth - (PANEL_MARGIN * 2));
    const maxHeight = Math.max(MIN_PANEL_HEIGHT, global.innerHeight - (PANEL_MARGIN * 2));

    return {
      width: Math.min(Math.max(Math.round(width), MIN_PANEL_WIDTH), maxWidth),
      height: Math.min(Math.max(Math.round(height), MIN_PANEL_HEIGHT), maxHeight)
    };
  }

  function clampPanelRect(rect, direction) {
    const viewportRight = Math.max(PANEL_MARGIN + MIN_PANEL_WIDTH, global.innerWidth - PANEL_MARGIN);
    const viewportBottom = Math.max(PANEL_MARGIN + MIN_PANEL_HEIGHT, global.innerHeight - PANEL_MARGIN);
    let left = Math.round(rect.left);
    let top = Math.round(rect.top);
    let right = Math.round(rect.right);
    let bottom = Math.round(rect.bottom);

    if (direction.includes('w')) {
      left = Math.max(PANEL_MARGIN, Math.min(left, right - MIN_PANEL_WIDTH));
    } else if (direction.includes('e')) {
      right = Math.min(viewportRight, Math.max(right, left + MIN_PANEL_WIDTH));
    }

    if (direction.includes('n')) {
      top = Math.max(PANEL_MARGIN, Math.min(top, bottom - MIN_PANEL_HEIGHT));
    } else if (direction.includes('s')) {
      bottom = Math.min(viewportBottom, Math.max(bottom, top + MIN_PANEL_HEIGHT));
    }

    return {
      left,
      top,
      width: Math.max(MIN_PANEL_WIDTH, right - left),
      height: Math.max(MIN_PANEL_HEIGHT, bottom - top)
    };
  }

  function syncPanelResponsiveState(panel) {
    const currentWidth = panelSize?.width || panel.getBoundingClientRect().width || DEFAULT_PANEL_WIDTH;
    const currentHeight = panelSize?.height || panel.getBoundingClientRect().height || MIN_PANEL_HEIGHT;
    panel.dataset.size = !minimized && currentWidth < COMPACT_PANEL_WIDTH ? 'compact' : 'regular';
    panel.dataset.height = !minimized && currentHeight < SHORT_PANEL_HEIGHT ? 'short' : 'regular';
  }

  function applyPanelSize(panel) {
    if (minimized) {
      panel.style.width = '';
      panel.style.height = '';
      syncPanelResponsiveState(panel);
      return;
    }

    if (!panelSize) {
      panel.style.width = '';
      panel.style.height = '';
      syncPanelResponsiveState(panel);
      return;
    }

    panelSize = clampPanelSize(panelSize.width, panelSize.height);
    panel.style.width = `${panelSize.width}px`;
    panel.style.height = `${panelSize.height}px`;
    syncPanelResponsiveState(panel);
  }

  function applyPanelPosition(panel) {
    if (!panelPosition) {
      syncPanelResponsiveState(panel);
      return;
    }

    const position = clampPanelPosition(panelPosition.left, panelPosition.top, panel);
    panelPosition = position;
    panel.style.left = `${position.left}px`;
    panel.style.top = `${position.top}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    syncPanelResponsiveState(panel);
  }

  function syncMinimizeButton(panel) {
    const minimizeButton = panel.querySelector('[data-dad-mini-minimize]');
    if (!minimizeButton) {
      return;
    }

    minimizeButton.textContent = minimized ? '+' : '-';
    minimizeButton.title = minimized
      ? getMessage('pomodoroMiniPanelExpandLabel', 'Expand')
      : getMessage('pomodoroMiniPanelMinimizeLabel', 'Minimize');
  }

  function applyPanelUiState(panel) {
    panel.dataset.minimized = minimized ? 'true' : 'false';
    syncMinimizeButton(panel);
    applyPanelSize(panel);
    applyPanelPosition(panel);
  }

  function stopPanelDrag() {
    if (!dragState) {
      return;
    }

    global.removeEventListener('pointermove', handlePanelDrag, true);
    global.removeEventListener('pointerup', stopPanelDrag, true);
    global.removeEventListener('pointercancel', stopPanelDrag, true);
    dragState = null;
    savePanelUiState();
  }

  function stopPanelResize() {
    if (!resizeState) {
      return;
    }

    const panel = document.getElementById(PANEL_ID);
    if (panel) {
      panel.dataset.resizing = 'false';
    }
    global.removeEventListener('pointermove', handlePanelResize, true);
    global.removeEventListener('pointerup', stopPanelResize, true);
    global.removeEventListener('pointercancel', stopPanelResize, true);
    resizeState = null;
    savePanelUiState();
  }

  function handlePanelResize(event) {
    if (!resizeState || event.pointerId !== resizeState.pointerId) {
      return;
    }

    const panel = document.getElementById(PANEL_ID);
    if (!panel) {
      stopPanelResize();
      return;
    }

    event.preventDefault();
    const proposed = { ...resizeState.startRect };
    if (resizeState.direction.includes('e')) {
      proposed.right = event.clientX;
    }
    if (resizeState.direction.includes('w')) {
      proposed.left = event.clientX;
    }
    if (resizeState.direction.includes('s')) {
      proposed.bottom = event.clientY;
    }
    if (resizeState.direction.includes('n')) {
      proposed.top = event.clientY;
    }

    const nextRect = clampPanelRect(proposed, resizeState.direction);
    panelSize = {
      width: nextRect.width,
      height: nextRect.height
    };
    panelPosition = {
      left: nextRect.left,
      top: nextRect.top
    };
    applyPanelSize(panel);
    applyPanelPosition(panel);
  }

  function startPanelResize(event) {
    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    const panel = document.getElementById(PANEL_ID);
    if (!panel || minimized) {
      return;
    }

    const rect = panel.getBoundingClientRect();
    const direction = event.currentTarget?.dataset?.direction || 'se';
    panelPosition = {
      left: rect.left,
      top: rect.top
    };
    panelSize = clampPanelSize(rect.width, rect.height);
    applyPanelSize(panel);
    applyPanelPosition(panel);

    resizeState = {
      pointerId: event.pointerId,
      direction,
      startRect: {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom
      }
    };

    event.preventDefault();
    event.stopPropagation();
    panel.dataset.resizing = 'true';
    global.addEventListener('pointermove', handlePanelResize, true);
    global.addEventListener('pointerup', stopPanelResize, true);
    global.addEventListener('pointercancel', stopPanelResize, true);
  }

  function handleViewportResize() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) {
      return;
    }

    if (panelSize) {
      applyPanelSize(panel);
    }
    applyPanelPosition(panel);
  }

  function handlePanelDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    const panel = document.getElementById(PANEL_ID);
    if (!panel) {
      stopPanelDrag();
      return;
    }

    event.preventDefault();
    panelPosition = clampPanelPosition(
      event.clientX - dragState.offsetX,
      event.clientY - dragState.offsetY,
      panel
    );
    applyPanelPosition(panel);
  }

  function startPanelDrag(event) {
    if (event.target?.closest?.('button')) {
      return;
    }

    const panel = document.getElementById(PANEL_ID);
    if (!panel) {
      return;
    }

    const rect = panel.getBoundingClientRect();
    dragState = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    };

    event.preventDefault();
    global.addEventListener('pointermove', handlePanelDrag, true);
    global.addEventListener('pointerup', stopPanelDrag, true);
    global.addEventListener('pointercancel', stopPanelDrag, true);
  }

  function createPanel() {
    ensureStyle();
    installThemeSync();

    const panel = document.createElement('aside');
    panel.id = PANEL_ID;
    panel.dataset.minimized = minimized ? 'true' : 'false';
    panel.setAttribute('role', 'status');

    const header = document.createElement('div');
    header.className = 'dad-mini-header';
    header.addEventListener('pointerdown', startPanelDrag);

    const title = document.createElement('p');
    title.className = 'dad-mini-title';
    title.textContent = getMessage('pomodoroMiniPanelTitle', 'DaD Pomodoro');

    const actions = document.createElement('div');
    actions.className = 'dad-mini-actions';

    const minimizeButton = document.createElement('button');
    minimizeButton.type = 'button';
    minimizeButton.dataset.dadMiniMinimize = 'true';
    minimizeButton.textContent = minimized ? '+' : '-';
    minimizeButton.title = minimized
      ? getMessage('pomodoroMiniPanelExpandLabel', 'Expand')
      : getMessage('pomodoroMiniPanelMinimizeLabel', 'Minimize');
    minimizeButton.addEventListener('click', () => {
      minimized = !minimized;
      applyPanelUiState(panel);
      savePanelUiState();
    });

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
      resizeHandle.addEventListener('pointerdown', startPanelResize);
      return resizeHandle;
    });

    panel.append(header, body, ...resizeHandles);
    applyPanelSize(panel);
    applyPanelPosition(panel);
    applyTheme();
    return panel;
  }

  function renderPanel(payload) {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) {
      return;
    }

    const runtime = payload?.runtime || {};
    const status = payload?.timerStatus || {};
    const settings = status.settings || {};
    const phase = status.phase || runtime.phase || 'idle';
    const remainingText = status.remainingText || '0:00';
    const phaseLabel = status.phaseLabel || getMessage('popupIdleLabel', 'Idle');
    const planName = payload?.plan?.name || getMessage('popupNoActivePomodoroPlan', 'No active Pomodoro plan');
    const upcomingBreakMs = getBreakDurationMs(phase, settings, status.completedWorkSessions || 0);
    const restCreditMs = upcomingBreakMs > 0
      ? Math.min(Number(status.restCreditMs || 0), upcomingBreakMs)
      : Number(status.restCreditMs || 0);
    const restStillNeededMs = Math.max(0, upcomingBreakMs - restCreditMs);
    const historyTotals = payload?.history?.totals || {};
    const activityStatus = payload?.activityStatus || {};
    const details = panel.querySelector('[data-dad-mini-details]');
    const rows = [];

    panel.querySelector('[data-dad-mini-time]').textContent = remainingText;
    const phaseElement = panel.querySelector('[data-dad-mini-phase]');
    phaseElement.textContent = phaseLabel;
    phaseElement.dataset.phase = phase;
    panel.querySelector('[data-dad-mini-plan]').textContent = planName;

    if (phase === 'work') {
      rows.push(createRow(getMessage('pomodoroWorkStartedLabel', 'Work started'), formatClock(runtime.phaseStartedAt)));
      rows.push(createRow(getMessage('pomodoroNextBreakLabel', 'Next break'), formatClock(runtime.phaseEndsAt)));
      rows.push(createRow(getMessage('pomodoroRestCreditedLabel', 'Rest already credited'), formatDuration(restCreditMs)));
      rows.push(createRow(getMessage('pomodoroRestStillNeededLabel', 'Rest still needed'), formatDuration(restStillNeededMs)));
    } else if (BREAK_PHASES.has(phase)) {
      rows.push(createRow(getMessage('pomodoroBreakStartedLabel', 'Break started'), formatClock(runtime.phaseStartedAt)));
      rows.push(createRow(getMessage('pomodoroBreakEndsLabel', 'Break ends'), formatClock(runtime.phaseEndsAt)));
      rows.push(createRow(getMessage('pomodoroRequiredRestLabel', 'Required rest'), formatDuration(upcomingBreakMs)));
    } else if (phase === 'completed') {
      rows.push(createRow(getMessage('pomodoroRestSatisfiedLabel', 'Rest satisfied'), formatClock(runtime.phaseStartedAt || runtime.lastCompletedAt)));
      rows.push(createRow(getMessage('pomodoroNextWorkLabel', 'Next work'), getMessage('pomodoroNextWorkOnActivityLabel', 'when activity returns')));
    } else if (phase === 'paused') {
      rows.push(createRow(getMessage('pomodoroPausedAtLabel', 'Paused at'), formatClock(runtime.pausedAt)));
      rows.push(createRow(getMessage('pomodoroPausedPhaseLabel', 'Paused phase'), runtime.pausedPhase || '--'));
      rows.push(createRow(getMessage('pomodoroRemainingLabel', 'Remaining'), remainingText));
    } else {
      rows.push(createRow(getMessage('pomodoroTimerStateLabel', 'Timer state'), payload?.canStart
        ? getMessage('pomodoroReadyToStartLabel', 'ready to start')
        : getMessage('popupNoActivePlan', 'No active plan')));
    }

    if (activityStatus.stateLabel) {
      rows.push(createRow(getMessage('popupActivityStateLabel', 'System state'), activityStatus.systemStateForText
        ? `${activityStatus.stateLabel} - ${activityStatus.systemStateForText}`
        : activityStatus.stateLabel));
    }

    rows.push(createRow(getMessage('pomodoroHistoryWorkSessionsLabel', 'Work sessions'), String(historyTotals.workSessionsCompleted || 0)));
    rows.push(createRow(getMessage('pomodoroHistoryCreditedRestLabel', 'Rest credited'), formatDuration(historyTotals.creditedRestMs || 0)));
    rows.push(createRow(getMessage('pomodoroHistorySkippedBreaksLabel', 'Breaks skipped'), String(historyTotals.skippedBreaks || 0)));

    details.replaceChildren(...rows);
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

    loadPanelUiState(() => {
      const loadedPanel = document.getElementById(PANEL_ID);
      if (loadedPanel) {
        applyPanelUiState(loadedPanel);
      }
    });

    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = createPanel();
      document.documentElement.appendChild(panel);
    }

    applyPanelUiState(panel);
    applyTheme();
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
    stopPanelDrag();
    stopPanelResize();
    stopPanelRefresh();
    global.removeEventListener('resize', handleViewportResize);
  }

  global.DAD.PomodoroMiniPanel = {
    close: closePanel,
    show: showPanel
  };
})(window);
