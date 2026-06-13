// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  detachIntentTabLineageEntries,
  getIntentChainReturnTabIds,
  getIntentDriftDescendantTabIds,
  recordIntentNavigationTransition,
  recordIntentTabActivation,
  recordIntentTabCreated,
  recordIntentTabRemoved
} from '../../shared/intentCoherence.js';
import {
  discardTabs,
  getOpenTabIds,
  moveTabsToNewWindow,
  removeTabs,
  updateTabsUrl
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

export async function closeIntentQuarantinedCurrentTab(currentTabId) {
  const normalizedTabId = Number(currentTabId);
  if (!Number.isFinite(normalizedTabId)) {
    return {
      status: 'closed',
      closedCount: 0,
      tabIds: []
    };
  }

  let state = await readIntentState();
  const openTabIds = await getOpenTabIds();
  if (openTabIds && !openTabIds.has(normalizedTabId)) {
    return {
      status: 'closed',
      closedCount: 0,
      tabIds: []
    };
  }

  await removeTabs([normalizedTabId]);
  state = recordIntentTabRemoved(state, normalizedTabId);
  await saveIntentState(state);

  return {
    status: 'closed',
    closedCount: 1,
    tabIds: [normalizedTabId]
  };
}

export async function suspendIntentDriftDescendantTabs(currentTabId, options = {}) {
  const state = await readIntentState();
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
      status: 'suspended',
      suspendedCount: 0,
      failedCount: 0,
      tabIds: [],
      failedTabIds: []
    };
  }

  const result = await discardTabs(existingTargetTabIds);
  const suspendedCount = result.discardedTabIds.length;
  const failedCount = result.failedTabIds.length;

  return {
    status: suspendedCount > 0 || failedCount === 0 ? 'suspended' : 'error',
    suspendedCount,
    failedCount,
    tabIds: result.discardedTabIds,
    failedTabIds: result.failedTabIds
  };
}

export async function moveIntentDriftDescendantTabsToWindow(currentTabId, options = {}) {
  const state = await readIntentState();
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
      status: 'moved',
      movedCount: 0,
      failedCount: 0,
      tabIds: [],
      failedTabIds: [],
      windowId: null
    };
  }

  const result = await moveTabsToNewWindow(existingTargetTabIds);
  const movedCount = result.movedTabIds.length;
  const failedCount = result.failedTabIds.length;

  return {
    status: movedCount > 0 || failedCount === 0 ? 'moved' : 'error',
    movedCount,
    failedCount,
    tabIds: result.movedTabIds,
    failedTabIds: result.failedTabIds,
    windowId: result.windowId
  };
}

export async function returnIntentDriftDescendantTabs(currentTabId, recoveryUrl, options = {}) {
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
      status: 'returned',
      returnedCount: 0,
      failedCount: 0,
      tabIds: [],
      failedTabIds: []
    };
  }

  const result = await updateTabsUrl(existingTargetTabIds, recoveryUrl);
  const returnedCount = result.updatedTabIds.length;
  const failedCount = result.failedTabIds.length;

  if (returnedCount > 0) {
    state = detachIntentTabLineageEntries(state, result.updatedTabIds);
    await saveIntentState(state);
  }

  return {
    status: returnedCount > 0 || failedCount === 0 ? 'returned' : 'error',
    returnedCount,
    failedCount,
    tabIds: result.updatedTabIds,
    failedTabIds: result.failedTabIds
  };
}

export async function returnIntentQuarantinedChain(currentTabId, recoveryUrl) {
  let state = await readIntentState();
  const targetTabIds = getIntentChainReturnTabIds(state, { currentTabId });
  const openTabIds = await getOpenTabIds();
  const existingTargetTabIds = openTabIds
    ? targetTabIds.filter(tabId => openTabIds.has(tabId))
    : targetTabIds;

  if (existingTargetTabIds.length === 0) {
    return {
      status: 'returned',
      returnedCount: 0,
      failedCount: 0,
      tabIds: [],
      failedTabIds: []
    };
  }

  const result = await updateTabsUrl(existingTargetTabIds, recoveryUrl);
  const returnedCount = result.updatedTabIds.length;
  const failedCount = result.failedTabIds.length;

  if (returnedCount > 0) {
    state = detachIntentTabLineageEntries(state, result.updatedTabIds);
    await saveIntentState(state);
  }

  return {
    status: returnedCount > 0 || failedCount === 0 ? 'returned' : 'error',
    returnedCount,
    failedCount,
    tabIds: result.updatedTabIds,
    failedTabIds: result.failedTabIds
  };
}
