// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export function bindPopupEvents({
  startElementPicker,
  openOptions,
  pomodoroPanel,
  blockDiagnosticsPanel,
  intentDiagnosticsPanel,
  diagnosticsExporter
}) {
  const bindClick = (id, handler) => {
    document.getElementById(id)?.addEventListener('click', handler);
  };

  bindClick('pickElementButton', startElementPicker);
  bindClick('headerOptionsButton', openOptions);
  bindClick('startPomodoroButton', () => pomodoroPanel.runCommand('startPomodoro'));
  bindClick('pausePomodoroButton', () => pomodoroPanel.runCommand('pausePomodoro'));
  bindClick('resumePomodoroButton', () => pomodoroPanel.runCommand('resumePomodoro'));
  bindClick('resetPomodoroButton', () => pomodoroPanel.runCommand('resetPomodoro'));
  bindClick('openPomodoroPanelButton', () => pomodoroPanel.openMiniPanel());
  bindClick('refreshBlockDiagnosticsButton', () => blockDiagnosticsPanel.refresh());
  bindClick('copyDiagnosticsButton', () => diagnosticsExporter.copyDiagnostics());
  bindClick('refreshIntentButton', () => intentDiagnosticsPanel.refresh());
  bindClick('clearIntentButton', () => intentDiagnosticsPanel.clear());
}
