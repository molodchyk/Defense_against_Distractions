// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  INTENT_TRAJECTORY_STORAGE_KEY,
  applyIntentFeedbackCalibration,
  createIntentTrajectoryState,
  getActiveIntentSession,
  getIntentDriftDescendantTabIds,
  getIntentInterventionDecision,
  getIntentSessionForTab,
  recordIntentFeedback,
  recordIntentNavigationTransition,
  recordIntentPageVisit,
  recordIntentTabActivation,
  recordIntentTabCreated,
  recordIntentTabRemoved,
  summarizeIntentFeedback
} from '../shared/intentCoherence.js';
import {
  PLANS_STORAGE_KEY,
  getEffectiveIntentPolicyForUrl
} from '../shared/plans.js';
import {
  POMODORO_RUNTIME_STORAGE_KEY,
  normalizePomodoroRuntime
} from '../shared/pomodoro.js';
import {
  USAGE_STATS_STORAGE_KEY,
  createUsageStatsState,
  normalizeUsageStats,
  recordUsagePageSignal,
  summarizeUsageStats
} from '../shared/usageStats.js';

function getSync(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(keys, result => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve(result);
    });
  });
}

function getLocal(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, result => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve(result);
    });
  });
}

function setLocal(items) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve();
    });
  });
}

function getTabPressure() {
  return new Promise(resolve => {
    if (!chrome.tabs?.query) {
      resolve({});
      return;
    }

    chrome.tabs.query({}, tabs => {
      if (chrome.runtime.lastError || !Array.isArray(tabs)) {
        resolve({});
        return;
      }

      resolve({
        tabCount: tabs.length,
        windowCount: new Set(tabs
          .map(tab => Number(tab.windowId))
          .filter(Number.isFinite)).size
      });
    });
  });
}

function getOpenTabIds() {
  return new Promise(resolve => {
    if (!chrome.tabs?.query) {
      resolve(null);
      return;
    }

    chrome.tabs.query({}, tabs => {
      if (chrome.runtime.lastError || !Array.isArray(tabs)) {
        resolve(null);
        return;
      }

      resolve(new Set(tabs.map(tab => Number(tab.id)).filter(Number.isFinite)));
    });
  });
}

function removeTabs(tabIds = []) {
  const normalizedTabIds = [...new Set(tabIds.map(Number).filter(Number.isFinite))];
  if (normalizedTabIds.length === 0 || !chrome.tabs?.remove) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    chrome.tabs.remove(normalizedTabIds, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve();
    });
  });
}

async function updateIntentState(updater) {
  const items = await getLocal(INTENT_TRAJECTORY_STORAGE_KEY);
  const currentState = items[INTENT_TRAJECTORY_STORAGE_KEY] || createIntentTrajectoryState();
  const nextState = updater(currentState);
  await setLocal({ [INTENT_TRAJECTORY_STORAGE_KEY]: nextState });
  return nextState;
}

async function updateUsageStats(updater) {
  const items = await getLocal(USAGE_STATS_STORAGE_KEY);
  const currentState = items[USAGE_STATS_STORAGE_KEY] || createUsageStatsState();
  const nextState = updater(currentState);
  await setLocal({ [USAGE_STATS_STORAGE_KEY]: nextState });
  return nextState;
}

async function getIntentPolicyForSignal(signal = {}) {
  const [syncItems, localItems] = await Promise.all([
    getSync(PLANS_STORAGE_KEY),
    getLocal(POMODORO_RUNTIME_STORAGE_KEY)
  ]);

  return getEffectiveIntentPolicyForUrl(syncItems, signal.url, {
    pomodoroRuntime: normalizePomodoroRuntime(localItems[POMODORO_RUNTIME_STORAGE_KEY])
  });
}

function getFeedbackSummaryForState(state = {}) {
  return summarizeIntentFeedback(Array.isArray(state?.feedback) ? state.feedback : []);
}

function applyFeedbackCalibrationToPolicy(intentPolicy = {}, state = {}) {
  const feedbackSummary = getFeedbackSummaryForState(state);
  const baselineSettings = intentPolicy.settings || {};
  const settings = applyIntentFeedbackCalibration(baselineSettings, feedbackSummary);

  return {
    ...intentPolicy,
    baselineSettings,
    settings,
    feedbackSummary,
    calibration: settings.calibration
  };
}

