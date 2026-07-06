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
  createSelectedTextQuickAddPanel
} from './quick-add/selectedTextQuickAddPanel.js';
import {
  createTriggeredActionPreviewPanel
} from './triggered-actions/previewPanel.js';
import {
  createUsageStatsPanel
} from './usage/usageStatsPanel.js';

export function createPopupPanelSet({
  getMessage,
  getActiveTab,
  getSyncStorage,
  isExtensionPage,
  startElementPicker,
  openPlanActions,
  sendRuntimeMessage,
  sendTabMessage,
  updateTabUrl,
  setStatus
}) {
  let protectionSummaryPanel = null;
  let selectedTextQuickAddPanel = null;

  function setProtectionActiveTab(activeTab) {
    protectionSummaryPanel?.setActiveTab(activeTab);
    selectedTextQuickAddPanel?.setActiveTab(activeTab);
  }

  function renderProtectionSummary() {
    protectionSummaryPanel?.render();
  }

  selectedTextQuickAddPanel = createSelectedTextQuickAddPanel({
    getMessage,
    getActiveTab,
    sendRuntimeMessage,
    sendTabMessage,
    startElementPicker,
    openPlanActions,
    setStatus,
    onPlansChange(plans) {
      protectionSummaryPanel?.setPlans(plans);
    }
  });

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
    },
    onSelectionCandidateChange(candidate) {
      selectedTextQuickAddPanel.setCandidate(candidate);
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

  const triggeredActionPreviewPanel = createTriggeredActionPreviewPanel({
    getMessage,
    getActiveTab,
    getSyncStorage,
    isExtensionPage,
    sendTabMessage,
    onActiveTabChange(activeTab) {
      setProtectionActiveTab(activeTab);
    }
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
    selectedTextQuickAddPanel,
    triggeredActionPreviewPanel,
    usageStatsPanel,
    protectionSummaryPanel,
    renderProtectionSummary,
    setProtectionActiveTab
  };
}
