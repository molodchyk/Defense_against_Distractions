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
  createTimelineRow,
  setTextWithTitle
} from './popup/dom.js';
import {
  formatClock,
  formatDuration,
  getBreakDurationMs
} from './popup/format.js';
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

const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
const POMODORO_RUNNING_PHASES = new Set(['work', 'shortBreak', 'longBreak']);
const POMODORO_BREAK_PHASES = new Set(['shortBreak', 'longBreak']);
let pomodoroRefreshInterval = null;
let blockDiagnosticsRefreshInterval = null;
let cachedPlans = [];
let latestActiveTab = null;
let latestPomodoroPayload = null;
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

function getPomodoroSummary(payload = latestPomodoroPayload) {
  if (payload?.autoStartSuppression?.active) {
    return {
      state: 'idle',
      text: payload.autoStartSuppression.global
        ? getMessage('popupAutoStartPaused')
        : getMessage('popupAutoStartDelayed')
    };
  }

  const phase = payload?.timerStatus?.phase || payload?.runtime?.phase || 'idle';
  const phaseLabel = payload?.timerStatus?.phaseLabel || getMessage('popupIdleLabel');
  const remainingText = payload?.timerStatus?.remainingText || '0:00';
  const planName = payload?.plan?.name || '';

  if (POMODORO_BREAK_PHASES.has(phase)) {
    return {
      state: 'active',
      text: getMessage('popupPomodoroStateSummary', [phaseLabel, remainingText])
    };
  }

  if (phase === 'work') {
    return {
      state: 'ready',
      text: getMessage('popupWorkSummary', [remainingText])
    };
  }

  if (phase === 'paused') {
    return {
      state: 'idle',
      text: getMessage('popupPausedSummary', [remainingText])
    };
  }

  if (phase === 'completed') {
    return {
      state: 'ready',
      text: getMessage('popupRestSatisfied')
    };
  }

  return {
    state: 'idle',
    text: planName || getMessage('popupNotRunning')
  };
}

function getPomodoroPolicyText(payload = latestPomodoroPayload) {
  const pomodoro = payload?.plan?.pomodoro || {};
  const strictText = pomodoro.strictBreaks ? getMessage('popupStrictBreaks') : getMessage('popupAdvisoryBreaks');
  const startText = pomodoro.autoStart ? getMessage('popupAutoStart') : getMessage('popupManualStart');
  return `${strictText} - ${startText}`;
}

