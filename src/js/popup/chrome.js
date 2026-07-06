// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { getSync } from '../../platform/chrome/storage.js';
import { getExtensionUrl, openOptionsPage } from '../../platform/chrome/runtime.js';
import { sendRuntimeMessage as sendChromeRuntimeMessage } from '../../platform/chrome/runtimeMessages.js';
import {
  canCreateTab,
  createTab,
  getActiveCurrentWindowTab,
  sendTabMessage as sendChromeTabMessage,
  updateTab
} from '../../platform/chrome/tabs.js';

export async function getActiveTab() {
  try {
    return await getActiveCurrentWindowTab();
  } catch {
    return null;
  }
}

export async function getSyncStorage(keys) {
  try {
    return await getSync(keys);
  } catch (error) {
    return null;
  }
}

export function isExtensionPage(url) {
  return Boolean(url && url.startsWith(getExtensionUrl('')));
}

export function getOptionsPagePath(panelId = '') {
  const normalizedPanelId = String(panelId || '').trim().replace(/^#/, '');
  return normalizedPanelId ? `src/options.html#${normalizedPanelId}` : 'src/options.html';
}

export function getPlanActionsPanelId(planId = '', options = {}) {
  const normalizedPlanId = String(planId || '').trim();
  if (!normalizedPlanId) {
    return 'plansPanel';
  }

  const params = new URLSearchParams({
    planId: normalizedPlanId,
    view: 'actions'
  });
  const triggerFilter = String(options.triggerFilter || '').trim();
  if (triggerFilter) {
    params.set('triggerType', String(options.triggerType || 'keywordBlock').trim() || 'keywordBlock');
    params.set('triggerFilter', triggerFilter);
  }
  return `plansPanel?${params.toString()}`;
}

export function openOptions() {
  openOptionsPage();
  window.close();
}

export function openOptionsPanel(panelId) {
  if (canCreateTab()) {
    createTab({
      url: getExtensionUrl(getOptionsPagePath(panelId))
    }).catch(openOptionsPage);
  } else {
    openOptionsPage();
  }
  window.close();
}

export function openIntentDiagnostics() {
  openOptionsPanel('intentDiagnosticsPanel');
}

export function openPlanActions(planId, options) {
  openOptionsPanel(getPlanActionsPanelId(planId, options));
}

export function openFeedback() {
  createTab({
    url: 'https://github.com/molodchyk/Defense_against_Distractions/issues'
  }).catch(() => {});
  window.close();
}

export function sendRuntimeMessage(message) {
  return sendChromeRuntimeMessage(message);
}

export function sendTabMessage(tabId, message) {
  return sendChromeTabMessage(tabId, message, { frameId: 0 });
}

export async function updateTabUrl(tabId, url) {
  const tab = await updateTab(tabId, { url });
  return tab
    ? {
        status: 'updated',
        tab
      }
    : null;
}
