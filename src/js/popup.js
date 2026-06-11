// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  PLANS_STORAGE_KEY
} from './shared/plans.js';
import {
  UI_LANGUAGE_STORAGE_KEY,
  initializeUiLanguage
} from './shared/ui/uiLanguage.js';
import {
  getActiveTab,
  getSyncStorage,
  isExtensionPage,
  openOptions,
  sendRuntimeMessage,
  sendTabMessage
} from './popup/chrome.js';
import {
  copyTextToClipboard
} from './popup/dom.js';
import {
  getMessage,
  localizePopup
} from './popup/i18n.js';
import {
  createPageSignalsPanel
} from './popup/pageSignalsPanel.js';
import {
  createBlockDiagnosticsPanel
} from './popup/blockDiagnosticsPanel.js';
import {
  createIntentDiagnosticsPanel
} from './popup/intentDiagnosticsPanel.js';
import {
  createPomodoroPanel
} from './popup/pomodoroPanel.js';
import {
  createProtectionSummaryPanel
} from './popup/protectionSummaryPanel.js';
import {
  createPopupShell
} from './popup/shell.js';

let pomodoroRefreshInterval = null;
let blockDiagnosticsRefreshInterval = null;
let protectionSummaryPanel = null;
const popupShell = createPopupShell();

function setProtectionActiveTab(activeTab) {
  protectionSummaryPanel?.setActiveTab(activeTab);
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
    await refreshBlockDiagnostics();
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

function setStatus(message) {
  const status = document.getElementById('statusText');
  const text = String(message || '');
  status.textContent = text;
  status.title = text;
}

async function redirectExtensionTabsToOptions() {
  const activeTab = await getActiveTab();
  setProtectionActiveTab(activeTab);

  if (isExtensionPage(activeTab?.url)) {
    chrome.runtime.openOptionsPage();
    window.close();
    return true;
  }

  return false;
}

function renderProtectionSummary() {
  protectionSummaryPanel?.render();
}

async function startElementPicker() {
  const strategy = document.getElementById('matchStrategySelect').value;
  const minScore = Number.parseInt(document.getElementById('minimumScoreInput').value, 10);
  const ancestorDepth = Number.parseInt(document.getElementById('ancestorDepthInput').value, 10);
  const labelMatch = document.getElementById('labelMatchSelect').value;
  const activeTab = await getActiveTab();

  if (!activeTab?.id) {
    setStatus(getMessage('popupOpenPageBeforePicking'));
    return;
  }

  chrome.tabs.sendMessage(activeTab.id, {
    action: 'startElementPicker',
    strategy,
    minScore,
    ancestorDepth,
    labelMatch
  }, response => {
    if (chrome.runtime.lastError) {
      setStatus(getMessage('popupReloadBeforePicking'));
      return;
    }

    setStatus(response?.status || getMessage('popupElementPickerStarted'));
    window.close();
  });
}

function refreshBlockDiagnostics() {
  return blockDiagnosticsPanel.refresh();
}

function refreshIntentDiagnostics() {
  return intentDiagnosticsPanel.refresh();
}

function clearIntentDiagnostics() {
  return intentDiagnosticsPanel.clear();
}

function refreshPomodoroState() {
  return pomodoroPanel.refresh();
}

function runPomodoroCommand(action) {
  return pomodoroPanel.runCommand(action);
}

function buildPopupDiagnosticsPayload() {
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

async function copyPopupDiagnostics() {
  const button = document.getElementById('copyDiagnosticsButton');
  button.disabled = true;

  try {
    await refreshPomodoroState();
    await refreshBlockDiagnostics();
    await refreshIntentDiagnostics();
    await copyTextToClipboard(JSON.stringify(buildPopupDiagnosticsPayload(), null, 2));
    setStatus(getMessage('popupDiagnosticsCopied'));
  } catch (error) {
    setStatus(getMessage('popupCouldNotCopyDiagnostics'));
  } finally {
    button.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initializePopup().catch(error => {
    console.error('Failed to initialize popup:', error);
  });
});

async function initializePopup() {
  await initializeUiLanguage();
  localizePopup();
  popupShell.initializeTabs();
  popupShell.loadTheme();
  redirectExtensionTabsToOptions();
  protectionSummaryPanel.refreshPlans();
  refreshIntentDiagnostics();
  refreshBlockDiagnostics();
  refreshPomodoroState();
  pomodoroRefreshInterval = window.setInterval(refreshPomodoroState, 1000);
  blockDiagnosticsRefreshInterval = window.setInterval(refreshBlockDiagnostics, 2000);
  popupShell.initializeThemeListener();

  chrome.storage.onChanged.addListener((changes, areaName) => {
    popupShell.handleStorageChange(changes, areaName);

    if (areaName === 'sync' && changes[PLANS_STORAGE_KEY]) {
      protectionSummaryPanel.setPlans(changes[PLANS_STORAGE_KEY].newValue);
    }

    if (areaName === 'sync' && changes[UI_LANGUAGE_STORAGE_KEY]) {
      initializeUiLanguage()
        .then(() => {
          localizePopup();
          renderProtectionSummary();
          pomodoroPanel.render(pomodoroPanel.getPayload());
          blockDiagnosticsPanel.render(blockDiagnosticsPanel.getDebugState());
          pageSignalsPanel.render(pageSignalsPanel.getSnapshot());
          intentDiagnosticsPanel.render(intentDiagnosticsPanel.getDebugState());
        })
        .catch(error => {
          console.error('Failed to sync popup language:', error);
        });
    }
  });

  document.getElementById('pickElementButton').addEventListener('click', startElementPicker);
  document.getElementById('headerOptionsButton').addEventListener('click', openOptions);
  document.getElementById('startPomodoroButton').addEventListener('click', () => runPomodoroCommand('startPomodoro'));
  document.getElementById('pausePomodoroButton').addEventListener('click', () => runPomodoroCommand('pausePomodoro'));
  document.getElementById('resumePomodoroButton').addEventListener('click', () => runPomodoroCommand('resumePomodoro'));
  document.getElementById('resetPomodoroButton').addEventListener('click', () => runPomodoroCommand('resetPomodoro'));
  document.getElementById('openPomodoroPanelButton').addEventListener('click', () => pomodoroPanel.openMiniPanel());
  document.getElementById('refreshBlockDiagnosticsButton').addEventListener('click', refreshBlockDiagnostics);
  document.getElementById('copyDiagnosticsButton').addEventListener('click', copyPopupDiagnostics);
  document.getElementById('refreshIntentButton').addEventListener('click', refreshIntentDiagnostics);
  document.getElementById('clearIntentButton').addEventListener('click', clearIntentDiagnostics);
  document.getElementById('openOptionsButton').addEventListener('click', openOptions);
}

window.addEventListener('pagehide', () => {
  if (pomodoroRefreshInterval) {
    window.clearInterval(pomodoroRefreshInterval);
    pomodoroRefreshInterval = null;
  }

  if (blockDiagnosticsRefreshInterval) {
    window.clearInterval(blockDiagnosticsRefreshInterval);
    blockDiagnosticsRefreshInterval = null;
  }
});
