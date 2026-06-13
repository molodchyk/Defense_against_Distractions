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

function formatWordCount(value) {
  return formatCount(value);
}

function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return '0%';
  }

  return `${Math.max(0, Math.min(100, Math.round(number)))}%`;
}

function getBlockedPercent(source = {}, percentKey, blockedKey, allowedKey) {
  const explicitPercent = Number(source.outcomeShares?.[percentKey]);
  if (Number.isFinite(explicitPercent)) {
    return explicitPercent;
  }

  const blocked = Number(source[blockedKey] || 0);
  const allowed = Number(source[allowedKey] || 0);
  const total = blocked + allowed;
  return total > 0 ? (blocked / total) * 100 : 0;
}

function formatBlockedShare(source = {}) {
  return `${formatPercent(getBlockedPercent(source, 'blockedActivePercent', 'blockedActiveMs', 'allowedActiveMs'))} active / ${formatPercent(getBlockedPercent(source, 'blockedVisitPercent', 'blockedVisits', 'allowedVisits'))} visits`;
}

function createDomainItem(domain = {}) {
  const item = document.createElement('li');
  const title = document.createElement('strong');
  const meta = document.createElement('small');
  const media = domain.mediaMax || {};
  const interaction = domain.interactionMax || {};

  title.textContent = domain.hostname || '--';
  meta.textContent = [
    `${formatCount(domain.visits)} visits`,
    `${formatDuration(domain.activeMs)} active`,
    `${formatPercent(getBlockedPercent(domain, 'blockedActivePercent', 'blockedActiveMs', 'allowedActiveMs'))} blocked active share`,
    `${formatCount(domain.blockedVisits)} blocked visits`,
    `${formatDuration(domain.blockedActiveMs)} blocked active`,
    `${formatWordCount(domain.blockedWordCount)} blocked page words`,
    `${formatCount(domain.allowedVisits)} allowed visits`,
    `${formatWordCount(domain.allowedWordCount)} allowed page words`,
    `${formatCount(domain.tabMax)} tabs max`,
    `${formatCount(media.videoCount)} videos`,
    `${formatCount(media.audioCount)} audio`,
    `${formatCount(media.audibleMediaCount)} audible`,
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
  getElement('usageStatsTodayBlockedActive').textContent = '0s';
  getElement('usageStatsTodayAllowedActive').textContent = '0s';
  getElement('usageStatsTodayBlockedShare').textContent = '0% active / 0% visits';
  getElement('usageStatsTodayBlockedWords').textContent = '0';
  getElement('usageStatsTodayAllowedWords').textContent = '0';
  getElement('usageStatsTodayDomains').textContent = '0';
  getElement('usageStatsTodayBlockedVisits').textContent = '0';
  getElement('usageStatsTodayAllowedVisits').textContent = '0';
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
  getElement('usageStatsTodayBlockedActive').textContent = formatDuration(today.blockedActiveMs);
  getElement('usageStatsTodayAllowedActive').textContent = formatDuration(today.allowedActiveMs);
  getElement('usageStatsTodayBlockedShare').textContent = formatBlockedShare(today);
  getElement('usageStatsTodayBlockedWords').textContent = formatWordCount(today.blockedWordCount);
  getElement('usageStatsTodayAllowedWords').textContent = formatWordCount(today.allowedWordCount);
  getElement('usageStatsTodayDomains').textContent = formatCount(today.domainCount);
  getElement('usageStatsTodayBlockedVisits').textContent = formatCount(today.blockedVisits);
  getElement('usageStatsTodayAllowedVisits').textContent = formatCount(today.allowedVisits);
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
