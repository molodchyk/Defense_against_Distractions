// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  copyTextToClipboard
} from './dom.js';

export function createPopupDiagnosticsExporter({
  getMessage,
  setStatus,
  protectionSummaryPanel,
  blockDiagnosticsPanel,
  focusStatePanel,
  pageSignalsPanel,
  pomodoroPanel,
  usageStatsPanel,
  intentDiagnosticsPanel
}) {
  function buildPayload() {
    const protectionSnapshot = protectionSummaryPanel.getDiagnosticsSnapshot();

    return {
      generatedAt: new Date().toISOString(),
      extensionVersion: chrome.runtime.getManifest().version,
      activeTab: protectionSnapshot.activeTab,
      protection: protectionSnapshot.protection,
      block: blockDiagnosticsPanel.getDebugState(),
      focusState: focusStatePanel.getSnapshot(),
      pageSignals: pageSignalsPanel.getSnapshot(),
      pomodoro: pomodoroPanel.getCompactDiagnostics(),
      usageStats: usageStatsPanel.getCompactDiagnostics(),
      intent: intentDiagnosticsPanel.getCompactDiagnostics()
    };
  }

  async function copyDiagnostics(buttonId = 'copyDiagnosticsButton') {
    const button = document.getElementById(buttonId);
    if (button) {
      button.disabled = true;
    }

    try {
      await focusStatePanel.refresh();
      await usageStatsPanel.refresh();
      await pomodoroPanel.refresh();
      await blockDiagnosticsPanel.refresh();
      await intentDiagnosticsPanel.refresh();
      await copyTextToClipboard(JSON.stringify(buildPayload(), null, 2));
      setStatus(getMessage('popupDiagnosticsCopied'));
      return true;
    } catch (error) {
      setStatus(getMessage('popupCouldNotCopyDiagnostics'));
      return false;
    } finally {
      if (button) {
        button.disabled = false;
      }
    }
  }

  return {
    buildPayload,
    copyDiagnostics
  };
}
