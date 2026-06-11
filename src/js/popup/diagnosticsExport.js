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
  pageSignalsPanel,
  pomodoroPanel,
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
      pageSignals: pageSignalsPanel.getSnapshot(),
      pomodoro: pomodoroPanel.getCompactDiagnostics(),
      intent: intentDiagnosticsPanel.getCompactDiagnostics()
    };
  }

  async function copyDiagnostics() {
    const button = document.getElementById('copyDiagnosticsButton');
    button.disabled = true;

    try {
      await pomodoroPanel.refresh();
      await blockDiagnosticsPanel.refresh();
      await intentDiagnosticsPanel.refresh();
      await copyTextToClipboard(JSON.stringify(buildPayload(), null, 2));
      setStatus(getMessage('popupDiagnosticsCopied'));
    } catch (error) {
      setStatus(getMessage('popupCouldNotCopyDiagnostics'));
    } finally {
      button.disabled = false;
    }
  }

  return {
    buildPayload,
    copyDiagnostics
  };
}
