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
  closeIntentDriftDescendantTabs
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
}
