// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export function bindPopupEvents({
  startElementPicker,
  openFeedback,
  openIntentDiagnostics,
  openOptions,
  pomodoroPanel,
  focusStatePanel,
  blockDiagnosticsPanel,
  triggeredActionPreviewPanel,
  pageSignalsPanel,
  selectedTextQuickAddPanel,
  intentDiagnosticsPanel,
  diagnosticsExporter
}) {
  const bindClick = (id, handler) => {
    document.getElementById(id)?.addEventListener('click', handler);
  };

  bindClick('pickElementButton', startElementPicker);
  bindClick('headerFeedbackButton', openFeedback);
  bindClick('headerOptionsButton', openOptions);
  bindClick('openIntentGraphButton', openIntentDiagnostics);
  bindClick('focusStateCalmButton', () => focusStatePanel.setLevel('calm'));
  bindClick('focusStateStrainedButton', () => focusStatePanel.setLevel('strained'));
  bindClick('focusStateVulnerableButton', () => focusStatePanel.setLevel('vulnerable'));
  bindClick('startPomodoroButton', () => pomodoroPanel.runCommand('startPomodoro'));
  bindClick('pausePomodoroButton', () => pomodoroPanel.runCommand('pausePomodoro'));
  bindClick('resumePomodoroButton', () => pomodoroPanel.runCommand('resumePomodoro'));
  bindClick('resetPomodoroButton', () => pomodoroPanel.runCommand('resetPomodoro'));
  bindClick('openPomodoroPanelButton', () => pomodoroPanel.openMiniPanel());
  bindClick('returnIntentChainButton', () => intentDiagnosticsPanel.returnChainToRecovery());
  bindClick('returnIntentButton', () => intentDiagnosticsPanel.returnToRecovery());
  bindClick('continueIntentButton', () => intentDiagnosticsPanel.continueCurrentIntent());
  bindClick('isolateIntentButton', () => intentDiagnosticsPanel.isolateCurrentPage());
  bindClick('markIntentCoherentButton', () => intentDiagnosticsPanel.markCurrentSessionCoherent());
  bindClick('returnIntentDriftTabsButton', () => intentDiagnosticsPanel.returnDriftTabs());
  bindClick('moveIntentDriftTabsButton', () => intentDiagnosticsPanel.moveDriftTabs());
  bindClick('suspendIntentDriftTabsButton', () => intentDiagnosticsPanel.suspendDriftTabs());
  bindClick('cleanIntentDriftTabsButton', () => intentDiagnosticsPanel.cleanDriftTabs());
  bindClick('copyKeywordIdeasButton', () => pageSignalsPanel.copyKeywordSuggestions());
  bindClick('copySelectedTextButton', () => pageSignalsPanel.copySelectedTextCandidate());
  bindClick('addSelectedTextRuleButton', () => selectedTextQuickAddPanel.saveSelectedTextRule());
  bindClick('refreshBlockDiagnosticsButton', () => blockDiagnosticsPanel.refresh());
  bindClick('refreshTriggeredActionPreviewButton', () => triggeredActionPreviewPanel.refresh());
  bindClick('copyDiagnosticsButton', () => diagnosticsExporter.copyDiagnostics());
  bindClick('copyDiagnosticsFeedbackButton', async () => {
    if (await diagnosticsExporter.copyDiagnostics('copyDiagnosticsFeedbackButton')) {
      openFeedback();
    }
  });
  bindClick('refreshIntentButton', () => intentDiagnosticsPanel.refresh());
  bindClick('clearIntentButton', () => intentDiagnosticsPanel.clear());
  selectedTextQuickAddPanel.bindEvents();
}
