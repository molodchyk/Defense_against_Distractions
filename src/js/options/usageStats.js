// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { buildUsageStatsExportPayload } from '../shared/usageStats.js';

const MAX_VISIBLE_DOMAINS = 8;

function sendRuntimeMessage(message) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage(message, response => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }

      resolve(response);
    });
  });
}

function getElement(id) {
  return document.getElementById(id);
}

function formatCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return '0';
  }

  return new Intl.NumberFormat().format(Math.max(0, Math.round(number)));
}

function formatDuration(value) {
  const totalSeconds = Math.max(0, Math.round(Number(value || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function createDomainItem(domain = {}) {
  const item = document.createElement('li');
  const title = document.createElement('strong');
  const meta = document.createElement('span');
  const media = domain.mediaMax || {};
  const interaction = domain.interactionMax || {};

  title.textContent = domain.hostname || '--';
  meta.textContent = [
    `${formatCount(domain.visits)} visits`,
    `${formatDuration(domain.activeMs)} active`,
    `${formatCount(domain.tabMax)} tabs max`,
    `${formatCount(media.videoCount)} videos`,
    `${formatCount(media.audioCount)} audio`,
    `${formatCount(media.gifCount)} GIFs`,
    `${formatCount(interaction.linkCount)} links`
  ].join(' · ');

  item.append(title, meta);
  return item;
}

function setUsageEmptyState(message = 'No local usage stats yet') {
  getElement('usageStatsStatus').textContent = message;
  getElement('usageStatsTodayVisits').textContent = '0';
  getElement('usageStatsTodayActive').textContent = '0s';
  getElement('usageStatsTodayDomains').textContent = '0';
  getElement('usageStatsTodayTabMax').textContent = '0';
  getElement('usageStatsTotalSamples').textContent = '0';
  getElement('usageStatsDomainList').replaceChildren();
}

function renderUsageStats(payload) {
  const summary = payload?.summary;
  if (!summary) {
    setUsageEmptyState();
    return;
  }

  const today = summary.today || {};
  const total = summary.total || {};
  const topDomains = Array.isArray(total.topDomains) ? total.topDomains : [];

  getElement('usageStatsStatus').textContent = `Local aggregates · ${summary.retentionDays || 14}d retention`;
  getElement('usageStatsTodayVisits').textContent = formatCount(today.visits);
  getElement('usageStatsTodayActive').textContent = formatDuration(today.activeMs);
  getElement('usageStatsTodayDomains').textContent = formatCount(today.domainCount);
  getElement('usageStatsTodayTabMax').textContent = formatCount(today.tabMax);
  getElement('usageStatsTotalSamples').textContent = formatCount(total.samples);
  getElement('usageStatsDomainList').replaceChildren(
    ...topDomains.slice(0, MAX_VISIBLE_DOMAINS).map(createDomainItem)
  );
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function refreshUsageStatsPanel() {
  renderUsageStats(await sendRuntimeMessage({ action: 'getUsageStats' }));
}

async function clearUsageStatsPanel() {
  const clearButton = getElement('clearUsageStatsButton');
  clearButton.disabled = true;
  try {
    const response = await sendRuntimeMessage({ action: 'clearUsageStats' });
    if (response?.status === 'cleared') {
      renderUsageStats(response);
    } else {
      setUsageEmptyState('Could not clear local usage stats');
    }
  } finally {
    clearButton.disabled = false;
  }
}

async function exportUsageStatsPanel() {
  const exportButton = getElement('exportUsageStatsButton');
  exportButton.disabled = true;
  try {
    const payload = await sendRuntimeMessage({ action: 'getUsageStats' });
    if (payload?.state) {
      const exportedAt = new Date().toISOString();
      const dateStamp = exportedAt.replace(/[:.]/g, '-');
      downloadJson(
        `dad-usage-stats-${dateStamp}.json`,
        buildUsageStatsExportPayload(payload.state, { exportedAt })
      );
    }
  } finally {
    exportButton.disabled = false;
  }
}

export function initializeUsageStatsPanel() {
  const refreshButton = getElement('refreshUsageStatsButton');
  const exportButton = getElement('exportUsageStatsButton');
  const clearButton = getElement('clearUsageStatsButton');
  if (!refreshButton || !exportButton || !clearButton) {
    return;
  }

  refreshButton.addEventListener('click', refreshUsageStatsPanel);
  exportButton.addEventListener('click', exportUsageStatsPanel);
  clearButton.addEventListener('click', clearUsageStatsPanel);
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.usageStats) {
      refreshUsageStatsPanel().catch(error => {
        console.error('Failed to refresh usage stats:', error);
      });
    }
  });

  refreshUsageStatsPanel().catch(error => {
    console.error('Failed to initialize usage stats:', error);
  });
}
