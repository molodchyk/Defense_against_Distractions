// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  registerIntentRuntimeMessages
} from './messages.js';
import {
  recordActiveTab,
  recordCreatedTab,
  recordNavigationTransition,
  recordRemovedTab
} from './tabs.js';

export function initializeIntentCoherence() {
  registerIntentRuntimeMessages();

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