function getPomodoroAutoStartSuppressionText(payload = latestPomodoroPayload) {
  const suppression = payload?.autoStartSuppression;
  if (!suppression?.active) {
    return '';
  }

  if (Number(suppression.remainingMs) > 0) {
    return getMessage('popupAutoStartDelayedFor', [formatDuration(suppression.remainingMs)]);
  }

  if (suppression.global) {
    return getMessage('popupAutoStartPausedUntilStart');
  }

  return getMessage('popupAutoStartPaused');
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
  const pomodoroSummary = getPomodoroSummary();
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

async function openPomodoroMiniPanel() {
  const activeTab = await getActiveTab();

  if (!activeTab?.id || isExtensionPage(activeTab.url)) {
    setStatus(getMessage('popupOpenPageBeforePicking'));
    return;
  }

  const response = await sendTabMessage(activeTab.id, { action: 'showPomodoroMiniPanel' });
  if (!response || response.status === 'error') {
    setStatus(response?.reason || getMessage('popupReloadBeforePicking'));
    return;
  }

  setStatus(getMessage('popupTimerPanelOpened'));
  window.close();
}

function refreshBlockDiagnostics() {
  return blockDiagnosticsPanel.refresh();
}

function renderPomodoroTimeline(payload) {
  const list = document.getElementById('pomodoroTimelineList');
  const runtime = payload?.runtime || {};
  const status = payload?.timerStatus || {};
  const activityStatus = payload?.activityStatus || {};
  const phase = status.phase || runtime.phase || 'idle';
  const settings = status.settings || {};
  const upcomingBreakMs = getBreakDurationMs(phase, settings, status.completedWorkSessions || 0);
  const rawRestCreditMs = Number(status.restCreditMs || 0);
  const restCreditMs = upcomingBreakMs > 0
    ? Math.min(rawRestCreditMs, upcomingBreakMs)
    : rawRestCreditMs;
  const restStillNeededMs = Math.max(0, upcomingBreakMs - restCreditMs);
  const historyTotals = payload?.history?.totals || {};
  const suppressionText = getPomodoroAutoStartSuppressionText(payload);
  const rows = [];

  if (payload?.protectedScheduleActive) {
    rows.push(createTimelineRow(
      getMessage('popupPomodoroProtectedScheduleControls'),
      getMessage('popupPomodoroProtectedScheduleReason')
    ));
  }

  if (phase === 'work') {
    rows.push(createTimelineRow(getMessage('pomodoroWorkStartedLabel', 'Work started'), formatClock(runtime.phaseStartedAt)));
    rows.push(createTimelineRow(getMessage('pomodoroNextBreakLabel', 'Next break'), formatClock(runtime.phaseEndsAt)));
    rows.push(createTimelineRow(getMessage('pomodoroRequiredRestLabel', 'Required rest'), formatDuration(upcomingBreakMs)));
    rows.push(createTimelineRow(getMessage('pomodoroRestCreditedLabel', 'Rest already credited'), formatDuration(restCreditMs)));
    rows.push(createTimelineRow(getMessage('pomodoroRestStillNeededLabel', 'Rest still needed'), formatDuration(restStillNeededMs)));
    if (upcomingBreakMs > 0 && restStillNeededMs <= 0) {
      rows.push(createTimelineRow(getMessage('pomodoroReturnBehaviorLabel'), getMessage('pomodoroReturnStartsNewWork')));
    }
  } else if (phase === 'shortBreak' || phase === 'longBreak') {
    rows.push(createTimelineRow(getMessage('pomodoroBreakStartedLabel', 'Break started'), formatClock(runtime.phaseStartedAt)));
    rows.push(createTimelineRow(getMessage('pomodoroBreakEndsLabel', 'Break ends'), formatClock(runtime.phaseEndsAt)));
    rows.push(createTimelineRow(getMessage('pomodoroRequiredRestLabel', 'Required rest'), formatDuration(upcomingBreakMs)));
    rows.push(createTimelineRow(getMessage('pomodoroNextWorkLabel', 'Next work'), getMessage('pomodoroNextWorkAfterRestLabel', 'after rest is done')));
  } else if (phase === 'completed') {
    rows.push(createTimelineRow(getMessage('pomodoroRestSatisfiedLabel', 'Rest satisfied'), formatClock(runtime.phaseStartedAt || runtime.lastCompletedAt)));
    rows.push(createTimelineRow(getMessage('pomodoroNextWorkLabel', 'Next work'), getMessage('pomodoroNextWorkOnActivityLabel', 'when activity returns')));
    rows.push(createTimelineRow(getMessage('pomodoroCompletedBlocksLabel', 'Completed work blocks'), String(status.completedWorkSessions || 0)));
  } else if (phase === 'paused') {
    rows.push(createTimelineRow(getMessage('pomodoroPausedAtLabel', 'Paused at'), formatClock(runtime.pausedAt)));
    rows.push(createTimelineRow(getMessage('pomodoroPausedPhaseLabel', 'Paused phase'), runtime.pausedPhase || '--'));
    rows.push(createTimelineRow(getMessage('pomodoroRemainingLabel', 'Remaining'), status.remainingText || '--'));
  } else {
    rows.push(createTimelineRow(
      getMessage('pomodoroTimerStateLabel', 'Timer state'),
      payload?.canStart ? getMessage('pomodoroReadyToStartLabel', 'ready to start') : getMessage('popupNoActivePlan')
    ));
    rows.push(createTimelineRow(
      getMessage('pomodoroConfiguredCycleLabel', 'Configured cycle'),
      getMessage('popupConfiguredCycle', [Number(settings.workMinutes || 0), Number(settings.shortBreakMinutes || 0)])
    ));
  }

  if (activityStatus.stateLabel) {
    rows.push(createTimelineRow(getMessage('popupActivityStateLabel', 'System state'), formatPomodoroActivityText(activityStatus, false)));
    rows.push(createTimelineRow(
      getMessage('popupLastActivityLabel', 'Last activity'),
      activityStatus.idleForText === 'unknown'
        ? getMessage('popupUnknownLabel')
        : getMessage('popupLastActivityAgo', [activityStatus.idleForText])
    ));
  }

  if (suppressionText) {
    rows.push(createTimelineRow(getMessage('popupAutoStartTimelineLabel'), suppressionText));
  }

  rows.push(createTimelineRow(getMessage('pomodoroHistoryTodayLabel'), [
    getMessage('pomodoroHistoryWorkSessionsLabel'),
    String(historyTotals.workSessionsCompleted || 0)
  ].join(': ')));
  rows.push(createTimelineRow(getMessage('pomodoroHistoryCreditedRestLabel'), formatDuration(historyTotals.creditedRestMs || 0)));
  rows.push(createTimelineRow(getMessage('pomodoroHistorySkippedBreaksLabel'), String(historyTotals.skippedBreaks || 0)));

  list.replaceChildren(...rows);
}

function formatPomodoroActivityText(activityStatus = {}, includeActiveToday = true) {
  const stateLabel = activityStatus.stateLabel || getMessage('popupActivityUnknownLabel');
  const isSystemAway = activityStatus.systemState === 'idle' || activityStatus.systemState === 'locked';
  const stateDuration = activityStatus.systemStateForText || getMessage('popupUnknownLabel');
  const activeToday = activityStatus.activeTodayText || '0s';
  const stateText = isSystemAway
    ? getMessage('popupStateForDuration', [stateLabel, stateDuration])
    : getMessage('popupStateLastActivity', [stateLabel, activityStatus.idleForText || getMessage('popupUnknownLabel')]);

  return includeActiveToday ? getMessage('popupActivityWithActiveToday', [stateText, activeToday]) : stateText;
}

function refreshIntentDiagnostics() {
  return intentDiagnosticsPanel.refresh();
}

function clearIntentDiagnostics() {
  return intentDiagnosticsPanel.clear();
}

function renderPomodoroState(payload) {
  latestPomodoroPayload = payload || null;
  const phase = payload?.timerStatus?.phase || 'idle';
  const phaseLabel = payload?.timerStatus?.phaseLabel || getMessage('popupIdleLabel');
  const remainingText = payload?.timerStatus?.remainingText || '0:00';
  const completedWorkSessions = payload?.timerStatus?.completedWorkSessions || 0;
  const planName = payload?.plan?.name || getMessage('popupNoActivePomodoroPlan');
  const activityStatus = payload?.activityStatus;
  const isRunning = POMODORO_RUNNING_PHASES.has(phase);
  const isPaused = phase === 'paused';
  const isIdle = phase === 'idle';
  const isCompleted = phase === 'completed';
  const canStart = isIdle || isCompleted;
  const suppressionText = getPomodoroAutoStartSuppressionText(payload);
  const phaseBadge = document.getElementById('pomodoroPhaseText');
  const protectedScheduleActive = Boolean(payload?.protectedScheduleActive);
  const protectedScheduleReason = getMessage('popupPomodoroProtectedScheduleReason');

  phaseBadge.textContent = phaseLabel;
  phaseBadge.dataset.state = phase;
  document.getElementById('pomodoroRemainingText').textContent = remainingText;
  setTextWithTitle('pomodoroPlanText', planName);
  setTextWithTitle(
    'pomodoroSessionText',
    [
      getMessage('popupWorkSessionsCompleted', [completedWorkSessions]),
      getPomodoroPolicyText(payload),
      suppressionText
    ].filter(Boolean).join(' · ')
  );
  setTextWithTitle(
    'pomodoroActivityText',
    activityStatus ? formatPomodoroActivityText(activityStatus) : getMessage('popupActivityUnknownLabel')
  );
  renderPomodoroTimeline(payload);

  const startButton = document.getElementById('startPomodoroButton');
  const pauseButton = document.getElementById('pausePomodoroButton');
  const resumeButton = document.getElementById('resumePomodoroButton');
  const resetButton = document.getElementById('resetPomodoroButton');

  startButton.disabled = !payload?.canStart || !canStart;
  pauseButton.disabled = protectedScheduleActive || !isRunning;
  resumeButton.disabled = !isPaused;
  resetButton.disabled = protectedScheduleActive || isIdle;
  pauseButton.title = protectedScheduleActive ? protectedScheduleReason : '';
  resetButton.title = protectedScheduleActive ? protectedScheduleReason : '';
  renderProtectionSummary();
}

async function refreshPomodoroState() {
  const payload = await sendRuntimeMessage({ action: 'getPomodoroState' });
  renderPomodoroState(payload);
}

async function runPomodoroCommand(action) {
  const response = await sendRuntimeMessage({ action });
  if (response?.status === 'error') {
    setStatus(response.reason || getMessage('popupPomodoroActionFailed'));
    await refreshPomodoroState();
    return;
  }

  if (action === 'resetPomodoro') {
    const activeTab = await getActiveTab();
    if (activeTab?.id && !isExtensionPage(activeTab.url)) {
      await sendTabMessage(activeTab.id, { action: 'clearPomodoroStrictBreakBlock' });
    }
  }

  renderPomodoroState(response);
  await refreshBlockDiagnostics();
}

function getElementText(elementId) {
  return document.getElementById(elementId)?.textContent || '';
}

function getCompactPomodoroDiagnostics(payload = latestPomodoroPayload) {
  if (!payload) {
    return null;
  }

  return {
    runtime: payload.runtime || null,
    timerStatus: payload.timerStatus || null,
    plan: payload.plan ? {
      id: payload.plan.id,
      name: payload.plan.name,
      active: payload.plan.active,
      pomodoro: payload.plan.pomodoro
    } : null,
    activityStatus: payload.activityStatus || null,
    history: payload.history || null,
    canStart: Boolean(payload.canStart),
    autoStartSuppression: payload.autoStartSuppression || null
  };
}

function buildPopupDiagnosticsPayload() {
  const pageSummary = getProtectionPageSummary();
  const pomodoroSummary = getPomodoroSummary();
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
    pomodoro: getCompactPomodoroDiagnostics(),
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
          renderPomodoroState(latestPomodoroPayload);
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
  document.getElementById('openPomodoroPanelButton').addEventListener('click', openPomodoroMiniPanel);
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
