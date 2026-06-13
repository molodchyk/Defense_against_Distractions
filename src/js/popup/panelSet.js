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
} from './intent/intentDiagnosticsPanel.js';
import {
  createFocusStatePanel
} from './focusStatePanel.js';
import {
  createPomodoroPanel
} from './pomodoroPanel.js';
import {
  createProtectionSummaryPanel
} from './protectionSummaryPanel.js';
import {
  createUsageStatsPanel
} from './usage/usageStatsPanel.js';

export function createPopupPanelSet({
  getMessage,
  getActiveTab,
  getSyncStorage,
  isExtensionPage,
  sendRuntimeMessage,
  sendTabMessage,
  updateTabUrl,
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
    sendRuntimeMessage,
    sendTabMessage,
    setStatus,
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
    updateTabUrl,
    pageSignalsPanel,
    setStatus,
    onActiveTabChange(activeTab) {
      setProtectionActiveTab(activeTab);
    },
    onStateChange() {
      renderProtectionSummary();
    }
  });

  const focusStatePanel = createFocusStatePanel({
    getMessage,
    sendRuntimeMessage,
    setStatus,
    onStateChange() {
      renderProtectionSummary();
    },
    async onAfterChange() {
      await intentDiagnosticsPanel.refresh();
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

  const usageStatsPanel = createUsageStatsPanel({
    getMessage,
    sendRuntimeMessage
  });

  protectionSummaryPanel = createProtectionSummaryPanel({
    getMessage,
    getSyncStorage,
    isExtensionPage,
    getBlockDebugState() {
      return blockDiagnosticsPanel.getDebugState();
    },
    getFocusStateSummary() {
      return focusStatePanel.getSummary();
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
    focusStatePanel,
    intentDiagnosticsPanel,
    pageSignalsPanel,
    pomodoroPanel,
    usageStatsPanel,
    protectionSummaryPanel,
    renderProtectionSummary,
    setProtectionActiveTab
  };
}
