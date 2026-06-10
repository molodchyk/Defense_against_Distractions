// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  DEFAULT_THEME_MODE,
  THEME_STORAGE_KEY,
  normalizeThemeMode,
  resolveThemeMode
} from './shared/theme.js';
import {
  PLANS_STORAGE_KEY,
  getEffectiveGroupsForUrl,
  isPlanActive,
  normalizePlans
} from './shared/plans.js';
import {
  normalizeUrl
} from './shared/url.js';
import {
  UI_LANGUAGE_STORAGE_KEY,
  getResolvedUiLanguage,
  getUiMessage,
  initializeUiLanguage
} from './shared/uiLanguage.js';
import {
  getActiveTab,
  getSyncStorage,
  isExtensionPage,
  openOptions,
  sendRuntimeMessage,
  sendTabMessage
} from './popup/chrome.js';
import {
  copyTextToClipboard,
  createTimelineRow,
  setTextWithTitle
} from './popup/dom.js';
import {
  formatClock,
  formatCount,
  formatDuration,
  formatShortDuration,
  getBreakDurationMs,
  getHostnameLabel
} from './popup/format.js';

const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
const MAX_VISITS_IN_POPUP = 4;
const POMODORO_RUNNING_PHASES = new Set(['work', 'shortBreak', 'longBreak']);
const POMODORO_BREAK_PHASES = new Set(['shortBreak', 'longBreak']);
let pomodoroRefreshInterval = null;
let blockDiagnosticsRefreshInterval = null;
let cachedPlans = [];
let latestActiveTab = null;
let latestBlockDebugState = null;
let latestPageSignalSnapshot = null;
let latestPomodoroPayload = null;
let latestIntentDebugState = null;
let activePopupPane = 'actions';

const POPUP_MESSAGES = {
  popupDocumentTitle: 'Defense against Distractions',
  popupBrandName: 'Defense against Distractions',
  popupQuickActionsTitle: 'Quick Actions',
  popupOpenOptionsTitle: 'Open options',
  popupSectionsAriaLabel: 'Popup sections',
  popupActionsTab: 'Actions',
  popupDiagnosticsTab: 'Diagnostics',
  popupProtectionStatusTitle: 'Protection status',
  popupLoadingLabel: 'Loading',
  popupProtectionStatusAriaLabel: 'Current protection status',
  popupPlansLabel: 'Plans',
  popupCurrentPageLabel: 'Current page',
  popupTimerLabel: 'Timer',
  popupIntentLabel: 'Intent',
  popupCheckingLabel: 'Checking',
  popupControlsAriaLabel: 'Controls',
  popupUiPickerTitle: 'UI Picker',
  popupCurrentTabLabel: 'Current tab',
  popupMatchStrategyLabel: 'Match strategy',
  popupSamePositionOption: 'Same position in repeated UI',
  popupSameTextOption: 'Same text or label',
  popupSimilarStructureOption: 'Similar structure',
  popupClosestMatchOption: 'Closest match',
  popupMinimumScoreLabel: 'Minimum score',
  popupAncestorDepthLabel: 'Ancestor depth',
  popupLabelMatchLabel: 'Label match',
  popupPreferLabelOption: 'Prefer label',
  popupIgnoreLabelOption: 'Ignore label',
  popupRequireLabelOption: 'Require label',
  popupPickUiElementButton: 'Pick UI Element',
  popupPomodoroTitle: 'Pomodoro',
  popupIdleLabel: 'Idle',
  popupNoActivePomodoroPlan: 'No active Pomodoro plan',
  popupZeroWorkSessionsCompleted: '0 work sessions completed',
  popupActivityUnknownLabel: 'Activity unknown',
  popupPomodoroTimingAriaLabel: 'Pomodoro timing details',
  popupStartButton: 'Start',
  popupPauseButton: 'Pause',
  popupResumeButton: 'Resume',
  popupResetButton: 'Reset',
  popupOpenTimerPanelButton: 'Open timer panel',
  popupTimerPanelOpened: 'Timer panel opened on this page.',
  popupDiagnosticsAriaLabel: 'Diagnostics',
  popupPageSignalsTitle: 'Page Signals',
  popupPageSignalsAriaLabel: 'Current page signal counts',
  popupImagesLabel: 'Images',
  popupVideoLabel: 'Video',
  popupAudioLabel: 'Audio',
  popupGifsLabel: 'GIFs',
  popupEmojiLabel: 'Emoji',
  popupLinksLabel: 'Links',
  popupBlockDiagnosticsTitle: 'Block Diagnostics',
  popupBlockDiagnosticsAriaLabel: 'Current page block diagnostics',
  popupPageLabel: 'Page',
  popupOverlayLabel: 'Overlay',
  popupMediaLabel: 'Media',
  popupTabMuteLabel: 'Tab mute',
  popupTriggerLabel: 'Trigger',
  popupScoreLabel: 'Score',
  popupRefreshButton: 'Refresh',
  popupCopyDiagnosticsButton: 'Copy Diagnostics',
  popupIntentDiagnosticsTitle: 'Intent Diagnostics',
  popupNoDataLabel: 'No data',
  popupCoherenceLabel: 'Coherence',
  popupOriginLabel: 'Origin',
  popupCurrentLabel: 'Current',
  popupFirstDriftLabel: 'First drift',
  popupLineageLabel: 'Lineage',
  popupIntentReasonsAriaLabel: 'Intent score reasons',
  popupIntentTrajectoryAriaLabel: 'Recent intent trajectory',
  popupClearButton: 'Clear',
  popupOptionsButton: 'Options',
  popupUnavailableLabel: 'Unavailable',
  popupNoPageLabel: 'No page',
  popupNoScriptLabel: 'No script',
  popupCurrentTabStatus: 'Current tab',
  popupNoWebPage: 'No web page',
  popupBlockedOverlayActive: 'Blocked overlay active',
  popupBlockedWithKeyword: 'Blocked: $1',
  popupAllowedByPlans: 'Allowed: $1',
  popupMatchedGroups: 'Matched: $1',
  popupNoMatchingRule: 'No matching rule',
  popupNoActivePlan: 'No active plan',
  popupNoPlansConfigured: 'No plans configured',
  popupActivePlansFallback: '$1 active',
  popupActivePlansSummary: '$1 active / $2 total',
  popupActiveState: 'Active',
  popupReadyState: 'Ready',
  popupIdleState: 'Idle',
  popupAutoStartPaused: 'Auto-start paused',
  popupAutoStartDelayed: 'Auto-start delayed',
  popupWorkSummary: 'Work - $1',
  popupPomodoroStateSummary: '$1 - $2',
  popupPausedSummary: 'Paused - $1',
  popupRestSatisfied: 'Rest satisfied',
  popupNotRunning: 'Not running',
  popupStrictBreaks: 'strict breaks',
  popupAdvisoryBreaks: 'advisory breaks',
  popupAutoStart: 'auto-start',
  popupAutoStartTimelineLabel: 'Auto-start',
  popupManualStart: 'manual start',
  popupWorkSessionsCompleted: '$1 work sessions completed',
  popupAutoStartDelayedFor: 'auto-start delayed $1',
  popupAutoStartPausedUntilStart: 'auto-start paused until Start or Resume',
  popupPomodoroProtectedScheduleControls: 'Controls locked',
  popupPomodoroProtectedScheduleReason: 'Pause and reset are locked while a protected schedule is active.',
  popupNoTrajectory: 'No trajectory',
  popupClearState: 'clear',
  popupBlockedState: 'blocked',
  popupNoneDetected: 'none detected',
  popupNoTriggerRecorded: 'No trigger recorded',
  popupUnknownLabel: 'unknown',
  popupBlockedOverlayIn: 'overlay in $1',
  popupMediaSuspendedSummary: '$1 media / $2 frames suspended',
  popupMediaRestoredSummary: 'restored $1 media / $2 frames',
  popupMediaCapableElements: '$1 media-capable elements',
  popupMutedOriginallyMuted: 'muted, originally muted',
  popupMutedByDad: 'muted by DaD',
  popupRestoredMutedState: 'restored to muted',
  popupRestoredUnmutedState: 'restored to unmuted',
  popupRestoreSkipped: 'restore skipped',
  popupNotTracked: 'not tracked',
  popupNoTrajectoryDataYet: 'No trajectory data yet',
  popupNoneDetectedTitleCase: 'None detected',
  popupConfiguredCycle: '$1m work / $2m rest',
  popupStateForDuration: '$1 for $2',
  popupStateLastActivity: '$1 - last activity $2 ago',
  popupActivityWithActiveToday: '$1 - active today $2',
  popupLastActivityAgo: '$1 ago',
  popupOpenPageBeforePicking: 'Open a page before picking an element.',
  popupReloadBeforePicking: 'Reload this page, then try picking again.',
  popupElementPickerStarted: 'Element picker started.',
  popupCouldNotClearIntent: 'Could not clear intent diagnostics.',
  popupClearedLabel: 'Cleared',
  popupPomodoroActionFailed: 'Pomodoro action failed.',
  pomodoroWorkStartedLabel: 'Work started',
  pomodoroNextBreakLabel: 'Next break',
  pomodoroRequiredRestLabel: 'Required rest',
  pomodoroRestCreditedLabel: 'Rest already credited',
  pomodoroRestStillNeededLabel: 'Rest still needed',
  pomodoroReturnBehaviorLabel: 'Return behavior',
  pomodoroReturnStartsNewWork: 'new work starts on activity',
  pomodoroBreakStartedLabel: 'Break started',
  pomodoroBreakEndsLabel: 'Break ends',
  pomodoroNextWorkLabel: 'Next work',
  pomodoroNextWorkAfterRestLabel: 'after rest is done',
  pomodoroRestSatisfiedLabel: 'Rest satisfied',
  pomodoroNextWorkOnActivityLabel: 'when activity returns',
  pomodoroCompletedBlocksLabel: 'Completed work blocks',
  pomodoroPausedAtLabel: 'Paused at',
  pomodoroPausedPhaseLabel: 'Paused phase',
  pomodoroRemainingLabel: 'Remaining',
  pomodoroTimerStateLabel: 'Timer state',
  pomodoroReadyToStartLabel: 'ready to start',
  pomodoroConfiguredCycleLabel: 'Configured cycle',
  popupActivityStateLabel: 'System state',
  popupLastActivityLabel: 'Last activity',
  pomodoroHistoryTodayLabel: 'Today',
  pomodoroHistoryWorkSessionsLabel: 'Work sessions',
  pomodoroHistoryBreaksLabel: 'Breaks completed',
  pomodoroHistoryCreditedRestLabel: 'Rest credited',
  pomodoroHistorySkippedBreaksLabel: 'Breaks skipped',
  popupDiagnosticsCopied: 'Diagnostics copied.',
  popupCouldNotCopyDiagnostics: 'Could not copy diagnostics.'
};

