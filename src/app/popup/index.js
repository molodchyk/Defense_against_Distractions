// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { PLANS_STORAGE_KEY } from '../../js/shared/plans.js';
import {
  UI_LANGUAGE_STORAGE_KEY,
  initializeUiLanguage
} from '../../js/shared/ui/uiLanguage.js';
import {
  getActiveTab,
  getSyncStorage,
  isExtensionPage,
  openFeedback,
  openIntentDiagnostics,
  openOptions,
  sendRuntimeMessage,
  sendTabMessage,
  updateTabUrl
} from '../../js/popup/chrome.js';
import { getMessage, localizePopup } from '../../js/popup/i18n.js';
import {
  createPopupPanelSet
} from '../../js/popup/panelSet.js';
import {
  createElementPickerLauncher
} from '../../js/popup/elementPickerLauncher.js';
import {
  createPopupDiagnosticsExporter
} from '../../js/popup/diagnosticsExport.js';
import {
  bindPopupEvents
} from '../../js/popup/events.js';
import {
  createPopupRefreshLoop
} from '../../js/popup/refreshLoop.js';
import {
  createPopupShell
} from '../../js/popup/shell.js';

const popupShell = createPopupShell();
const panels = createPopupPanelSet({
  getMessage,
  getActiveTab,
  getSyncStorage,
  isExtensionPage,
  sendRuntimeMessage,
  sendTabMessage,
  updateTabUrl,
  setStatus
});
const refreshLoop = createPopupRefreshLoop(panels);
const startElementPicker = createElementPickerLauncher({
  getActiveTab,
  getMessage,
  setStatus
});
const diagnosticsExporter = createPopupDiagnosticsExporter({
  getMessage,
  setStatus,
  ...panels
});

function setStatus(message) {
  const status = document.getElementById('statusText');
  const text = String(message || '');
  status.textContent = text;
  status.title = text;
}

async function redirectExtensionTabsToOptions() {
  const activeTab = await getActiveTab();
  panels.setProtectionActiveTab(activeTab);

  if (isExtensionPage(activeTab?.url)) {
    chrome.runtime.openOptionsPage();
    window.close();
    return;
  }
}

function renderLocalizedPanels() {
  panels.renderProtectionSummary();
  panels.usageStatsPanel.render(panels.usageStatsPanel.getPayload());
  panels.pomodoroPanel.render(panels.pomodoroPanel.getPayload());
  panels.focusStatePanel.render(panels.focusStatePanel.getSnapshot());
  panels.blockDiagnosticsPanel.render(panels.blockDiagnosticsPanel.getDebugState());
  panels.pageSignalsPanel.render(panels.pageSignalsPanel.getSnapshot());
  panels.intentDiagnosticsPanel.render(panels.intentDiagnosticsPanel.getDebugState());
}

function handleStorageChange(changes, areaName) {
  popupShell.handleStorageChange(changes, areaName);

  if (areaName === 'sync' && changes[PLANS_STORAGE_KEY]) {
    panels.protectionSummaryPanel.setPlans(changes[PLANS_STORAGE_KEY].newValue);
  }

  if (areaName === 'local' && changes.usageStats) {
    panels.usageStatsPanel.refresh().catch(error => {
      console.error('Failed to refresh popup usage stats:', error);
    });
  }

  if (areaName === 'sync' && changes[UI_LANGUAGE_STORAGE_KEY]) {
    initializeUiLanguage()
      .then(() => {
        localizePopup();
        renderLocalizedPanels();
      })
      .catch(error => {
        console.error('Failed to sync popup language:', error);
      });
  }
}

async function initializePopup() {
  await initializeUiLanguage();
  localizePopup();
  popupShell.initializeTabs();
  popupShell.loadTheme();
  redirectExtensionTabsToOptions();
  panels.protectionSummaryPanel.refreshPlans();
  panels.focusStatePanel.refresh();
  panels.usageStatsPanel.refresh();
  panels.intentDiagnosticsPanel.refresh();
  panels.blockDiagnosticsPanel.refresh();
  panels.pomodoroPanel.refresh();
  refreshLoop.start();
  popupShell.initializeThemeListener();
  chrome.storage.onChanged.addListener(handleStorageChange);
  bindPopupEvents({
    startElementPicker,
    openFeedback,
    openIntentDiagnostics,
    openOptions,
    diagnosticsExporter,
    ...panels
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initializePopup().catch(error => {
    console.error('Failed to initialize popup:', error);
  });
});

window.addEventListener('pagehide', refreshLoop.stop);
