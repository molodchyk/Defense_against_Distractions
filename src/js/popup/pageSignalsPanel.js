// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  copyTextToClipboard
} from './dom.js';
import {
  formatCount
} from './format.js';
import {
  formatSelectedTextCandidateEditorText,
  formatSelectedTextCandidateSummary,
  normalizeSelectedTextCandidate
} from '../../features/selected-text/candidate.js';

export {
  formatSelectedTextCandidateEditorText,
  formatSelectedTextCandidateSummary,
  normalizeSelectedTextCandidate
} from '../../features/selected-text/candidate.js';

const PAGE_SIGNAL_COUNT_IDS = [
  'pageSignalImageCount',
  'pageSignalVideoCount',
  'pageSignalAudioCount',
  'pageSignalAudibleMediaCount',
  'pageSignalGifCount',
  'pageSignalEmojiCount',
  'pageSignalLinkCount',
  'pageSignalPassiveRegions'
];

const TAB_PRESSURE_COUNT_IDS = [
  'pageSignalTabCount',
  'pageSignalWindowCount'
];

const KEYWORD_SUGGESTION_LIMIT = 6;
const KEYWORD_SUGGESTION_SOURCES = [
  ['selected', 'selectedTextTokens', 50],
  ['clicked', 'clickedLinkTokens', 45],
  ['heading', 'headingTokens', 40],
  ['description', 'descriptionTokens', 35],
  ['page', 'topTokens', 25]
];

export function buildKeywordSuggestionCandidates(signals = {}, options = {}) {
  const text = signals?.text || {};
  const limit = Math.max(1, Number(options.limit || KEYWORD_SUGGESTION_LIMIT));
  const candidates = new Map();
  let order = 0;

  KEYWORD_SUGGESTION_SOURCES.forEach(([source, key, score]) => {
    const tokens = Array.isArray(text[key]) ? text[key] : [];
    tokens.forEach(token => {
      const normalizedToken = normalizeKeywordSuggestionToken(token);
      if (!normalizedToken) {
        return;
      }

      const current = candidates.get(normalizedToken);
      if (!current) {
        candidates.set(normalizedToken, {
          token: normalizedToken,
          score,
          sources: [source],
          order: order++
        });
        return;
      }

      current.score = Math.max(current.score, score);
      if (!current.sources.includes(source)) {
        current.sources.push(source);
      }
    });
  });

  return Array.from(candidates.values())
    .sort((left, right) => right.score - left.score || left.order - right.order || left.token.localeCompare(right.token))
    .slice(0, limit)
    .map(({ order: _order, ...candidate }) => candidate);
}

export function formatKeywordSuggestionEditorText(candidates = []) {
  return candidates
    .map(candidate => `${candidate.token}, ${candidate.score}/100`)
    .join('\n');
}

