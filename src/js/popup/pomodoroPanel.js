// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  createTimelineRow,
  setTextWithTitle
} from './dom.js';
import {
  formatClock,
  formatDuration,
  getBreakDurationMs
} from './format.js';

const RUNNING_PHASES = new Set(['work', 'shortBreak', 'longBreak']);
const BREAK_PHASES = new Set(['shortBreak', 'longBreak']);

export function getPomodoroSummary(payload, getMessage) {
  if (payload?.autoStartSuppression?.active) {
    return {
      state: 'idle',
      text: payload.autoStartSuppression.global
        ? getMessage('popupAutoStartPaused')
        : getMessage('popupAutoStartDelayed')
    };
  }

  if (payload?.timerStatus?.restSatisfiedByCredit) {
    return {
      state: 'ready',
      text: getMessage('popupRestSatisfied')
    };
  }

  const phase = payload?.timerStatus?.phase || payload?.runtime?.phase || 'idle';
  const phaseLabel = payload?.timerStatus?.phaseLabel || getMessage('popupIdleLabel');
  const remainingText = payload?.timerStatus?.remainingText || '0:00';
  const planName = payload?.plan?.name || '';

  if (BREAK_PHASES.has(phase)) {
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

export function getPopupPomodoroRuntimeControlState({
  canStart = false,
  phase = 'idle',
  protectedScheduleActive = false
} = {}) {
  const isRunning = RUNNING_PHASES.has(phase);
  const isPaused = phase === 'paused';
  const isIdle = phase === 'idle';
  const isCompleted = phase === 'completed';
  const canStartPhase = isIdle || isCompleted;

  return {
    startDisabled: !canStart || !canStartPhase,
    pauseDisabled: protectedScheduleActive || !isRunning,
    resumeDisabled: !isPaused,
    resetDisabled: protectedScheduleActive || isIdle
  };
}

export function createPomodoroPanel({
  getMessage,
  getActiveTab,
  isExtensionPage,
  sendRuntimeMessage,
  sendTabMessage,
  setStatus,
  onStateChange,
  onAfterCommand
}) {
  let latestPayload = null;

  function getSummary(payload = latestPayload) {
    return getPomodoroSummary(payload, getMessage);
  }

  function getPolicyText(payload = latestPayload) {
    const pomodoro = payload?.plan?.pomodoro || {};
    const strictText = pomodoro.strictBreaks ? getMessage('popupStrictBreaks') : getMessage('popupAdvisoryBreaks');
    const startText = pomodoro.autoStart ? getMessage('popupAutoStart') : getMessage('popupManualStart');
    return `${strictText} - ${startText}`;
  }

  function getAutoStartSuppressionText(payload = latestPayload) {
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

  function getRestTiming(status, phase, settings) {
    const fallbackRequiredRestMs = getBreakDurationMs(phase, settings, status.completedWorkSessions || 0);
    const requiredRestMs = Number.isFinite(Number(status.requiredRestMs))
      ? Math.max(0, Number(status.requiredRestMs))
      : fallbackRequiredRestMs;
    const effectiveRestCreditMs = Number.isFinite(Number(status.effectiveRestCreditMs))
      ? Math.max(0, Number(status.effectiveRestCreditMs))
      : Math.min(Number(status.restCreditMs || 0), requiredRestMs);
    const restStillNeededMs = Number.isFinite(Number(status.restStillNeededMs))
      ? Math.max(0, Number(status.restStillNeededMs))
      : Math.max(0, requiredRestMs - effectiveRestCreditMs);

    return {
      effectiveRestCreditMs,
      requiredRestMs,
      restStillNeededMs
    };
  }

  async function openMiniPanel() {
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

  function renderTimeline(payload) {
    const list = document.getElementById('pomodoroTimelineList');
    const runtime = payload?.runtime || {};
    const status = payload?.timerStatus || {};
    const activityStatus = payload?.activityStatus || {};
    const phase = status.phase || runtime.phase || 'idle';
    const settings = status.settings || {};
    const {
      effectiveRestCreditMs,
      requiredRestMs,
      restStillNeededMs
    } = getRestTiming(status, phase, settings);
    const historyTotals = payload?.history?.totals || {};
    const suppressionText = getAutoStartSuppressionText(payload);
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
      rows.push(createTimelineRow(getMessage('pomodoroRequiredRestLabel', 'Required rest'), formatDuration(requiredRestMs)));
      if (runtime.restCreditStartedAt || status.restCreditStartedAt) {
        rows.push(createTimelineRow(
          getMessage('pomodoroRestCreditStartedLabel', 'Rest credit started'),
          formatClock(status.restCreditStartedAt || runtime.restCreditStartedAt)
        ));
      }
      rows.push(createTimelineRow(getMessage('pomodoroRestCreditedLabel', 'Rest already credited'), formatDuration(effectiveRestCreditMs)));
      rows.push(createTimelineRow(getMessage('pomodoroRestStillNeededLabel', 'Rest still needed'), formatDuration(restStillNeededMs)));
      if (requiredRestMs > 0 && restStillNeededMs <= 0) {
        rows.push(createTimelineRow(getMessage('pomodoroReturnBehaviorLabel'), getMessage('pomodoroReturnStartsNewWork')));
      }
    } else if (phase === 'shortBreak' || phase === 'longBreak') {
      rows.push(createTimelineRow(getMessage('pomodoroBreakStartedLabel', 'Break started'), formatClock(runtime.phaseStartedAt)));
      rows.push(createTimelineRow(getMessage('pomodoroBreakEndsLabel', 'Break ends'), formatClock(runtime.phaseEndsAt)));
      rows.push(createTimelineRow(getMessage('pomodoroRequiredRestLabel', 'Required rest'), formatDuration(requiredRestMs)));
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
      rows.push(createTimelineRow(getMessage('popupActivityStateLabel', 'System state'), formatActivityText(activityStatus, false)));
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

  function formatActivityText(activityStatus = {}, includeActiveToday = true) {
    const stateLabel = activityStatus.stateLabel || getMessage('popupActivityUnknownLabel');
    const isSystemAway = activityStatus.systemState === 'idle' || activityStatus.systemState === 'locked';
    const stateDuration = activityStatus.systemStateForText || getMessage('popupUnknownLabel');
    const activeToday = activityStatus.activeTodayText || '0s';
    const stateText = isSystemAway
      ? getMessage('popupStateForDuration', [stateLabel, stateDuration])
      : getMessage('popupStateLastActivity', [stateLabel, activityStatus.idleForText || getMessage('popupUnknownLabel')]);

    return includeActiveToday ? getMessage('popupActivityWithActiveToday', [stateText, activeToday]) : stateText;
  }

  function render(payload) {
    latestPayload = payload || null;
    const phase = payload?.timerStatus?.phase || 'idle';
    const phaseLabel = payload?.timerStatus?.phaseLabel || getMessage('popupIdleLabel');
    const remainingText = payload?.timerStatus?.remainingText || '0:00';
    const completedWorkSessions = payload?.timerStatus?.completedWorkSessions || 0;
    const planName = payload?.plan?.name || getMessage('popupNoActivePomodoroPlan');
    const activityStatus = payload?.activityStatus;
    const suppressionText = getAutoStartSuppressionText(payload);
    const phaseBadge = document.getElementById('pomodoroPhaseText');
    const protectedScheduleActive = Boolean(payload?.protectedScheduleActive);
    const protectedScheduleReason = getMessage('popupPomodoroProtectedScheduleReason');
    const controlState = getPopupPomodoroRuntimeControlState({
      canStart: Boolean(payload?.canStart),
      phase,
      protectedScheduleActive
    });

    phaseBadge.textContent = payload?.timerStatus?.restSatisfiedByCredit
      ? getMessage('pomodoroRestSatisfiedLabel', 'Rest satisfied')
      : phaseLabel;
    phaseBadge.dataset.state = phase;
    document.getElementById('pomodoroRemainingText').textContent = remainingText;
    setTextWithTitle('pomodoroPlanText', planName);
    setTextWithTitle(
      'pomodoroSessionText',
      [
        getMessage('popupWorkSessionsCompleted', [completedWorkSessions]),
        getPolicyText(payload),
        suppressionText
      ].filter(Boolean).join(' · ')
    );
    setTextWithTitle(
      'pomodoroActivityText',
      activityStatus ? formatActivityText(activityStatus) : getMessage('popupActivityUnknownLabel')
    );
    renderTimeline(payload);

    const startButton = document.getElementById('startPomodoroButton');
    const pauseButton = document.getElementById('pausePomodoroButton');
    const resumeButton = document.getElementById('resumePomodoroButton');
    const resetButton = document.getElementById('resetPomodoroButton');

    startButton.disabled = controlState.startDisabled;
    pauseButton.disabled = controlState.pauseDisabled;
    resumeButton.disabled = controlState.resumeDisabled;
    resetButton.disabled = controlState.resetDisabled;
    pauseButton.title = protectedScheduleActive ? protectedScheduleReason : '';
    resetButton.title = protectedScheduleActive ? protectedScheduleReason : '';
    onStateChange?.(latestPayload);
  }

  async function refresh() {
    const payload = await sendRuntimeMessage({ action: 'getPomodoroState' });
    render(payload);
    return latestPayload;
  }

  async function runCommand(action) {
    const response = await sendRuntimeMessage({ action });
    if (response?.status === 'error') {
      setStatus(response.reason || getMessage('popupPomodoroActionFailed'));
      await refresh();
      return;
    }

    if (action === 'resetPomodoro') {
      const activeTab = await getActiveTab();
      if (activeTab?.id && !isExtensionPage(activeTab.url)) {
        await sendTabMessage(activeTab.id, { action: 'clearPomodoroStrictBreakBlock' });
      }
    }

    render(response);
    await onAfterCommand?.(response);
  }

  function getCompactDiagnostics(payload = latestPayload) {
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

  function getPayload() {
    return latestPayload;
  }

  return {
    getCompactDiagnostics,
    getPayload,
    getSummary,
    openMiniPanel,
    refresh,
    render,
    runCommand
  };
}