async function recordPageSignals(message, sender, options = {}) {
  const baseIntentPolicy = await getIntentPolicyForSignal(message.signals || {});
  const state = await updateIntentState(currentState => recordIntentPageVisit(currentState, message.signals, {
    tabId: sender.tab?.id,
    frameId: sender.frameId,
    intentSettings: applyFeedbackCalibrationToPolicy(baseIntentPolicy, currentState).settings,
    planIds: baseIntentPolicy.planIds,
    planNames: baseIntentPolicy.planNames,
    policySource: baseIntentPolicy.source,
    ...options
  }));
  const intentPolicy = applyFeedbackCalibrationToPolicy(baseIntentPolicy, state);
  let usageSummary = null;
  try {
    const tabPressure = await getTabPressure();
    const usageState = await updateUsageStats(currentState => recordUsagePageSignal(currentState, message.signals, {
      tabId: sender.tab?.id,
      frameId: sender.frameId,
      documentId: sender.documentId,
      tabCount: tabPressure.tabCount,
      windowCount: tabPressure.windowCount
    }));
    usageSummary = summarizeUsageStats(usageState);
  } catch (error) {
    console.error('Failed to record local usage stats:', error);
  }
  return {
    state,
    intentPolicy,
    usageSummary
  };
}

function recordActiveTab(tabId) {
  return updateIntentState(state => recordIntentTabActivation(state, tabId));
}

function recordCreatedTab(tab) {
  return updateIntentState(state => recordIntentTabCreated(state, tab));
}

function recordRemovedTab(tabId) {
  return updateIntentState(state => recordIntentTabRemoved(state, tabId));
}

function recordNavigationTransition(details = {}, transitionSource = '') {
  if (details.frameId !== 0) {
    return Promise.resolve(null);
  }

  return updateIntentState(state => recordIntentNavigationTransition(state, {
    tabId: details.tabId,
    frameId: details.frameId,
    url: details.url,
    transitionType: details.transitionType,
    transitionQualifiers: details.transitionQualifiers,
    transitionSource
  }));
}

function recordFeedback(message = {}, sender = {}) {
  return updateIntentState(state => recordIntentFeedback(state, message.feedback || {}, {
    tabId: sender.tab?.id
  }));
}

async function closeIntentDriftDescendantTabs(currentTabId, options = {}) {
  const items = await getLocal(INTENT_TRAJECTORY_STORAGE_KEY);
  let state = items[INTENT_TRAJECTORY_STORAGE_KEY] || createIntentTrajectoryState();
  const targetTabIds = getIntentDriftDescendantTabIds(state, {
    currentTabId,
    includeCurrent: options.includeCurrent === true
  });
  const openTabIds = await getOpenTabIds();
  const existingTargetTabIds = openTabIds
    ? targetTabIds.filter(tabId => openTabIds.has(tabId))
    : targetTabIds;

  if (existingTargetTabIds.length === 0) {
    return {
      status: 'closed',
      closedCount: 0,
      tabIds: []
    };
  }

  await removeTabs(existingTargetTabIds);
  existingTargetTabIds.forEach(tabId => {
    state = recordIntentTabRemoved(state, tabId);
  });
  await setLocal({ [INTENT_TRAJECTORY_STORAGE_KEY]: state });

  return {
    status: 'closed',
    closedCount: existingTargetTabIds.length,
    tabIds: existingTargetTabIds
  };
}

function getIntentDebugState(tabId = null) {
  return getLocal(INTENT_TRAJECTORY_STORAGE_KEY).then(items => {
    const state = items[INTENT_TRAJECTORY_STORAGE_KEY] || createIntentTrajectoryState();
    const activeSession = getIntentSessionForTab(state, tabId);
    const visits = Array.isArray(activeSession?.visits) ? activeSession.visits : [];
    const latestVisit = visits[visits.length - 1] || null;
    return getIntentPolicyForSignal(latestVisit || {}).then(baseIntentPolicy => {
      const intentPolicy = applyFeedbackCalibrationToPolicy(baseIntentPolicy, state);
      return {
        state,
        activeSession,
        intentPolicy,
        feedbackSummary: intentPolicy.feedbackSummary,
        intervention: getIntentInterventionDecision(activeSession, {
          intentSettings: intentPolicy.settings
        })
      };
    });
  });
}

function getIntentInterventionState(tabId = null) {
  return getIntentDebugState(tabId).then(debugState => ({
    status: 'ok',
    intervention: debugState.intervention,
    activeSession: debugState.activeSession
  }));
}

function clearIntentDebugState() {
  const nextState = createIntentTrajectoryState();
  return setLocal({ [INTENT_TRAJECTORY_STORAGE_KEY]: nextState }).then(() => nextState);
}

function getUsageStatsState() {
  return getLocal(USAGE_STATS_STORAGE_KEY).then(items => {
    const state = normalizeUsageStats(items[USAGE_STATS_STORAGE_KEY] || createUsageStatsState());
    return {
      state,
      summary: summarizeUsageStats(state)
    };
  });
}

function clearUsageStatsState() {
  const state = createUsageStatsState();
  return setLocal({ [USAGE_STATS_STORAGE_KEY]: state }).then(() => ({
    state,
    summary: summarizeUsageStats(state)
  }));
}

