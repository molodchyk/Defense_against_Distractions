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
import {
  addCommittedNavigationListener,
  addHistoryStateUpdatedNavigationListener
} from '../../../platform/chrome/navigation.js';
import {
  addTabActivatedListener,
  addTabCreatedListener,
  addTabRemovedListener
} from '../../../platform/chrome/tabs.js';

export function initializeIntentCoherence() {
  registerIntentRuntimeMessages();

  addTabActivatedListener(activeInfo => {
    recordActiveTab(activeInfo.tabId).catch(error => {
      console.error('Failed to record active tab:', error);
    });
  });

  addTabCreatedListener(tab => {
    recordCreatedTab(tab).catch(error => {
      console.error('Failed to record created tab lineage:', error);
    });
  });

  addTabRemovedListener(tabId => {
    recordRemovedTab(tabId).catch(error => {
      console.error('Failed to remove tab lineage:', error);
    });
  });

  addCommittedNavigationListener(details => {
    recordNavigationTransition(details, 'committed').catch(error => {
      console.error('Failed to record navigation transition:', error);
    });
  });

  addHistoryStateUpdatedNavigationListener(details => {
    recordNavigationTransition(details, 'historyState').catch(error => {
      console.error('Failed to record history navigation transition:', error);
    });
  });
}
