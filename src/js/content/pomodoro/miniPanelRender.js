// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};

  const BREAK_PHASES = new Set(['shortBreak', 'longBreak']);

  function getMessage(key, fallback, substitutions) {
    const uiMessage = global.DAD.UiLanguage?.getMessage?.(key, fallback, substitutions);
    if (uiMessage) {
      return uiMessage;
    }

    try {
      return global.chrome?.i18n?.getMessage?.(key, substitutions) || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function formatDuration(milliseconds) {
    const totalSeconds = Math.max(0, Math.floor(Number(milliseconds || 0) / 1000));
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

  function formatClock(value) {
    const date = new Date(value || '');
    if (!Number.isFinite(date.getTime())) {
      return '--';
    }

    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getBreakDurationMs(phase, settings = {}, completedWorkSessions = 0) {
    const shortBreakMinutes = Number(settings.shortBreakMinutes || 0);
    const longBreakMinutes = Number(settings.longBreakMinutes || 0);
    const sessionsBeforeLongBreak = Math.max(1, Number(settings.sessionsBeforeLongBreak || 1));

    if (phase === 'longBreak') {
      return longBreakMinutes * 60 * 1000;
    }

    if (phase === 'shortBreak') {
      return shortBreakMinutes * 60 * 1000;
    }

    const nextCompletedCount = completedWorkSessions + 1;
    return nextCompletedCount % sessionsBeforeLongBreak === 0
      ? longBreakMinutes * 60 * 1000
      : shortBreakMinutes * 60 * 1000;
  }

  function createRow(label, value) {
    const row = document.createElement('div');
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label;
    description.textContent = value || '--';
    row.append(term, description);
    return row;
  }

  function getPhaseRows(runtime, status, payload) {
    const settings = status.settings || {};
    const phase = status.phase || runtime.phase || 'idle';
    const upcomingBreakMs = getBreakDurationMs(phase, settings, status.completedWorkSessions || 0);
    const restCreditMs = upcomingBreakMs > 0
      ? Math.min(Number(status.restCreditMs || 0), upcomingBreakMs)
      : Number(status.restCreditMs || 0);
    const restStillNeededMs = Math.max(0, upcomingBreakMs - restCreditMs);

    if (phase === 'work') {
      return [
        createRow(getMessage('pomodoroWorkStartedLabel', 'Work started'), formatClock(runtime.phaseStartedAt)),
        createRow(getMessage('pomodoroNextBreakLabel', 'Next break'), formatClock(runtime.phaseEndsAt)),
        createRow(getMessage('pomodoroRestCreditedLabel', 'Rest already credited'), formatDuration(restCreditMs)),
        createRow(getMessage('pomodoroRestStillNeededLabel', 'Rest still needed'), formatDuration(restStillNeededMs))
      ];
    }

    if (BREAK_PHASES.has(phase)) {
      return [
        createRow(getMessage('pomodoroBreakStartedLabel', 'Break started'), formatClock(runtime.phaseStartedAt)),
        createRow(getMessage('pomodoroBreakEndsLabel', 'Break ends'), formatClock(runtime.phaseEndsAt)),
        createRow(getMessage('pomodoroRequiredRestLabel', 'Required rest'), formatDuration(upcomingBreakMs))
      ];
    }

    if (phase === 'completed') {
      return [
        createRow(getMessage('pomodoroRestSatisfiedLabel', 'Rest satisfied'), formatClock(runtime.phaseStartedAt || runtime.lastCompletedAt)),
        createRow(getMessage('pomodoroNextWorkLabel', 'Next work'), getMessage('pomodoroNextWorkOnActivityLabel', 'when activity returns'))
      ];
    }

    if (phase === 'paused') {
      return [
        createRow(getMessage('pomodoroPausedAtLabel', 'Paused at'), formatClock(runtime.pausedAt)),
        createRow(getMessage('pomodoroPausedPhaseLabel', 'Paused phase'), runtime.pausedPhase || '--'),
        createRow(getMessage('pomodoroRemainingLabel', 'Remaining'), status.remainingText || '0:00')
      ];
    }

    return [
      createRow(getMessage('pomodoroTimerStateLabel', 'Timer state'), payload?.canStart
        ? getMessage('pomodoroReadyToStartLabel', 'ready to start')
        : getMessage('popupNoActivePlan', 'No active plan'))
    ];
  }

  function render(panel, payload) {
    if (!panel) {
      return;
    }

    const runtime = payload?.runtime || {};
    const status = payload?.timerStatus || {};
    const phase = status.phase || runtime.phase || 'idle';
    const planName = payload?.plan?.name || getMessage('popupNoActivePomodoroPlan', 'No active Pomodoro plan');
    const historyTotals = payload?.history?.totals || {};
    const activityStatus = payload?.activityStatus || {};
    const details = panel.querySelector('[data-dad-mini-details]');
    const rows = getPhaseRows(runtime, status, payload);

    panel.querySelector('[data-dad-mini-time]').textContent = status.remainingText || '0:00';
    const phaseElement = panel.querySelector('[data-dad-mini-phase]');
    phaseElement.textContent = status.phaseLabel || getMessage('popupIdleLabel', 'Idle');
    phaseElement.dataset.phase = phase;
    panel.querySelector('[data-dad-mini-plan]').textContent = planName;

    if (activityStatus.stateLabel) {
      rows.push(createRow(getMessage('popupActivityStateLabel', 'System state'), activityStatus.systemStateForText
        ? `${activityStatus.stateLabel} - ${activityStatus.systemStateForText}`
        : activityStatus.stateLabel));
    }

    rows.push(createRow(getMessage('pomodoroHistoryWorkSessionsLabel', 'Work sessions'), String(historyTotals.workSessionsCompleted || 0)));
    rows.push(createRow(getMessage('pomodoroHistoryCreditedRestLabel', 'Rest credited'), formatDuration(historyTotals.creditedRestMs || 0)));
    rows.push(createRow(getMessage('pomodoroHistorySkippedBreaksLabel', 'Breaks skipped'), String(historyTotals.skippedBreaks || 0)));

    details.replaceChildren(...rows);
  }

  global.DAD.PomodoroMiniPanelRender = {
    formatClock,
    formatDuration,
    render
  };
})(window);
