// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  openActionPopup
} from '../../platform/chrome/action.js';
import {
  addContextMenuClickedListener,
  canUseContextMenus,
  createContextMenu,
  removeAllContextMenus
} from '../../platform/chrome/contextMenus.js';
import {
  getMessage
} from '../../platform/chrome/i18n.js';
import {
  getLocal,
  removeLocal,
  setLocal
} from '../../platform/chrome/storage.js';
import {
  createSelectedTextCandidateFromText,
  normalizeSelectedTextCandidate
} from '../../features/selected-text/candidate.js';

export const SELECTED_TEXT_QUICK_ADD_MENU_ID = 'dad-selected-text-quick-add';
export const PENDING_SELECTED_TEXT_QUICK_ADD_KEY = 'pendingSelectedTextQuickAdd';
export const CONSUME_PENDING_SELECTED_TEXT_QUICK_ADD_ACTION = 'consumePendingSelectedTextQuickAdd';
export const PENDING_SELECTED_TEXT_QUICK_ADD_MAX_AGE_MS = 5 * 60 * 1000;

export function createSelectedTextQuickAddBackgroundRuntime({
  addClickedListener = addContextMenuClickedListener,
  canUseMenus = canUseContextMenus,
  createMenu = createContextMenu,
  getLocalStorage = getLocal,
  getMenuTitle = getSelectedTextQuickAddMenuTitle,
  now = () => Date.now(),
  openPopup = openActionPopup,
  removeAllMenus = removeAllContextMenus,
  removeLocalStorage = removeLocal,
  setLocalStorage = setLocal
} = {}) {
  function initialize() {
    if (!canUseMenus()) {
      return () => {};
    }

    removeAllMenus()
      .catch(() => {})
      .then(() => createMenu({
        id: SELECTED_TEXT_QUICK_ADD_MENU_ID,
        title: getMenuTitle(),
        contexts: ['selection']
      }))
      .catch(() => {});

    return addClickedListener(handleContextMenuClicked);
  }

  async function handleContextMenuClicked(info = {}, tab = {}) {
    if (info.menuItemId !== SELECTED_TEXT_QUICK_ADD_MENU_ID) {
      return false;
    }

    const url = String(tab?.url || info.pageUrl || '');
    const candidate = createSelectedTextCandidateFromText(info.selectionText, {
      host: getHostname(url),
      insideEditable: info.editable === true,
      source: 'contextMenuSelection'
    });
    if (!candidate) {
      return false;
    }

    await setLocalStorage({
      [PENDING_SELECTED_TEXT_QUICK_ADD_KEY]: {
        candidate,
        createdAt: now(),
        frameId: Number.isInteger(info.frameId) ? info.frameId : null,
        frameUrl: String(info.frameUrl || ''),
        tabId: Number.isInteger(tab?.id) ? tab.id : null,
        url
      }
    });

    await openPopup(Number.isInteger(tab?.windowId) ? { windowId: tab.windowId } : undefined);
    return true;
  }

  function handleRuntimeMessage(message, sender, sendResponse) {
    if (message?.action !== CONSUME_PENDING_SELECTED_TEXT_QUICK_ADD_ACTION) {
      return false;
    }

    consumePendingCandidate(message)
      .then(response => sendResponse(response))
      .catch(() => sendResponse({ candidate: null }));
    return true;
  }

  async function consumePendingCandidate(request = {}) {
    const items = await getLocalStorage(PENDING_SELECTED_TEXT_QUICK_ADD_KEY);
    const pending = items?.[PENDING_SELECTED_TEXT_QUICK_ADD_KEY] || null;
    if (!pending) {
      return { candidate: null };
    }

    if (isExpiredPendingCandidate(pending, now())) {
      await removeLocalStorage(PENDING_SELECTED_TEXT_QUICK_ADD_KEY);
      return { candidate: null };
    }

    if (!matchesRequestContext(pending, request)) {
      return { candidate: null };
    }

    const candidate = normalizeSelectedTextCandidate(pending.candidate);
    await removeLocalStorage(PENDING_SELECTED_TEXT_QUICK_ADD_KEY);
    return {
      candidate,
      source: 'contextMenuSelection',
      tab: {
        id: pending.tabId,
        url: pending.url
      }
    };
  }

  return {
    consumePendingCandidate,
    handleContextMenuClicked,
    handleRuntimeMessage,
    initialize
  };
}

function getSelectedTextQuickAddMenuTitle() {
  return getMessage('contextMenuAddSelectedText') || 'Add "%s" to DaD';
}

function getHostname(url) {
  try {
    return new URL(url).hostname;
  } catch (error) {
    return '';
  }
}

function isExpiredPendingCandidate(pending, timestamp) {
  const createdAt = Number(pending?.createdAt);
  return !Number.isFinite(createdAt) || timestamp - createdAt > PENDING_SELECTED_TEXT_QUICK_ADD_MAX_AGE_MS;
}

function matchesRequestContext(pending, request) {
  const requestTabId = Number(request?.tabId);
  if (Number.isInteger(requestTabId) && requestTabId > 0 && pending.tabId === requestTabId) {
    return true;
  }

  const requestUrl = String(request?.url || '');
  return Boolean(requestUrl && pending.url && requestUrl === pending.url);
}