export function initializeIntentCoherence() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'recordIntentPageSignals') {
      recordPageSignals(message, sender)
        .then(({ state, intentPolicy }) => {
          const activeSession = getActiveIntentSession(state);
          sendResponse({
            status: 'recorded',
            intentPolicy,
            coherenceScore: activeSession?.coherenceScore ?? null,
            riskState: activeSession?.riskState ?? null
          });
        })
        .catch(error => {
          console.error('Failed to record intent page signals:', error);
          sendResponse({ status: 'error' });
        });
      return true;
    }

    if (message.action === 'getIntentDebugState') {
      getIntentDebugState(message.tabId)
        .then(sendResponse)
        .catch(error => {
          console.error('Failed to read intent debug state:', error);
          sendResponse({ state: createIntentTrajectoryState(), activeSession: null });
        });
      return true;
    }

    if (message.action === 'getUsageStats') {
      getUsageStatsState()
        .then(sendResponse)
        .catch(error => {
          console.error('Failed to read local usage stats:', error);
          sendResponse({
            state: createUsageStatsState(),
            summary: summarizeUsageStats(createUsageStatsState())
          });
        });
      return true;
    }

    if (message.action === 'clearUsageStats') {
      clearUsageStatsState()
        .then(result => sendResponse({ status: 'cleared', ...result }))
        .catch(error => {
          console.error('Failed to clear local usage stats:', error);
          sendResponse({ status: 'error' });
        });
      return true;
    }

    if (message.action === 'getIntentInterventionState') {
      getIntentInterventionState(sender.tab?.id)
        .then(sendResponse)
        .catch(error => {
          console.error('Failed to read intent intervention state:', error);
          sendResponse({
            status: 'error',
            intervention: getIntentInterventionDecision(null),
            activeSession: null
          });
        });
      return true;
    }

    if (message.action === 'recordIntentFeedback') {
      recordFeedback(message, sender)
        .then(state => {
          sendResponse({
            status: 'recorded',
            feedbackCount: Array.isArray(state.feedback) ? state.feedback.length : 0
          });
        })
        .catch(error => {
          console.error('Failed to record intent feedback:', error);
          sendResponse({ status: 'error' });
        });
      return true;
    }

    if (message.action === 'isolateIntentCurrentPage') {
      Promise.resolve(message.feedback ? recordFeedback(message, sender) : null)
        .catch(error => {
          console.error('Failed to record intent isolate feedback:', error);
        })
        .then(() => recordPageSignals(message, sender, { forceNewSession: true, isolateTab: true }))
        .then(({ state, intentPolicy }) => {
          const activeSession = getActiveIntentSession(state);
          sendResponse({
            status: 'isolated',
            intentPolicy,
            activeSession,
            intervention: getIntentInterventionDecision(activeSession, {
              intentSettings: intentPolicy.settings
            })
          });
        })
        .catch(error => {
          console.error('Failed to isolate intent page:', error);
          sendResponse({ status: 'error' });
        });
      return true;
    }

    if (message.action === 'closeIntentDriftDescendantTabs') {
      closeIntentDriftDescendantTabs(sender.tab?.id, {
        includeCurrent: message.includeCurrent === true
      })
        .then(sendResponse)
        .catch(error => {
          console.error('Failed to close intent drift descendant tabs:', error);
          sendResponse({
            status: 'error',
            closedCount: 0,
            tabIds: []
          });
        });
      return true;
    }

    if (message.action === 'clearIntentDebugState') {
      clearIntentDebugState()
        .then(state => sendResponse({ status: 'cleared', state, activeSession: null }))
        .catch(error => {
          console.error('Failed to clear intent debug state:', error);
          sendResponse({ status: 'error' });
        });
      return true;
    }

    return false;
  });

  chrome.tabs.onActivated.addListener(activeInfo => {
    recordActiveTab(activeInfo.tabId).catch(error => {
      console.error('Failed to record active tab:', error);
    });
  });

  chrome.tabs.onCreated.addListener(tab => {
    recordCreatedTab(tab).catch(error => {
      console.error('Failed to record created tab lineage:', error);
    });
  });

  chrome.tabs.onRemoved.addListener(tabId => {
    recordRemovedTab(tabId).catch(error => {
      console.error('Failed to remove tab lineage:', error);
    });
  });

  if (chrome.webNavigation?.onCommitted) {
    chrome.webNavigation.onCommitted.addListener(details => {
      recordNavigationTransition(details, 'committed').catch(error => {
        console.error('Failed to record navigation transition:', error);
      });
    });
  }

  if (chrome.webNavigation?.onHistoryStateUpdated) {
    chrome.webNavigation.onHistoryStateUpdated.addListener(details => {
      recordNavigationTransition(details, 'historyState').catch(error => {
        console.error('Failed to record history navigation transition:', error);
      });
    });
  }
}
