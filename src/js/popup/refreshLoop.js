// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export function createPopupRefreshLoop({
  pomodoroPanel,
  blockDiagnosticsPanel,
  focusStatePanel,
  usageStatsPanel
}) {
  let pomodoroRefreshInterval = null;
  let blockDiagnosticsRefreshInterval = null;
  let focusStateRefreshInterval = null;
  let usageStatsRefreshInterval = null;

  function start() {
    pomodoroRefreshInterval = window.setInterval(() => pomodoroPanel.refresh(), 1000);
    blockDiagnosticsRefreshInterval = window.setInterval(() => blockDiagnosticsPanel.refresh(), 2000);
    focusStateRefreshInterval = window.setInterval(() => focusStatePanel.refresh(), 30 * 1000);
    usageStatsRefreshInterval = window.setInterval(() => usageStatsPanel.refresh(), 30 * 1000);
  }

  function stop() {
    if (pomodoroRefreshInterval) {
      window.clearInterval(pomodoroRefreshInterval);
      pomodoroRefreshInterval = null;
    }

    if (blockDiagnosticsRefreshInterval) {
      window.clearInterval(blockDiagnosticsRefreshInterval);
      blockDiagnosticsRefreshInterval = null;
    }

    if (focusStateRefreshInterval) {
      window.clearInterval(focusStateRefreshInterval);
      focusStateRefreshInterval = null;
    }

    if (usageStatsRefreshInterval) {
      window.clearInterval(usageStatsRefreshInterval);
      usageStatsRefreshInterval = null;
    }
  }

  return {
    start,
    stop
  };
}
