// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  getIntentDriftDescendantTabIds,
  recordIntentNavigationTransition,
  recordIntentTabActivation,
  recordIntentTabCreated,
  recordIntentTabRemoved
} from '../../shared/intentCoherence.js';
import {
  getOpenTabIds,
  removeTabs
} from './chromeApi.js';
import {
  readIntentState,
  saveIntentState,
  updateIntentState
} from './storage.js';

export function recordActiveTab(tabId) {
  return updateIntentState(state => recordIntentTabActivation(state, tabId));
}

export function recordCreatedTab(tab) {
  return updateIntentState(state => recordIntentTabCreated(state, tab));
}

export function recordRemovedTab(tabId) {
  return updateIntentState(state => recordIntentTabRemoved(state, tabId));
}

export function recordNavigationTransition(details = {}, transitionSource = '') {
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

export async function closeIntentDriftDescendantTabs(currentTabId, options = {}) {
  let state = await readIntentState();
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
  await saveIntentState(state);

  return {
    status: 'closed',
    closedCount: existingTargetTabIds.length,
    tabIds: existingTargetTabIds
  };
}
