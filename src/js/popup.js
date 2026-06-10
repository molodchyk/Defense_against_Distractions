// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  DEFAULT_THEME_MODE,
  THEME_STORAGE_KEY,
  normalizeThemeMode,
  resolveThemeMode
} from './shared/theme.js';
import {
  PLANS_STORAGE_KEY,
  getEffectiveGroupsForUrl,
  isPlanActive,
  normalizePlans
} from './shared/plans.js';
import {
  normalizeUrl
} from './shared/url.js';
import {
  UI_LANGUAGE_STORAGE_KEY,
  initializeUiLanguage
} from './shared/uiLanguage.js';
import {
  getActiveTab,
  getSyncStorage,
  isExtensionPage,
  openOptions,
  sendRuntimeMessage,
  sendTabMessage
} from './popup/chrome.js';
import {
  copyTextToClipboard,
  setTextWithTitle
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

const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
let pomodoroRefreshInterval = null;
let blockDiagnosticsRefreshInterval = null;
let cachedPlans = [];
let latestActiveTab = null;
let activePopupPane = 'actions';

const pageSignalsPanel = createPageSignalsPanel({
  getMessage,
  getActiveTab,
  isExtensionPage,
  sendTabMessage,
  onActiveTabChange(activeTab) {
    latestActiveTab = activeTab || null;
    renderProtectionSummary();
  }
});

const blockDiagnosticsPanel = createBlockDiagnosticsPanel({
  getMessage,
  getActiveTab,
  isExtensionPage,
  sendTabMessage,
  onActiveTabChange(activeTab) {
    latestActiveTab = activeTab || null;
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
    latestActiveTab = activeTab || null;
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

function setStatus(message) {
  const status = document.getElementById('statusText');
  const text = String(message || '');
  status.textContent = text;
  status.title = text;
}

function setPopupPane(paneName) {
  const nextPane = paneName === 'diagnostics' ? 'diagnostics' : 'actions';
  activePopupPane = nextPane;

  document.querySelectorAll('[data-popup-tab]').forEach(button => {
    const isActive = button.dataset.popupTab === nextPane;
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  document.querySelectorAll('[data-popup-pane]').forEach(pane => {
    pane.hidden = pane.dataset.popupPane !== nextPane;
  });
}

function initializePopupTabs() {
  document.querySelectorAll('[data-popup-tab]').forEach(button => {
    button.addEventListener('click', () => {
      setPopupPane(button.dataset.popupTab);
    });
  });

  setPopupPane(activePopupPane);
}

function applyTheme(mode) {
  document.documentElement.dataset.theme = resolveThemeMode(mode, mediaQuery.matches);
}

function loadTheme() {
  chrome.storage.sync.get({ [THEME_STORAGE_KEY]: DEFAULT_THEME_MODE }, result => {
    applyTheme(normalizeThemeMode(result[THEME_STORAGE_KEY]));
  });
}

async function redirectExtensionTabsToOptions() {
  const activeTab = await getActiveTab();
  latestActiveTab = activeTab || null;

  if (isExtensionPage(activeTab?.url)) {
    chrome.runtime.openOptionsPage();
    window.close();
    return true;
  }

  return false;
}

function getActivePlans() {
  return cachedPlans.filter(plan => isPlanActive(plan));
}

function summarizeNames(names, emptyText, maxVisible = 2) {
  const visibleNames = Array.isArray(names)
    ? names.map(name => String(name || '').trim()).filter(Boolean)
    : [];

  if (visibleNames.length === 0) {
    return emptyText;
  }

  if (visibleNames.length <= maxVisible) {
    return visibleNames.join(', ');
  }

  return `${visibleNames.slice(0, maxVisible).join(', ')} +${visibleNames.length - maxVisible}`;
}

function getProtectionPageSummary(activeTab = latestActiveTab) {
  const blockDebugState = blockDiagnosticsPanel.getDebugState();

  if (!activeTab?.url || isExtensionPage(activeTab.url)) {
    return {
      state: 'idle',
      text: getMessage('popupNoWebPage')
    };
  }

  if (blockDebugState?.pageBlocked || blockDebugState?.hasOverlay) {
    const trigger = blockDebugState?.blockDiagnostics?.latestTrigger;
    return {
      state: 'active',
      text: trigger?.keyword
        ? getMessage('popupBlockedWithKeyword', [trigger.keyword])
        : getMessage('popupBlockedOverlayActive')
    };
  }

  const normalizedUrl = normalizeUrl(activeTab.url);
  const activePlans = getActivePlans();
  const matchingGroups = getEffectiveGroupsForUrl({ [PLANS_STORAGE_KEY]: cachedPlans }, normalizedUrl);
  const allowedPlans = activePlans.filter(plan => plan.allowedSites.some(site => normalizedUrl.includes(site)));

  if (allowedPlans.length > 0) {
    return {
      state: 'idle',
      text: getMessage('popupAllowedByPlans', [summarizeNames(allowedPlans.map(plan => plan.name), 'plan')])
    };
  }

  if (matchingGroups.length > 0) {
    return {
      state: 'active',
      text: getMessage(
        'popupMatchedGroups',
        [summarizeNames(matchingGroups.map(group => group.groupName || group.name), `${matchingGroups.length} groups`)]
      )
    };
  }

  if (activePlans.length > 0) {
    return {
      state: 'ready',
      text: getMessage('popupNoMatchingRule')
    };
  }

  return {
    state: 'idle',
    text: getMessage('popupNoActivePlan')
  };
}

function getOverallProtectionState(summaries, activePlans) {
  if (summaries.some(summary => summary.state === 'active')) {
    return {
      state: 'active',
      text: getMessage('popupActiveState')
    };
  }

  if (activePlans.length > 0 || summaries.some(summary => summary.state === 'ready')) {
    return {
      state: 'ready',
      text: getMessage('popupReadyState')
    };
  }

  return {
    state: 'idle',
    text: getMessage('popupIdleState')
  };
}

function renderProtectionSummary() {
  const activePlans = getActivePlans();
  const pageSummary = getProtectionPageSummary();
  const pomodoroSummary = pomodoroPanel.getSummary();
  const intentSummary = intentDiagnosticsPanel.getSummary();
  const overall = getOverallProtectionState([pageSummary, pomodoroSummary, intentSummary], activePlans);
  const badge = document.getElementById('protectionStatusBadge');

  badge.textContent = overall.text;
  badge.dataset.state = overall.state;
  setTextWithTitle('activePlansText', cachedPlans.length === 0
    ? getMessage('popupNoPlansConfigured')
    : activePlans.length === 0
      ? getMessage('popupActivePlansSummary', ['0', cachedPlans.length])
      : summarizeNames(activePlans.map(plan => plan.name), getMessage('popupActivePlansFallback', [activePlans.length])));
  setTextWithTitle('currentProtectionText', pageSummary.text);
  setTextWithTitle('pomodoroProtectionText', pomodoroSummary.text);
  setTextWithTitle('intentProtectionText', intentSummary.text);
}

async function refreshPlanSummary() {
  const items = await getSyncStorage({ [PLANS_STORAGE_KEY]: [] });
  cachedPlans = normalizePlans(items?.[PLANS_STORAGE_KEY]);
  renderProtectionSummary();
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

function getElementText(elementId) {
  return document.getElementById(elementId)?.textContent || '';
}

function buildPopupDiagnosticsPayload() {
  const pageSummary = getProtectionPageSummary();
  const pomodoroSummary = pomodoroPanel.getSummary();
  const intentSummary = intentDiagnosticsPanel.getSummary();
  const activePlans = getActivePlans();

  return {
    generatedAt: new Date().toISOString(),
    extensionVersion: chrome.runtime.getManifest().version,
    activeTab: latestActiveTab ? {
      id: latestActiveTab.id ?? null,
      url: latestActiveTab.url || null,
      title: latestActiveTab.title || null
    } : null,
    protection: {
      badge: {
        text: getElementText('protectionStatusBadge'),
        state: document.getElementById('protectionStatusBadge')?.dataset.state || null
      },
      plans: {
        activeCount: activePlans.length,
        activeNames: activePlans.map(plan => plan.name),
        totalCount: cachedPlans.length,
        text: getElementText('activePlansText')
      },
      page: {
        ...pageSummary,
        text: getElementText('currentProtectionText') || pageSummary.text
      },
      pomodoro: {
        ...pomodoroSummary,
        text: getElementText('pomodoroProtectionText') || pomodoroSummary.text
      },
      intent: {
        ...intentSummary,
        text: getElementText('intentProtectionText') || intentSummary.text
      }
    },
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
  initializePopupTabs();
  loadTheme();
  redirectExtensionTabsToOptions();
  refreshPlanSummary();
  refreshIntentDiagnostics();
  refreshBlockDiagnostics();
  refreshPomodoroState();
  pomodoroRefreshInterval = window.setInterval(refreshPomodoroState, 1000);
  blockDiagnosticsRefreshInterval = window.setInterval(refreshBlockDiagnostics, 2000);

  mediaQuery.addEventListener('change', () => {
    chrome.storage.sync.get({ [THEME_STORAGE_KEY]: DEFAULT_THEME_MODE }, result => {
      applyTheme(normalizeThemeMode(result[THEME_STORAGE_KEY]));
    });
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes[THEME_STORAGE_KEY]) {
      applyTheme(normalizeThemeMode(changes[THEME_STORAGE_KEY].newValue));
    }

    if (areaName === 'sync' && changes[PLANS_STORAGE_KEY]) {
      cachedPlans = normalizePlans(changes[PLANS_STORAGE_KEY].newValue);
      renderProtectionSummary();
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
