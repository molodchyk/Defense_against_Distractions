// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  createPageSignalsPanel
} from './pageSignalsPanel.js';
import {
  createBlockDiagnosticsPanel
} from './blockDiagnosticsPanel.js';
import {
  createIntentDiagnosticsPanel
} from './intentDiagnosticsPanel.js';
import {
  createPomodoroPanel
} from './pomodoroPanel.js';
import {
  createProtectionSummaryPanel
} from './protectionSummaryPanel.js';

export function createPopupPanelSet({
  getMessage,
  getActiveTab,
  getSyncStorage,
  isExtensionPage,
  sendRuntimeMessage,
  sendTabMessage,
  setStatus
}) {
  let protectionSummaryPanel = null;

  function setProtectionActiveTab(activeTab) {
    protectionSummaryPanel?.setActiveTab(activeTab);
  }

  function renderProtectionSummary() {
    protectionSummaryPanel?.render();
  }

  const pageSignalsPanel = createPageSignalsPanel({
    getMessage,
    getActiveTab,
    isExtensionPage,
    sendTabMessage,
    onActiveTabChange(activeTab) {
      setProtectionActiveTab(activeTab);
      renderProtectionSummary();
    }
  });

  const blockDiagnosticsPanel = createBlockDiagnosticsPanel({
    getMessage,
    getActiveTab,
    isExtensionPage,
    sendTabMessage,
    onActiveTabChange(activeTab) {
      setProtectionActiveTab(activeTab);
    },
    onStateChange() {
      renderProtectionSummary();
    }
  });

  const intentDiagnosticsPanel = createIntentDiagnosticsPanel({
    getMessage,
    getActiveTab,
    isExtensionPage,
    sendRuntimeMessage,
    sendTabMessage,
    pageSignalsPanel,
    setStatus,
    onActiveTabChange(activeTab) {
      setProtectionActiveTab(activeTab);
    },
    onStateChange() {
      renderProtectionSummary();
    }
  });

  const pomodoroPanel = createPomodoroPanel({
    getMessage,
    getActiveTab,
    isExtensionPage,
    sendRuntimeMessage,
    sendTabMessage,
    setStatus,
    onStateChange() {
      renderProtectionSummary();
    },
    async onAfterCommand() {
      await blockDiagnosticsPanel.refresh();
    }
  });

  protectionSummaryPanel = createProtectionSummaryPanel({
    getMessage,
    getSyncStorage,
    isExtensionPage,
    getBlockDebugState() {
      return blockDiagnosticsPanel.getDebugState();
    },
    getPomodoroSummary() {
      return pomodoroPanel.getSummary();
    },
    getIntentSummary() {
      return intentDiagnosticsPanel.getSummary();
    }
  });

  return {
    blockDiagnosticsPanel,
    intentDiagnosticsPanel,
    pageSignalsPanel,
    pomodoroPanel,
    protectionSummaryPanel,
    renderProtectionSummary,
    setProtectionActiveTab
  };
}
