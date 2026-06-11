// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export function createPopupRefreshLoop({
  pomodoroPanel,
  blockDiagnosticsPanel
}) {
  let pomodoroRefreshInterval = null;
  let blockDiagnosticsRefreshInterval = null;

  function start() {
    pomodoroRefreshInterval = window.setInterval(() => pomodoroPanel.refresh(), 1000);
    blockDiagnosticsRefreshInterval = window.setInterval(() => blockDiagnosticsPanel.refresh(), 2000);
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
  }

  return {
    start,
    stop
  };
}
