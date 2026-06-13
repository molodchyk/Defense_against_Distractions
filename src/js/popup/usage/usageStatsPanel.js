// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

const MAX_POPUP_USAGE_DOMAINS = 3;

function fallbackMessage(key, fallbackOrSubstitutions, maybeSubstitutions) {
  const fallback = maybeSubstitutions === undefined ? key : fallbackOrSubstitutions;
  const substitutions = maybeSubstitutions === undefined ? fallbackOrSubstitutions : maybeSubstitutions;
  return String(fallback || key).replace(/\$(\d+)/g, (match, index) => {
    const value = Array.isArray(substitutions) ? substitutions[Number(index) - 1] : undefined;
    return value === undefined ? match : String(value);
  });
}

export function formatUsageCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return '0';
  }

  return new Intl.NumberFormat().format(Math.max(0, Math.round(number)));
}

export function formatUsageDuration(value) {
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

export function formatUsagePercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return '0%';
  }

  return `${Math.max(0, Math.min(100, Math.round(number)))}%`;
}

function getMessageAdapter(getMessage) {
  return typeof getMessage === 'function' ? getMessage : fallbackMessage;
}

function getBlockedPercent(today = {}, percentKey, blockedKey, allowedKey) {
  const explicitPercent = Number(today.outcomeShares?.[percentKey]);
  if (Number.isFinite(explicitPercent)) {
    return explicitPercent;
  }

  const blocked = Number(today[blockedKey] || 0);
  const allowed = Number(today[allowedKey] || 0);
  const total = blocked + allowed;
  return total > 0 ? (blocked / total) * 100 : 0;
}

function formatWordOutcome(today, getMessage) {
  const blockedWords = formatUsageCount(today.blockedWordCount);
  const allowedWords = formatUsageCount(today.allowedWordCount);
  return getMessage('popupUsageWordsOutcome', '$1 blocked / $2 allowed', [blockedWords, allowedWords]);
}

function formatBlockedShare(today, getMessage) {
  return getMessage('popupUsageBlockedShare', '$1 active / $2 visits', [
    formatUsagePercent(getBlockedPercent(today, 'blockedActivePercent', 'blockedActiveMs', 'allowedActiveMs')),
    formatUsagePercent(getBlockedPercent(today, 'blockedVisitPercent', 'blockedVisits', 'allowedVisits'))
  ]);
}

function createEmptyUsageViewModel(getMessage) {
  return {
    statusText: getMessage('popupNoLocalUsageStats'),
    visitsText: '0',
    activeText: '0s',
    blockedActiveText: '0s',
    allowedActiveText: '0s',
    blockedShareText: getMessage('popupUsageBlockedShare', '$1 active / $2 visits', ['0%', '0%']),
    domainsText: '0',
    wordsText: getMessage('popupUsageWordsOutcome', '$1 blocked / $2 allowed', ['0', '0']),
    domainItems: [],
    emptyText: getMessage('popupNoLocalUsageStats')
  };
}

export function getUsageStatsViewModel(payload, getMessage = fallbackMessage) {
  const message = getMessageAdapter(getMessage);
  const summary = payload?.summary;
  if (!summary) {
    return createEmptyUsageViewModel(message);
  }

  const today = summary.today || {};
  const topDomains = Array.isArray(today.topDomains) ? today.topDomains : [];

  return {
    statusText: message('popupUsageStatusSummary', 'Local aggregates - $1d retention', [formatUsageCount(summary.retentionDays || 0)]),
    visitsText: formatUsageCount(today.visits),
    activeText: formatUsageDuration(today.activeMs),
    blockedActiveText: formatUsageDuration(today.blockedActiveMs),
    allowedActiveText: formatUsageDuration(today.allowedActiveMs),
    blockedShareText: formatBlockedShare(today, message),
    domainsText: formatUsageCount(today.domainCount),
    wordsText: formatWordOutcome(today, message),
    domainItems: topDomains.slice(0, MAX_POPUP_USAGE_DOMAINS).map(domain => ({
      hostname: domain.hostname || '--',
      meta: message('popupUsageDomainMeta', '$1 active - $2 blocked / $3 allowed visits', [
        formatUsageDuration(domain.activeMs),
        formatUsageCount(domain.blockedVisits),
        formatUsageCount(domain.allowedVisits)
      ])
    })),
    emptyText: message('popupNoLocalUsageStats')
  };
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    const text = String(value ?? '');
    element.textContent = text;
    element.title = text;
  }
}

function createDomainItem(item) {
  const listItem = document.createElement('li');
  const title = document.createElement('strong');
  const meta = document.createElement('span');

  title.textContent = item.hostname;
  meta.textContent = item.meta;
  listItem.append(title, meta);
  return listItem;
}

export function createUsageStatsPanel({
  getMessage,
  sendRuntimeMessage
}) {
  let latestPayload = null;

  function render(payload = latestPayload) {
    latestPayload = payload;
    const viewModel = getUsageStatsViewModel(payload, getMessage);
    const status = document.getElementById('usageSummaryStatus');
    const list = document.getElementById('usageSummaryDomainList');

    if (status) {
      status.textContent = viewModel.statusText;
      status.title = viewModel.statusText;
      status.dataset.state = viewModel.domainItems.length > 0 ? 'ready' : 'idle';
    }

    setText('usageSummaryVisitsText', viewModel.visitsText);
    setText('usageSummaryActiveText', viewModel.activeText);
    setText('usageSummaryBlockedText', viewModel.blockedActiveText);
    setText('usageSummaryAllowedText', viewModel.allowedActiveText);
    setText('usageSummaryBlockedShareText', viewModel.blockedShareText);
    setText('usageSummaryDomainsText', viewModel.domainsText);
    setText('usageSummaryWordsText', viewModel.wordsText);

    if (list) {
      list.replaceChildren(
        ...(viewModel.domainItems.length > 0
          ? viewModel.domainItems.map(createDomainItem)
          : [createDomainItem({ hostname: viewModel.emptyText, meta: '' })])
      );
    }
  }

  async function refresh() {
    const payload = await sendRuntimeMessage({ action: 'getUsageStats' });
    render(payload);
    return latestPayload;
  }

  function getPayload() {
    return latestPayload;
  }

  function getCompactDiagnostics(payload = latestPayload) {
    const summary = payload?.summary;
    if (!summary) {
      return null;
    }

    return {
      schemaVersion: summary.schemaVersion,
      retentionDays: summary.retentionDays,
      today: summary.today,
      total: summary.total
    };
  }

  return {
    refresh,
    render,
    getPayload,
    getCompactDiagnostics
  };
}
