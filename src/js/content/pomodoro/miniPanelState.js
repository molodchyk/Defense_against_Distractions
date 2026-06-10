// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};

  const PANEL_STATE_STORAGE_KEY = 'pomodoroMiniPanelUiState';

  function normalizeDimension(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function normalizeStoredPanelState(state = {}, clampSize) {
    const width = normalizeDimension(state?.size?.width);
    const height = normalizeDimension(state?.size?.height);
    const left = normalizeDimension(state?.position?.left);
    const top = normalizeDimension(state?.position?.top);
    const size = width && height
      ? clampSize(width, height)
      : null;

    return {
      minimized: Boolean(state?.minimized),
      size,
      position: left !== null && top !== null ? { left, top } : null
    };
  }

  function load(callback, clampSize) {
    if (!global.DAD.safeLocalStorageGet) {
      callback(normalizeStoredPanelState({}, clampSize));
      return false;
    }

    return global.DAD.safeLocalStorageGet({ [PANEL_STATE_STORAGE_KEY]: null }, result => {
      callback(normalizeStoredPanelState(result?.[PANEL_STATE_STORAGE_KEY], clampSize));
    });
  }

  function save(state = {}) {
    return global.DAD.safeLocalStorageSet?.({
      [PANEL_STATE_STORAGE_KEY]: {
        version: 1,
        minimized: Boolean(state.minimized),
        size: state.size || null,
        position: state.position || null,
        updatedAt: new Date().toISOString()
      }
    }) || false;
  }

  global.DAD.PomodoroMiniPanelState = {
    load,
    save,
    storageKey: PANEL_STATE_STORAGE_KEY
  };
})(window);