function getMessage(key, fallbackOrSubstitutions, maybeSubstitutions) {
  const hasExplicitFallback = maybeSubstitutions !== undefined;
  const fallback = hasExplicitFallback ? fallbackOrSubstitutions : (POPUP_MESSAGES[key] || key);
  const substitutions = hasExplicitFallback ? maybeSubstitutions : fallbackOrSubstitutions;
  return getUiMessage(key, POPUP_MESSAGES[key] || fallback, substitutions);
}

function localizePopup() {
  document.documentElement.lang = getResolvedUiLanguage();

  document.querySelectorAll('[data-i18n]').forEach(element => {
    element.textContent = getMessage(element.dataset.i18n, element.textContent);
  });

  document.querySelectorAll('[data-i18n-title]').forEach(element => {
    element.title = getMessage(element.dataset.i18nTitle, element.title);
  });

  document.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
    element.setAttribute('aria-label', getMessage(element.dataset.i18nAriaLabel, element.getAttribute('aria-label') || ''));
  });
}

function setStatus(message) {
  const status = document.getElementById('statusText');
  const text = String(message || '');
  status.textContent = text;
  status.title = text;
}

function setPopupPane(paneName) {
  const nextPane = paneName === 'diagnostics' ? 'diagnostics' : 'actions';
  activePopupPane = nextPane;

  document.querySelectorAll('[data-popup-tab]').forEach(button => {
    const isActive = button.dataset.popupTab === nextPane;
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  document.querySelectorAll('[data-popup-pane]').forEach(pane => {
    pane.hidden = pane.dataset.popupPane !== nextPane;
  });
}

function initializePopupTabs() {
  document.querySelectorAll('[data-popup-tab]').forEach(button => {
    button.addEventListener('click', () => {
      setPopupPane(button.dataset.popupTab);
    });
  });

  setPopupPane(activePopupPane);
}

function applyTheme(mode) {
  document.documentElement.dataset.theme = resolveThemeMode(mode, mediaQuery.matches);
}

function loadTheme() {
  chrome.storage.sync.get({ [THEME_STORAGE_KEY]: DEFAULT_THEME_MODE }, result => {
    applyTheme(normalizeThemeMode(result[THEME_STORAGE_KEY]));
  });
}

async function redirectExtensionTabsToOptions() {
  const activeTab = await getActiveTab();
  latestActiveTab = activeTab || null;

  if (isExtensionPage(activeTab?.url)) {
    chrome.runtime.openOptionsPage();
    window.close();
    return true;
  }

  return false;
}

function getActivePlans() {
  return cachedPlans.filter(plan => isPlanActive(plan));
}

function summarizeNames(names, emptyText, maxVisible = 2) {
  const visibleNames = Array.isArray(names)
    ? names.map(name => String(name || '').trim()).filter(Boolean)
    : [];

  if (visibleNames.length === 0) {
    return emptyText;
  }

  if (visibleNames.length <= maxVisible) {
    return visibleNames.join(', ');
  }

  return `${visibleNames.slice(0, maxVisible).join(', ')} +${visibleNames.length - maxVisible}`;
}

function getProtectionPageSummary(activeTab = latestActiveTab) {
  if (!activeTab?.url || isExtensionPage(activeTab.url)) {
    return {
      state: 'idle',
      text: getMessage('popupNoWebPage')
    };
  }

  if (latestBlockDebugState?.pageBlocked || latestBlockDebugState?.hasOverlay) {
    const trigger = latestBlockDebugState?.blockDiagnostics?.latestTrigger;
    return {
      state: 'active',
      text: trigger?.keyword
        ? getMessage('popupBlockedWithKeyword', [trigger.keyword])
        : getMessage('popupBlockedOverlayActive')
    };
  }

  const normalizedUrl = normalizeUrl(activeTab.url);
  const activePlans = getActivePlans();
  const matchingGroups = getEffectiveGroupsForUrl({ [PLANS_STORAGE_KEY]: cachedPlans }, normalizedUrl);
  const allowedPlans = activePlans.filter(plan => plan.allowedSites.some(site => normalizedUrl.includes(site)));

  if (allowedPlans.length > 0) {
    return {
      state: 'idle',
      text: getMessage('popupAllowedByPlans', [summarizeNames(allowedPlans.map(plan => plan.name), 'plan')])
    };
  }

  if (matchingGroups.length > 0) {
    return {
      state: 'active',
      text: getMessage(
        'popupMatchedGroups',
        [summarizeNames(matchingGroups.map(group => group.groupName || group.name), `${matchingGroups.length} groups`)]
      )
    };
  }

  if (activePlans.length > 0) {
    return {
      state: 'ready',
      text: getMessage('popupNoMatchingRule')
    };
  }

  return {
    state: 'idle',
    text: getMessage('popupNoActivePlan')
  };
}

function getPomodoroSummary(payload = latestPomodoroPayload) {
  if (payload?.autoStartSuppression?.active) {
    return {
      state: 'idle',
      text: payload.autoStartSuppression.global
        ? getMessage('popupAutoStartPaused')
        : getMessage('popupAutoStartDelayed')
    };
  }

  const phase = payload?.timerStatus?.phase || payload?.runtime?.phase || 'idle';
  const phaseLabel = payload?.timerStatus?.phaseLabel || getMessage('popupIdleLabel');
  const remainingText = payload?.timerStatus?.remainingText || '0:00';
  const planName = payload?.plan?.name || '';

  if (POMODORO_BREAK_PHASES.has(phase)) {
    return {
      state: 'active',
      text: getMessage('popupPomodoroStateSummary', [phaseLabel, remainingText])
    };
  }

  if (phase === 'work') {
    return {
      state: 'ready',
      text: getMessage('popupWorkSummary', [remainingText])
    };
  }

  if (phase === 'paused') {
    return {
      state: 'idle',
      text: getMessage('popupPausedSummary', [remainingText])
    };
  }

  if (phase === 'completed') {
    return {
      state: 'ready',
      text: getMessage('popupRestSatisfied')
    };
  }

  return {
    state: 'idle',
    text: planName || getMessage('popupNotRunning')
  };
}

function getPomodoroPolicyText(payload = latestPomodoroPayload) {
  const pomodoro = payload?.plan?.pomodoro || {};
  const strictText = pomodoro.strictBreaks ? getMessage('popupStrictBreaks') : getMessage('popupAdvisoryBreaks');
  const startText = pomodoro.autoStart ? getMessage('popupAutoStart') : getMessage('popupManualStart');
  return `${strictText} - ${startText}`;
}

function getPomodoroAutoStartSuppressionText(payload = latestPomodoroPayload) {
  const suppression = payload?.autoStartSuppression;
  if (!suppression?.active) {
    return '';
  }

  if (Number(suppression.remainingMs) > 0) {
    return getMessage('popupAutoStartDelayedFor', [formatDuration(suppression.remainingMs)]);
  }

  if (suppression.global) {
    return getMessage('popupAutoStartPausedUntilStart');
  }

  return getMessage('popupAutoStartPaused');
}

function getIntentSummary(debugState = latestIntentDebugState) {
  const activeSession = debugState?.activeSession;
  const riskState = debugState?.intervention?.riskState || activeSession?.riskState || 'none';
  const score = Number.isFinite(Number(activeSession?.coherenceScore))
    ? activeSession.coherenceScore
    : null;
  const scoreText = score === null ? '' : ` · ${score}`;

  if (!activeSession) {
    return {
      state: 'idle',
      text: getMessage('popupNoTrajectory')
    };
  }

  if (riskState === 'locked' || riskState === 'intervene') {
    return {
      state: 'active',
      text: `${riskState}${scoreText}`
    };
  }

  if (riskState === 'watch' || riskState === 'drift') {
    return {
      state: 'ready',
      text: `${riskState}${scoreText}`
    };
  }

  return {
    state: 'idle',
    text: `${riskState}${scoreText}`
  };
}

function getOverallProtectionState(summaries, activePlans) {
  if (summaries.some(summary => summary.state === 'active')) {
    return {
      state: 'active',
      text: getMessage('popupActiveState')
    };
  }

  if (activePlans.length > 0 || summaries.some(summary => summary.state === 'ready')) {
    return {
      state: 'ready',
      text: getMessage('popupReadyState')
    };
  }

  return {
    state: 'idle',
    text: getMessage('popupIdleState')
  };
}

function renderProtectionSummary() {
  const activePlans = getActivePlans();
  const pageSummary = getProtectionPageSummary();
  const pomodoroSummary = getPomodoroSummary();
  const intentSummary = getIntentSummary();
  const overall = getOverallProtectionState([pageSummary, pomodoroSummary, intentSummary], activePlans);
  const badge = document.getElementById('protectionStatusBadge');

  badge.textContent = overall.text;
  badge.dataset.state = overall.state;
  setTextWithTitle('activePlansText', cachedPlans.length === 0
    ? getMessage('popupNoPlansConfigured')
    : activePlans.length === 0
      ? getMessage('popupActivePlansSummary', ['0', cachedPlans.length])
      : summarizeNames(activePlans.map(plan => plan.name), getMessage('popupActivePlansFallback', [activePlans.length])));
  setTextWithTitle('currentProtectionText', pageSummary.text);
  setTextWithTitle('pomodoroProtectionText', pomodoroSummary.text);
  setTextWithTitle('intentProtectionText', intentSummary.text);
}

async function refreshPlanSummary() {
  const items = await getSyncStorage({ [PLANS_STORAGE_KEY]: [] });
  cachedPlans = normalizePlans(items?.[PLANS_STORAGE_KEY]);
  renderProtectionSummary();
}

async function startElementPicker() {
  const strategy = document.getElementById('matchStrategySelect').value;
  const minScore = Number.parseInt(document.getElementById('minimumScoreInput').value, 10);
  const ancestorDepth = Number.parseInt(document.getElementById('ancestorDepthInput').value, 10);
  const labelMatch = document.getElementById('labelMatchSelect').value;
  const activeTab = await getActiveTab();

  if (!activeTab?.id) {
    setStatus(getMessage('popupOpenPageBeforePicking'));
    return;
  }

  chrome.tabs.sendMessage(activeTab.id, {
    action: 'startElementPicker',
    strategy,
    minScore,
    ancestorDepth,
    labelMatch
  }, response => {
    if (chrome.runtime.lastError) {
      setStatus(getMessage('popupReloadBeforePicking'));
      return;
    }

    setStatus(response?.status || getMessage('popupElementPickerStarted'));
    window.close();
  });
}

async function openPomodoroMiniPanel() {
  const activeTab = await getActiveTab();

  if (!activeTab?.id || isExtensionPage(activeTab.url)) {
    setStatus(getMessage('popupOpenPageBeforePicking'));
    return;
  }

  const response = await sendTabMessage(activeTab.id, { action: 'showPomodoroMiniPanel' });
  if (!response || response.status === 'error') {
    setStatus(response?.reason || getMessage('popupReloadBeforePicking'));
    return;
  }

  setStatus(getMessage('popupTimerPanelOpened'));
  window.close();
}

function setPageSignalsUnavailable(message = getMessage('popupUnavailableLabel')) {
  latestPageSignalSnapshot = null;
  document.getElementById('pageSignalsStatus').textContent = message;
  [
    'pageSignalImageCount',
    'pageSignalVideoCount',
    'pageSignalAudioCount',
    'pageSignalGifCount',
    'pageSignalEmojiCount',
    'pageSignalLinkCount'
  ].forEach(elementId => {
    document.getElementById(elementId).textContent = '--';
  });
}

function renderPageSignals(response) {
  const signals = response?.signals;
  if (!signals) {
    setPageSignalsUnavailable();
    return;
  }

  latestPageSignalSnapshot = response;
  document.getElementById('pageSignalsStatus').textContent = getMessage('popupCurrentTabStatus');
  document.getElementById('pageSignalImageCount').textContent = formatCount(signals.media?.imageCount);
  document.getElementById('pageSignalVideoCount').textContent = formatCount(signals.media?.videoCount);
  document.getElementById('pageSignalAudioCount').textContent = formatCount(signals.media?.audioCount);
  document.getElementById('pageSignalGifCount').textContent = formatCount(signals.media?.gifCount);
  document.getElementById('pageSignalEmojiCount').textContent = formatCount(signals.text?.emojiCount);
  document.getElementById('pageSignalLinkCount').textContent = formatCount(signals.interaction?.linkCount);
}

function setBlockDiagnosticsUnavailable(message = getMessage('popupUnavailableLabel')) {
  latestBlockDebugState = null;
  const status = document.getElementById('blockDiagnosticsStatus');
  status.textContent = message;
  status.dataset.state = 'idle';
  [
    'blockPageStateText',
    'blockOverlayStateText',
    'blockMediaStateText',
    'blockTabMuteStateText',
    'blockTriggerText',
    'blockScoreText'
  ].forEach(elementId => {
    setTextWithTitle(elementId, '--');
  });
  renderProtectionSummary();
}

function formatBlockStateLabel(active, activeText, inactiveText = getMessage('popupClearState')) {
  return active ? activeText : inactiveText;
}

function formatBlockMediaState(media = {}) {
  const suspendedMediaCount = Number(media.suspendedMediaCount || 0);
  const suspendedFrameCount = Number(media.suspendedFrameCount || 0);
  const currentMediaElementCount = Number(media.currentMediaElementCount || 0);
  const currentEmbeddedFrameCount = Number(media.currentEmbeddedFrameCount || 0);
  const suspendedTotal = suspendedMediaCount + suspendedFrameCount;
  const currentTotal = currentMediaElementCount + currentEmbeddedFrameCount;

  if (suspendedTotal > 0) {
    return getMessage('popupMediaSuspendedSummary', [suspendedMediaCount, suspendedFrameCount]);
  }

  if (media.lastRestoreSummary) {
    return getMessage('popupMediaRestoredSummary', [
      media.lastRestoreSummary.restoredMediaCount || 0,
      media.lastRestoreSummary.restoredFrameCount || 0
    ]);
  }

  return currentTotal > 0
    ? getMessage('popupMediaCapableElements', [currentTotal])
    : getMessage('popupNoneDetected');
}

function formatTabMuteState(tabMute = {}) {
  if (tabMute.tracked) {
    return tabMute.originalMuted === true ? getMessage('popupMutedOriginallyMuted') : getMessage('popupMutedByDad');
  }

  if (tabMute.lastAction === 'restored') {
    return tabMute.restoredMutedState ? getMessage('popupRestoredMutedState') : getMessage('popupRestoredUnmutedState');
  }

  if (tabMute.lastAction === 'restoreSkipped') {
    return getMessage('popupRestoreSkipped');
  }

  return getMessage('popupNotTracked');
}

function formatBlockTrigger(debugState = {}) {
  const trigger = debugState.blockDiagnostics?.latestTrigger;
  if (!trigger) {
    return getMessage('popupNoTriggerRecorded');
  }

  const keyword = trigger.keyword || getMessage('popupUnknownLabel');
  const source = trigger.source ? ` · ${trigger.source}` : '';
  return `${keyword}${source}`;
}

function formatBlockScore(debugState = {}) {
  const diagnosticsScore = debugState.blockDiagnostics?.finalScore;
  const pageScore = debugState.pageScore;
  const score = diagnosticsScore ?? pageScore;
  if (!Number.isFinite(Number(score))) {
    return '--';
  }

  const trigger = debugState.blockDiagnostics?.latestTrigger;
  const delta = trigger ? ` · ${trigger.operation || '+'}${trigger.value ?? 0}` : '';
  return `${Math.round(Number(score))}${delta}`;
}

function renderBlockDiagnostics(debugState) {
  latestBlockDebugState = debugState || null;
  const status = document.getElementById('blockDiagnosticsStatus');

  if (!debugState) {
    setBlockDiagnosticsUnavailable();
    return;
  }

  const active = Boolean(debugState.pageBlocked || debugState.hasOverlay);
  status.textContent = active ? getMessage('popupBlockedState') : getMessage('popupClearButton');
  status.dataset.state = active ? 'active' : 'ready';

  setTextWithTitle('blockPageStateText', formatBlockStateLabel(debugState.pageBlocked, getMessage('popupBlockedState')));
  setTextWithTitle(
    'blockOverlayStateText',
    formatBlockStateLabel(debugState.hasOverlay, getMessage('popupBlockedOverlayIn', [debugState.overlayParent || getMessage('popupPageLabel')]))
  );
  setTextWithTitle('blockMediaStateText', formatBlockMediaState(debugState.media));
  setTextWithTitle('blockTabMuteStateText', formatTabMuteState(debugState.tabMute));
  setTextWithTitle('blockTriggerText', formatBlockTrigger(debugState));
  setTextWithTitle('blockScoreText', formatBlockScore(debugState));
  renderProtectionSummary();
}

async function refreshBlockDiagnostics() {
  const activeTab = await getActiveTab();
  latestActiveTab = activeTab || null;

  if (!activeTab?.id || isExtensionPage(activeTab.url)) {
    setBlockDiagnosticsUnavailable(getMessage('popupNoPageLabel'));
    return;
  }

  const debugState = await sendTabMessage(activeTab.id, { action: 'getBlockDebugState' });
  if (!debugState) {
    setBlockDiagnosticsUnavailable(getMessage('popupNoScriptLabel'));
    return;
  }

  renderBlockDiagnostics(debugState);
}

async function refreshPageSignals() {
  const activeTab = await getActiveTab();
  latestActiveTab = activeTab || null;
  renderProtectionSummary();

  if (!activeTab?.id || isExtensionPage(activeTab.url)) {
    setPageSignalsUnavailable(getMessage('popupNoPageLabel'));
    return;
  }

  renderPageSignals(await sendTabMessage(activeTab.id, { action: 'getPageSignalSnapshot' }));
}

function renderPomodoroTimeline(payload) {
  const list = document.getElementById('pomodoroTimelineList');
  const runtime = payload?.runtime || {};
  const status = payload?.timerStatus || {};
  const activityStatus = payload?.activityStatus || {};
  const phase = status.phase || runtime.phase || 'idle';
  const settings = status.settings || {};
  const upcomingBreakMs = getBreakDurationMs(phase, settings, status.completedWorkSessions || 0);
  const rawRestCreditMs = Number(status.restCreditMs || 0);
  const restCreditMs = upcomingBreakMs > 0
    ? Math.min(rawRestCreditMs, upcomingBreakMs)
    : rawRestCreditMs;
  const restStillNeededMs = Math.max(0, upcomingBreakMs - restCreditMs);
  const historyTotals = payload?.history?.totals || {};
  const suppressionText = getPomodoroAutoStartSuppressionText(payload);
  const rows = [];

  if (payload?.protectedScheduleActive) {
    rows.push(createTimelineRow(
      getMessage('popupPomodoroProtectedScheduleControls'),
      getMessage('popupPomodoroProtectedScheduleReason')
    ));
  }

  if (phase === 'work') {
    rows.push(createTimelineRow(getMessage('pomodoroWorkStartedLabel', 'Work started'), formatClock(runtime.phaseStartedAt)));
    rows.push(createTimelineRow(getMessage('pomodoroNextBreakLabel', 'Next break'), formatClock(runtime.phaseEndsAt)));
    rows.push(createTimelineRow(getMessage('pomodoroRequiredRestLabel', 'Required rest'), formatDuration(upcomingBreakMs)));
    rows.push(createTimelineRow(getMessage('pomodoroRestCreditedLabel', 'Rest already credited'), formatDuration(restCreditMs)));
    rows.push(createTimelineRow(getMessage('pomodoroRestStillNeededLabel', 'Rest still needed'), formatDuration(restStillNeededMs)));
    if (upcomingBreakMs > 0 && restStillNeededMs <= 0) {
      rows.push(createTimelineRow(getMessage('pomodoroReturnBehaviorLabel'), getMessage('pomodoroReturnStartsNewWork')));
    }
  } else if (phase === 'shortBreak' || phase === 'longBreak') {
    rows.push(createTimelineRow(getMessage('pomodoroBreakStartedLabel', 'Break started'), formatClock(runtime.phaseStartedAt)));
    rows.push(createTimelineRow(getMessage('pomodoroBreakEndsLabel', 'Break ends'), formatClock(runtime.phaseEndsAt)));
    rows.push(createTimelineRow(getMessage('pomodoroRequiredRestLabel', 'Required rest'), formatDuration(upcomingBreakMs)));
    rows.push(createTimelineRow(getMessage('pomodoroNextWorkLabel', 'Next work'), getMessage('pomodoroNextWorkAfterRestLabel', 'after rest is done')));
  } else if (phase === 'completed') {
    rows.push(createTimelineRow(getMessage('pomodoroRestSatisfiedLabel', 'Rest satisfied'), formatClock(runtime.phaseStartedAt || runtime.lastCompletedAt)));
    rows.push(createTimelineRow(getMessage('pomodoroNextWorkLabel', 'Next work'), getMessage('pomodoroNextWorkOnActivityLabel', 'when activity returns')));
    rows.push(createTimelineRow(getMessage('pomodoroCompletedBlocksLabel', 'Completed work blocks'), String(status.completedWorkSessions || 0)));
  } else if (phase === 'paused') {
    rows.push(createTimelineRow(getMessage('pomodoroPausedAtLabel', 'Paused at'), formatClock(runtime.pausedAt)));
    rows.push(createTimelineRow(getMessage('pomodoroPausedPhaseLabel', 'Paused phase'), runtime.pausedPhase || '--'));
    rows.push(createTimelineRow(getMessage('pomodoroRemainingLabel', 'Remaining'), status.remainingText || '--'));
  } else {
    rows.push(createTimelineRow(
      getMessage('pomodoroTimerStateLabel', 'Timer state'),
      payload?.canStart ? getMessage('pomodoroReadyToStartLabel', 'ready to start') : getMessage('popupNoActivePlan')
    ));
    rows.push(createTimelineRow(
      getMessage('pomodoroConfiguredCycleLabel', 'Configured cycle'),
      getMessage('popupConfiguredCycle', [Number(settings.workMinutes || 0), Number(settings.shortBreakMinutes || 0)])
    ));
  }

  if (activityStatus.stateLabel) {
    rows.push(createTimelineRow(getMessage('popupActivityStateLabel', 'System state'), formatPomodoroActivityText(activityStatus, false)));
    rows.push(createTimelineRow(
      getMessage('popupLastActivityLabel', 'Last activity'),
      activityStatus.idleForText === 'unknown'
        ? getMessage('popupUnknownLabel')
        : getMessage('popupLastActivityAgo', [activityStatus.idleForText])
    ));
  }

  if (suppressionText) {
    rows.push(createTimelineRow(getMessage('popupAutoStartTimelineLabel'), suppressionText));
  }

  rows.push(createTimelineRow(getMessage('pomodoroHistoryTodayLabel'), [
    getMessage('pomodoroHistoryWorkSessionsLabel'),
    String(historyTotals.workSessionsCompleted || 0)
  ].join(': ')));
  rows.push(createTimelineRow(getMessage('pomodoroHistoryCreditedRestLabel'), formatDuration(historyTotals.creditedRestMs || 0)));
  rows.push(createTimelineRow(getMessage('pomodoroHistorySkippedBreaksLabel'), String(historyTotals.skippedBreaks || 0)));

  list.replaceChildren(...rows);
}

function formatPomodoroActivityText(activityStatus = {}, includeActiveToday = true) {
  const stateLabel = activityStatus.stateLabel || getMessage('popupActivityUnknownLabel');
  const isSystemAway = activityStatus.systemState === 'idle' || activityStatus.systemState === 'locked';
  const stateDuration = activityStatus.systemStateForText || getMessage('popupUnknownLabel');
  const activeToday = activityStatus.activeTodayText || '0s';
  const stateText = isSystemAway
    ? getMessage('popupStateForDuration', [stateLabel, stateDuration])
    : getMessage('popupStateLastActivity', [stateLabel, activityStatus.idleForText || getMessage('popupUnknownLabel')]);

  return includeActiveToday ? getMessage('popupActivityWithActiveToday', [stateText, activeToday]) : stateText;
}

function setIntentEmptyState(message = getMessage('popupNoTrajectoryDataYet')) {
  document.getElementById('intentRiskBadge').textContent = getMessage('popupNoDataLabel');
  document.getElementById('intentRiskBadge').dataset.state = 'none';
  document.getElementById('intentCoherenceScore').textContent = '--';
  document.getElementById('intentOriginText').textContent = message;
  document.getElementById('intentCurrentText').textContent = '--';
  document.getElementById('intentDriftText').textContent = '--';
  document.getElementById('intentLineageText').textContent = '--';
  document.getElementById('intentReasonList').replaceChildren();
  document.getElementById('intentVisitList').replaceChildren();
}

function formatIntentLineage(metrics = {}) {
  const tabCount = Number(metrics.tabCount || 0);
  const branchCount = Number(metrics.branchCount || 0);
  const driftDescendantCount = Number(metrics.driftDescendantCount || 0);
  const transitionType = metrics.latestTransitionType || 'unknown';
  const parts = [
    `${tabCount} tab${tabCount === 1 ? '' : 's'}`,
    `${branchCount} branch${branchCount === 1 ? '' : 'es'}`,
    `latest ${transitionType}`
  ];

  if (driftDescendantCount > 0) {
    parts.push(`${driftDescendantCount} drift descendant${driftDescendantCount === 1 ? '' : 's'}`);
  }

  if (metrics.latestIsDriftDescendant) {
    parts.push('current is descendant');
  }

  return parts.join(' - ');
}

function renderIntentVisitList(visits = []) {
  const visitList = document.getElementById('intentVisitList');
  const recentVisits = visits.slice(-MAX_VISITS_IN_POPUP);

  visitList.replaceChildren(...recentVisits.map(visit => {
    const item = document.createElement('li');
    const title = document.createElement('span');
    const meta = document.createElement('small');

    title.textContent = getHostnameLabel(visit);
    const metaParts = [];
    if (Number.isFinite(Number(visit.tabId))) {
      metaParts.push(`tab ${visit.tabId}`);
    }
    if (Number.isFinite(Number(visit.openerTabId))) {
      metaParts.push(`from tab ${visit.openerTabId}`);
    }
    if (visit.driftDescendant) {
      metaParts.push('drift descendant');
    }
    if (visit.transitionType) {
      metaParts.push(`transition ${visit.transitionType}`);
    }
    if (Array.isArray(visit.transitionQualifiers) && visit.transitionQualifiers.length > 0) {
      metaParts.push(visit.transitionQualifiers.join(', '));
    }
    metaParts.push(`active ${formatShortDuration(visit.activeMs ?? visit.signals?.activity?.activePageMs)}`);
    if (visit.metrics) {
      metaParts.push(`origin ${Math.round(Number(visit.metrics.originSimilarity || 0) * 100)}%`);
      metaParts.push(`local ${Math.round(Number(visit.metrics.localSimilarity || 0) * 100)}%`);
    }

    meta.textContent = metaParts.join(' - ');

    item.append(title, meta);
    return item;
  }));
}

function renderIntentReasonList(reasons = []) {
  const reasonList = document.getElementById('intentReasonList');
  const visibleReasons = Array.isArray(reasons) ? reasons.slice(0, 3) : [];

  reasonList.replaceChildren(...visibleReasons.map(reason => {
    const item = document.createElement('li');
    item.textContent = reason;
    return item;
  }));
}

function renderIntentDiagnostics(debugState) {
  const activeSession = debugState?.activeSession;

  if (!activeSession) {
    setIntentEmptyState();
    return;
  }

  const visits = Array.isArray(activeSession.visits) ? activeSession.visits : [];
  const latestVisit = visits.at(-1);
  const driftVisit = visits.find(visit => visit.id === activeSession.firstDriftVisitId);
  const riskState = debugState?.intervention?.riskState || activeSession.riskState || 'clear';
  const score = Number.isFinite(activeSession.coherenceScore)
    ? activeSession.coherenceScore
    : '--';

  document.getElementById('intentRiskBadge').textContent = riskState;
  document.getElementById('intentRiskBadge').dataset.state = riskState;
  document.getElementById('intentCoherenceScore').textContent = score;
  document.getElementById('intentOriginText').textContent = getHostnameLabel(activeSession.origin);
  document.getElementById('intentCurrentText').textContent = getHostnameLabel(latestVisit);
  document.getElementById('intentDriftText').textContent = driftVisit ? getHostnameLabel(driftVisit) : 'None detected';
  document.getElementById('intentLineageText').textContent = formatIntentLineage(activeSession.metrics);
  renderIntentReasonList(debugState?.intervention?.reasonLines);
  renderIntentVisitList(visits);
}

async function refreshIntentDiagnostics() {
  const activeTab = await getActiveTab();
  latestActiveTab = activeTab || null;

  await refreshPageSignals();

  if (activeTab?.id && !isExtensionPage(activeTab.url)) {
    await sendTabMessage(activeTab.id, { action: 'reportIntentPageSignals' });
  }

  const debugState = await sendRuntimeMessage({
    action: 'getIntentDebugState',
    tabId: activeTab?.id
  });
  latestIntentDebugState = debugState || null;
  renderIntentDiagnostics(debugState);
  renderProtectionSummary();
}

async function clearIntentDiagnostics() {
  const clearButton = document.getElementById('clearIntentButton');
  clearButton.disabled = true;
  const response = await sendRuntimeMessage({ action: 'clearIntentDebugState' });

  if (response?.status === 'cleared') {
    setIntentEmptyState(getMessage('popupClearedLabel'));
  } else {
    setStatus(getMessage('popupCouldNotClearIntent'));
  }

  clearButton.disabled = false;
}

function renderPomodoroState(payload) {
  latestPomodoroPayload = payload || null;
  const phase = payload?.timerStatus?.phase || 'idle';
  const phaseLabel = payload?.timerStatus?.phaseLabel || getMessage('popupIdleLabel');
  const remainingText = payload?.timerStatus?.remainingText || '0:00';
  const completedWorkSessions = payload?.timerStatus?.completedWorkSessions || 0;
  const planName = payload?.plan?.name || getMessage('popupNoActivePomodoroPlan');
  const activityStatus = payload?.activityStatus;
  const isRunning = POMODORO_RUNNING_PHASES.has(phase);
  const isPaused = phase === 'paused';
  const isIdle = phase === 'idle';
  const isCompleted = phase === 'completed';
  const canStart = isIdle || isCompleted;
  const suppressionText = getPomodoroAutoStartSuppressionText(payload);
  const phaseBadge = document.getElementById('pomodoroPhaseText');
  const protectedScheduleActive = Boolean(payload?.protectedScheduleActive);
  const protectedScheduleReason = getMessage('popupPomodoroProtectedScheduleReason');

  phaseBadge.textContent = phaseLabel;
  phaseBadge.dataset.state = phase;
  document.getElementById('pomodoroRemainingText').textContent = remainingText;
  setTextWithTitle('pomodoroPlanText', planName);
  setTextWithTitle(
    'pomodoroSessionText',
    [
      getMessage('popupWorkSessionsCompleted', [completedWorkSessions]),
      getPomodoroPolicyText(payload),
      suppressionText
    ].filter(Boolean).join(' · ')
  );
  setTextWithTitle(
    'pomodoroActivityText',
    activityStatus ? formatPomodoroActivityText(activityStatus) : getMessage('popupActivityUnknownLabel')
  );
  renderPomodoroTimeline(payload);

  const startButton = document.getElementById('startPomodoroButton');
  const pauseButton = document.getElementById('pausePomodoroButton');
  const resumeButton = document.getElementById('resumePomodoroButton');
  const resetButton = document.getElementById('resetPomodoroButton');

  startButton.disabled = !payload?.canStart || !canStart;
  pauseButton.disabled = protectedScheduleActive || !isRunning;
  resumeButton.disabled = !isPaused;
  resetButton.disabled = protectedScheduleActive || isIdle;
  pauseButton.title = protectedScheduleActive ? protectedScheduleReason : '';
  resetButton.title = protectedScheduleActive ? protectedScheduleReason : '';
  renderProtectionSummary();
}

async function refreshPomodoroState() {
  const payload = await sendRuntimeMessage({ action: 'getPomodoroState' });
  renderPomodoroState(payload);
}

async function runPomodoroCommand(action) {
  const response = await sendRuntimeMessage({ action });
  if (response?.status === 'error') {
    setStatus(response.reason || getMessage('popupPomodoroActionFailed'));
    await refreshPomodoroState();
    return;
  }

  if (action === 'resetPomodoro') {
    const activeTab = await getActiveTab();
    if (activeTab?.id && !isExtensionPage(activeTab.url)) {
      await sendTabMessage(activeTab.id, { action: 'clearPomodoroStrictBreakBlock' });
    }
  }

  renderPomodoroState(response);
  await refreshBlockDiagnostics();
}

function getElementText(elementId) {
  return document.getElementById(elementId)?.textContent || '';
}

function getCompactIntentDiagnostics(debugState = latestIntentDebugState) {
  const activeSession = debugState?.activeSession || null;
  const visits = Array.isArray(activeSession?.visits) ? activeSession.visits : [];
  const latestVisit = visits.at(-1) || null;
  const driftVisit = visits.find(visit => visit.id === activeSession?.firstDriftVisitId) || null;

  if (!activeSession) {
    return {
      active: false,
      riskState: 'none'
    };
  }

  return {
    active: true,
    sessionId: activeSession.id || null,
    riskState: debugState?.intervention?.riskState || activeSession.riskState || null,
    coherenceScore: Number.isFinite(Number(activeSession.coherenceScore))
      ? activeSession.coherenceScore
      : null,
    origin: activeSession.origin || null,
    current: latestVisit,
    firstDrift: driftVisit,
    metrics: activeSession.metrics || null,
    reasonLines: Array.isArray(debugState?.intervention?.reasonLines)
      ? debugState.intervention.reasonLines
      : [],
    intervention: debugState?.intervention || null,
    visitCount: visits.length
  };
}

function getCompactPomodoroDiagnostics(payload = latestPomodoroPayload) {
  if (!payload) {
    return null;
  }

  return {
    runtime: payload.runtime || null,
    timerStatus: payload.timerStatus || null,
    plan: payload.plan ? {
      id: payload.plan.id,
      name: payload.plan.name,
      active: payload.plan.active,
      pomodoro: payload.plan.pomodoro
    } : null,
    activityStatus: payload.activityStatus || null,
    history: payload.history || null,
    canStart: Boolean(payload.canStart),
    autoStartSuppression: payload.autoStartSuppression || null
  };
}

function buildPopupDiagnosticsPayload() {
  const pageSummary = getProtectionPageSummary();
  const pomodoroSummary = getPomodoroSummary();
  const intentSummary = getIntentSummary();
  const activePlans = getActivePlans();

  return {
    generatedAt: new Date().toISOString(),
    extensionVersion: chrome.runtime.getManifest().version,
    activeTab: latestActiveTab ? {
      id: latestActiveTab.id ?? null,
      url: latestActiveTab.url || null,
      title: latestActiveTab.title || null
    } : null,
    protection: {
      badge: {
        text: getElementText('protectionStatusBadge'),
        state: document.getElementById('protectionStatusBadge')?.dataset.state || null
      },
      plans: {
        activeCount: activePlans.length,
        activeNames: activePlans.map(plan => plan.name),
        totalCount: cachedPlans.length,
        text: getElementText('activePlansText')
      },
      page: {
        ...pageSummary,
        text: getElementText('currentProtectionText') || pageSummary.text
      },
      pomodoro: {
        ...pomodoroSummary,
        text: getElementText('pomodoroProtectionText') || pomodoroSummary.text
      },
      intent: {
        ...intentSummary,
        text: getElementText('intentProtectionText') || intentSummary.text
      }
    },
    block: latestBlockDebugState,
    pageSignals: latestPageSignalSnapshot,
    pomodoro: getCompactPomodoroDiagnostics(),
    intent: getCompactIntentDiagnostics()
  };
}

async function copyPopupDiagnostics() {
  const button = document.getElementById('copyDiagnosticsButton');
  button.disabled = true;

  try {
    await refreshPomodoroState();
    await refreshBlockDiagnostics();
    await refreshIntentDiagnostics();
    await copyTextToClipboard(JSON.stringify(buildPopupDiagnosticsPayload(), null, 2));
    setStatus(getMessage('popupDiagnosticsCopied'));
  } catch (error) {
    setStatus(getMessage('popupCouldNotCopyDiagnostics'));
  } finally {
    button.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initializePopup().catch(error => {
    console.error('Failed to initialize popup:', error);
  });
});

async function initializePopup() {
  await initializeUiLanguage();
  localizePopup();
  initializePopupTabs();
  loadTheme();
  redirectExtensionTabsToOptions();
  refreshPlanSummary();
  refreshIntentDiagnostics();
  refreshBlockDiagnostics();
  refreshPomodoroState();
  pomodoroRefreshInterval = window.setInterval(refreshPomodoroState, 1000);
  blockDiagnosticsRefreshInterval = window.setInterval(refreshBlockDiagnostics, 2000);

  mediaQuery.addEventListener('change', () => {
    chrome.storage.sync.get({ [THEME_STORAGE_KEY]: DEFAULT_THEME_MODE }, result => {
      applyTheme(normalizeThemeMode(result[THEME_STORAGE_KEY]));
    });
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes[THEME_STORAGE_KEY]) {
      applyTheme(normalizeThemeMode(changes[THEME_STORAGE_KEY].newValue));
    }

    if (areaName === 'sync' && changes[PLANS_STORAGE_KEY]) {
      cachedPlans = normalizePlans(changes[PLANS_STORAGE_KEY].newValue);
      renderProtectionSummary();
    }

    if (areaName === 'sync' && changes[UI_LANGUAGE_STORAGE_KEY]) {
      initializeUiLanguage()
        .then(() => {
          localizePopup();
          renderProtectionSummary();
          renderPomodoroState(latestPomodoroPayload);
          renderBlockDiagnostics(latestBlockDebugState);
          renderPageSignals(latestPageSignalSnapshot);
          renderIntentDiagnostics(latestIntentDebugState);
        })
        .catch(error => {
          console.error('Failed to sync popup language:', error);
        });
    }
  });

  document.getElementById('pickElementButton').addEventListener('click', startElementPicker);
  document.getElementById('headerOptionsButton').addEventListener('click', openOptions);
  document.getElementById('startPomodoroButton').addEventListener('click', () => runPomodoroCommand('startPomodoro'));
  document.getElementById('pausePomodoroButton').addEventListener('click', () => runPomodoroCommand('pausePomodoro'));
  document.getElementById('resumePomodoroButton').addEventListener('click', () => runPomodoroCommand('resumePomodoro'));
  document.getElementById('resetPomodoroButton').addEventListener('click', () => runPomodoroCommand('resetPomodoro'));
  document.getElementById('openPomodoroPanelButton').addEventListener('click', openPomodoroMiniPanel);
  document.getElementById('refreshBlockDiagnosticsButton').addEventListener('click', refreshBlockDiagnostics);
  document.getElementById('copyDiagnosticsButton').addEventListener('click', copyPopupDiagnostics);
  document.getElementById('refreshIntentButton').addEventListener('click', refreshIntentDiagnostics);
  document.getElementById('clearIntentButton').addEventListener('click', clearIntentDiagnostics);
  document.getElementById('openOptionsButton').addEventListener('click', openOptions);
}

window.addEventListener('pagehide', () => {
  if (pomodoroRefreshInterval) {
    window.clearInterval(pomodoroRefreshInterval);
    pomodoroRefreshInterval = null;
  }

  if (blockDiagnosticsRefreshInterval) {
    window.clearInterval(blockDiagnosticsRefreshInterval);
    blockDiagnosticsRefreshInterval = null;
  }
});
