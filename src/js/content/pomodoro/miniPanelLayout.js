// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};

  const panelStyle = global.DAD.PomodoroMiniPanelStyle || {};
  const PANEL_ID = panelStyle.PANEL_ID || 'dad-pomodoro-mini-panel';
  const PANEL_MARGIN = panelStyle.PANEL_MARGIN || 8;
  const DEFAULT_PANEL_WIDTH = panelStyle.DEFAULT_PANEL_WIDTH || 300;
  const MIN_PANEL_WIDTH = panelStyle.MIN_PANEL_WIDTH || 220;
  const MIN_PANEL_HEIGHT = panelStyle.MIN_PANEL_HEIGHT || 132;
  const COMPACT_PANEL_WIDTH = panelStyle.COMPACT_PANEL_WIDTH || 260;
  const SHORT_PANEL_HEIGHT = panelStyle.SHORT_PANEL_HEIGHT || 210;

  let panelStateLoaded = false;
  let minimized = false;
  let panelPosition = null;
  let panelSize = null;
  let dragState = null;
  let resizeState = null;

  function getMessage(key, fallback, substitutions) {
    const uiMessage = global.DAD.UiLanguage?.getMessage?.(key, fallback, substitutions);
    if (uiMessage) {
      return uiMessage;
    }

    return global.DAD.ChromePlatform?.getI18nMessage?.(key, substitutions) || fallback;
  }

  function getPanel() {
    return document.getElementById(PANEL_ID);
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

  function applySize(panel) {
    if (minimized || !panelSize) {
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

  function applyPosition(panel) {
    if (!panelPosition) {
      syncPanelResponsiveState(panel);
      return;
    }

    panelPosition = clampPanelPosition(panelPosition.left, panelPosition.top, panel);
    panel.style.left = `${panelPosition.left}px`;
    panel.style.top = `${panelPosition.top}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    syncPanelResponsiveState(panel);
  }

  function apply(panel = getPanel()) {
    if (!panel) {
      return;
    }

    panel.dataset.minimized = minimized ? 'true' : 'false';
    syncMinimizeButton(panel);
    applySize(panel);
    applyPosition(panel);
  }

  function load(callback = null) {
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

  function save() {
    global.DAD.PomodoroMiniPanelState?.save({
      minimized,
      size: panelSize,
      position: panelPosition
    });
  }

  function handlePanelDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    const panel = getPanel();
    if (!panel) {
      stopDrag();
      return;
    }

    event.preventDefault();
    panelPosition = clampPanelPosition(
      event.clientX - dragState.offsetX,
      event.clientY - dragState.offsetY,
      panel
    );
    applyPosition(panel);
  }

  function startDrag(event) {
    if (event.target?.closest?.('button')) {
      return;
    }

    const panel = getPanel();
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
    global.addEventListener('pointerup', stopDrag, true);
    global.addEventListener('pointercancel', stopDrag, true);
  }

  function stopDrag() {
    if (!dragState) {
      return;
    }

    global.removeEventListener('pointermove', handlePanelDrag, true);
    global.removeEventListener('pointerup', stopDrag, true);
    global.removeEventListener('pointercancel', stopDrag, true);
    dragState = null;
    save();
  }

  function handlePanelResize(event) {
    if (!resizeState || event.pointerId !== resizeState.pointerId) {
      return;
    }

    const panel = getPanel();
    if (!panel) {
      stopResize();
      return;
    }

    event.preventDefault();
    const proposed = { ...resizeState.startRect };
    if (resizeState.direction.includes('e')) proposed.right = event.clientX;
    if (resizeState.direction.includes('w')) proposed.left = event.clientX;
    if (resizeState.direction.includes('s')) proposed.bottom = event.clientY;
    if (resizeState.direction.includes('n')) proposed.top = event.clientY;

    const nextRect = clampPanelRect(proposed, resizeState.direction);
    panelSize = { width: nextRect.width, height: nextRect.height };
    panelPosition = { left: nextRect.left, top: nextRect.top };
    applySize(panel);
    applyPosition(panel);
  }

  function startResize(event) {
    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    const panel = getPanel();
    if (!panel || minimized) {
      return;
    }

    const rect = panel.getBoundingClientRect();
    panelPosition = { left: rect.left, top: rect.top };
    panelSize = clampPanelSize(rect.width, rect.height);
    applySize(panel);
    applyPosition(panel);

    resizeState = {
      pointerId: event.pointerId,
      direction: event.currentTarget?.dataset?.direction || 'se',
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
    global.addEventListener('pointerup', stopResize, true);
    global.addEventListener('pointercancel', stopResize, true);
  }

  function stopResize() {
    if (!resizeState) {
      return;
    }

    const panel = getPanel();
    if (panel) {
      panel.dataset.resizing = 'false';
    }
    global.removeEventListener('pointermove', handlePanelResize, true);
    global.removeEventListener('pointerup', stopResize, true);
    global.removeEventListener('pointercancel', stopResize, true);
    resizeState = null;
    save();
  }

  function toggleMinimized(panel = getPanel()) {
    minimized = !minimized;
    apply(panel);
    save();
  }

  function handleViewportResize() {
    const panel = getPanel();
    if (!panel) {
      return;
    }

    if (panelSize) {
      applySize(panel);
    }
    applyPosition(panel);
  }

  global.DAD.PomodoroMiniPanelLayout = {
    apply,
    handleViewportResize,
    isMinimized: () => minimized,
    load,
    startDrag,
    startResize,
    stopDrag,
    stopResize,
    toggleMinimized
  };
})(window);