export function createPageSignalsPanel({
  getMessage,
  getActiveTab,
  isExtensionPage,
  sendRuntimeMessage,
  sendTabMessage,
  setStatus,
  onActiveTabChange,
  onSelectionCandidateChange
}) {
  let latestSnapshot = null;
  let latestTabPressure = null;
  let latestKeywordSuggestions = [];
  let latestSelectionCandidate = null;

  function setUnavailable(message = getMessage('popupUnavailableLabel')) {
    latestSnapshot = null;
    latestKeywordSuggestions = [];
    latestSelectionCandidate = null;
    onSelectionCandidateChange?.(latestSelectionCandidate);
    document.getElementById('pageSignalsStatus').textContent = message;
    PAGE_SIGNAL_COUNT_IDS.forEach(elementId => {
      document.getElementById(elementId).textContent = '--';
    });
    renderKeywordSuggestions();
    renderSelectionCandidate();
  }

  function setTabPressureUnavailable() {
    latestTabPressure = null;
    TAB_PRESSURE_COUNT_IDS.forEach(elementId => {
      document.getElementById(elementId).textContent = '--';
    });
  }

  function normalizeTabPressure(tabPressure) {
    const tabCount = Number(tabPressure?.tabCount);
    const windowCount = Number(tabPressure?.windowCount);

    if (!Number.isFinite(tabCount) && !Number.isFinite(windowCount)) {
      return null;
    }

    return {
      tabCount: Number.isFinite(tabCount) ? Math.max(0, Math.round(tabCount)) : null,
      windowCount: Number.isFinite(windowCount) ? Math.max(0, Math.round(windowCount)) : null
    };
  }

  function formatOptionalCount(value) {
    return value === null || value === undefined ? '--' : formatCount(value);
  }

  function formatPassiveRegions(structure = {}) {
    return getMessage('popupPassiveRegionsSummary', [
      formatCount(structure.recommendationRegionCount),
      formatCount(structure.commentSectionCount),
      formatCount(structure.shortFormMediaCount)
    ]);
  }

  function renderTabPressure(tabPressure) {
    const normalizedTabPressure = normalizeTabPressure(tabPressure);
    if (!normalizedTabPressure) {
      setTabPressureUnavailable();
      return;
    }

    latestTabPressure = normalizedTabPressure;
    document.getElementById('pageSignalTabCount').textContent = formatOptionalCount(latestTabPressure.tabCount);
    document.getElementById('pageSignalWindowCount').textContent = formatOptionalCount(latestTabPressure.windowCount);
  }

  function render(response) {
    if (Object.prototype.hasOwnProperty.call(response || {}, 'tabPressure')) {
      renderTabPressure(response?.tabPressure);
    }

    const signals = response?.signals;
    if (!signals) {
      setUnavailable();
      return;
    }

    latestSnapshot = response;
    latestKeywordSuggestions = buildKeywordSuggestionCandidates(signals);
    latestSelectionCandidate = normalizeSelectedTextCandidate(response?.selectionCandidate);
    onSelectionCandidateChange?.(latestSelectionCandidate);
    document.getElementById('pageSignalsStatus').textContent = getMessage('popupCurrentTabStatus');
    document.getElementById('pageSignalImageCount').textContent = formatCount(signals.media?.imageCount);
    document.getElementById('pageSignalVideoCount').textContent = formatCount(signals.media?.videoCount);
    document.getElementById('pageSignalAudioCount').textContent = formatCount(signals.media?.audioCount);
    document.getElementById('pageSignalAudibleMediaCount').textContent = formatCount(signals.media?.audibleMediaCount);
    document.getElementById('pageSignalGifCount').textContent = formatCount(signals.media?.gifCount);
    document.getElementById('pageSignalEmojiCount').textContent = formatCount(signals.text?.emojiCount);
    document.getElementById('pageSignalLinkCount').textContent = formatCount(signals.interaction?.linkCount);
    document.getElementById('pageSignalPassiveRegions').textContent = formatPassiveRegions(signals.structure);
    renderKeywordSuggestions();
    renderSelectionCandidate();
  }

  async function refreshTabPressure() {
    if (!sendRuntimeMessage) {
      setTabPressureUnavailable();
      return null;
    }

    try {
      const response = await sendRuntimeMessage({ action: 'getTabPressure' });
      renderTabPressure(response?.tabPressure);
      return latestTabPressure;
    } catch (error) {
      setTabPressureUnavailable();
      return null;
    }
  }

  async function refresh() {
    const tabPressurePromise = refreshTabPressure();
    const activeTab = await getActiveTab();
    onActiveTabChange(activeTab || null);

    if (!activeTab?.id || isExtensionPage(activeTab.url)) {
      setUnavailable(getMessage('popupNoPageLabel'));
      await tabPressurePromise;
      return getSnapshot();
    }

    const response = await sendTabMessage(activeTab.id, { action: 'getPageSignalSnapshot' });
    render(response);
    await tabPressurePromise;
    return getSnapshot();
  }

  function getSnapshot() {
    if (!latestSnapshot && !latestTabPressure) {
      return null;
    }

    return {
      ...(latestSnapshot || {}),
      keywordSuggestions: latestKeywordSuggestions,
      selectionCandidate: latestSelectionCandidate,
      tabPressure: latestTabPressure
    };
  }

  function renderSelectionCandidate() {
    const candidateText = document.getElementById('pageSignalSelectedTextCandidate');
    const copyButton = document.getElementById('copySelectedTextButton');
    const summary = formatSelectedTextCandidateSummary(
      latestSelectionCandidate,
      getMessage('popupSelectedTextEditableMarker')
    );

    if (candidateText) {
      candidateText.textContent = summary || getMessage('popupNoKeywordIdeas');
      candidateText.title = summary || '';
    }

    if (copyButton) {
      copyButton.disabled = !latestSelectionCandidate;
    }
  }

  function renderKeywordSuggestions() {
    const ideasText = document.getElementById('pageSignalKeywordIdeasText');
    const copyButton = document.getElementById('copyKeywordIdeasButton');
    const summary = latestKeywordSuggestions.map(candidate => candidate.token).join(', ');

    if (ideasText) {
      ideasText.textContent = summary || getMessage('popupNoKeywordIdeas');
      ideasText.title = summary || '';
    }

    if (copyButton) {
      copyButton.disabled = latestKeywordSuggestions.length === 0;
    }
  }

  async function copyKeywordSuggestions() {
    if (latestKeywordSuggestions.length === 0) {
      setStatus?.(getMessage('popupNoKeywordIdeas'));
      return false;
    }

    try {
      await copyTextToClipboard(formatKeywordSuggestionEditorText(latestKeywordSuggestions));
      setStatus?.(getMessage('popupKeywordIdeasCopied'));
      return true;
    } catch (error) {
      setStatus?.(getMessage('popupKeywordIdeasCopyFailed'));
      return false;
    }
  }

  async function copySelectedTextCandidate() {
    const editorText = formatSelectedTextCandidateEditorText(latestSelectionCandidate);
    if (!editorText) {
      setStatus?.(getMessage('popupNoKeywordIdeas'));
      return false;
    }

    try {
      await copyTextToClipboard(editorText);
      setStatus?.(getMessage('popupSelectedTextCopied'));
      return true;
    } catch (error) {
      setStatus?.(getMessage('popupSelectedTextCopyFailed'));
      return false;
    }
  }

  return {
    copyKeywordSuggestions,
    copySelectedTextCandidate,
    getSnapshot,
    refresh,
    render,
    setUnavailable
  };
}

function normalizeKeywordSuggestionToken(value) {
  const token = String(value || '').trim().toLowerCase();
  if (token.length < 3 || token.length > 40) {
    return '';
  }

  if (!/^[\p{L}\p{N}_-]+$/u.test(token)) {
    return '';
  }

  return token;
}
