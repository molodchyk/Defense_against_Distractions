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
  document.getElementById('pickElementButton').addEventListener('click', startElementPicker);
  document.getElementById('headerOptionsButton').addEventListener('click', openOptions);
  document.getElementById('startPomodoroButton').addEventListener('click', () => pomodoroPanel.runCommand('startPomodoro'));
  document.getElementById('pausePomodoroButton').addEventListener('click', () => pomodoroPanel.runCommand('pausePomodoro'));
  document.getElementById('resumePomodoroButton').addEventListener('click', () => pomodoroPanel.runCommand('resumePomodoro'));
  document.getElementById('resetPomodoroButton').addEventListener('click', () => pomodoroPanel.runCommand('resetPomodoro'));
  document.getElementById('openPomodoroPanelButton').addEventListener('click', () => pomodoroPanel.openMiniPanel());
  document.getElementById('refreshBlockDiagnosticsButton').addEventListener('click', () => blockDiagnosticsPanel.refresh());
  document.getElementById('copyDiagnosticsButton').addEventListener('click', () => diagnosticsExporter.copyDiagnostics());
  document.getElementById('refreshIntentButton').addEventListener('click', () => intentDiagnosticsPanel.refresh());
  document.getElementById('clearIntentButton').addEventListener('click', () => intentDiagnosticsPanel.clear());
  document.getElementById('openOptionsButton').addEventListener('click', openOptions);
}
