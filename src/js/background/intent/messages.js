// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  createIntentTrajectoryState,
  getActiveIntentSession,
  getIntentInterventionDecision
} from '../../shared/intentCoherence.js';
import {
  createUsageStatsState,
  summarizeUsageStats
} from '../../shared/usageStats.js';
import {
  FOCUS_STATE_STORAGE_KEY,
  createFocusStateSignal,
  normalizeFocusStateSignal
} from '../../shared/self-state/focusState.js';
import {
  clearIntentDebugState,
  clearUsageStatsState,
  getIntentDebugState,
  getIntentInterventionState,
  getUsageStatsState
} from './diagnostics.js';
import {
  recordFeedback,
  recordPageSignals
} from './pageSignals.js';
import {
  getLocal,
  setLocal,
  getTabPressure,
  openIntentDiagnosticsPage
} from './chromeApi.js';
import {
  closeIntentDriftDescendantTabs,
  moveIntentDriftDescendantTabsToWindow,
  returnIntentDriftDescendantTabs,
  suspendIntentDriftDescendantTabs
} from './tabs.js';

export function registerIntentRuntimeMessages() {
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

    if (message.action === 'getTabPressure') {
      getTabPressure()
        .then(tabPressure => {
          sendResponse({
            status: 'ok',
            tabPressure
          });
        })
        .catch(error => {
          console.error('Failed to read tab pressure:', error);
          sendResponse({
            status: 'error',
            tabPressure: {}
          });
        });
      return true;
    }

    if (message.action === 'getFocusStateSignal') {
      getLocal(FOCUS_STATE_STORAGE_KEY)
        .then(items => {
          sendResponse({
            status: 'ok',
            focusStateSignal: normalizeFocusStateSignal(items?.[FOCUS_STATE_STORAGE_KEY])
          });
        })
        .catch(error => {
          console.error('Failed to read focus state:', error);
          sendResponse({
            status: 'error',
            focusStateSignal: normalizeFocusStateSignal()
          });
        });
      return true;
    }

    if (message.action === 'setFocusStateSignal') {
      const focusStateSignal = createFocusStateSignal(message.level);
      setLocal({ [FOCUS_STATE_STORAGE_KEY]: focusStateSignal })
        .then(() => {
          sendResponse({
            status: 'saved',
            focusStateSignal
          });
        })
        .catch(error => {
          console.error('Failed to save focus state:', error);
          sendResponse({
            status: 'error',
            focusStateSignal: normalizeFocusStateSignal()
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

    if (message.action === 'openIntentDiagnostics') {
      openIntentDiagnosticsPage()
        .then(sendResponse)
        .catch(error => {
          console.error('Failed to open intent diagnostics:', error);
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
      closeIntentDriftDescendantTabs(sender.tab?.id ?? message.tabId, {
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

    if (message.action === 'suspendIntentDriftDescendantTabs') {
      suspendIntentDriftDescendantTabs(sender.tab?.id ?? message.tabId, {
        includeCurrent: message.includeCurrent === true
      })
        .then(sendResponse)
        .catch(error => {
          console.error('Failed to suspend intent drift descendant tabs:', error);
          sendResponse({
            status: 'error',
            suspendedCount: 0,
            failedCount: 0,
            tabIds: [],
            failedTabIds: []
          });
        });
      return true;
    }

    if (message.action === 'moveIntentDriftDescendantTabsToWindow') {
      moveIntentDriftDescendantTabsToWindow(sender.tab?.id ?? message.tabId, {
        includeCurrent: message.includeCurrent === true
      })
        .then(sendResponse)
        .catch(error => {
          console.error('Failed to move intent drift descendant tabs:', error);
          sendResponse({
            status: 'error',
            movedCount: 0,
            failedCount: 0,
            tabIds: [],
            failedTabIds: [],
            windowId: null
          });
        });
      return true;
    }

    if (message.action === 'returnIntentDriftDescendantTabs') {
      returnIntentDriftDescendantTabs(sender.tab?.id ?? message.tabId, message.recoveryUrl, {
        includeCurrent: message.includeCurrent === true
      })
        .then(sendResponse)
        .catch(error => {
          console.error('Failed to return intent drift descendant tabs:', error);
          sendResponse({
            status: 'error',
            returnedCount: 0,
            failedCount: 0,
            tabIds: [],
            failedTabIds: []
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
}
