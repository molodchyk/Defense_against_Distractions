// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { isPlanActive } from '../../shared/plans.js';
import {
  POMODORO_PHASES,
  formatDuration,
  normalizePomodoroSettings
} from '../../shared/pomodoro.js';
import {
  createButton,
  createCheckboxInput,
  createLabeledCheckbox,
  createLabeledControl,
  createNumberInput,
  createPlanSubsection
} from './dom.js';
import { getPlanMessage } from './messages.js';

let planPomodoroStatusInterval = null;

export function createPlanPomodoroEditor(plan, isLocked, { onSaveSettings }) {
  const section = createPlanSubsection('planPomodoroLabel');
  const settings = normalizePomodoroSettings(plan.pomodoro);
  const settingsInputsDisabled = false;
  const enabledInput = createCheckboxInput(settings.enabled, settingsInputsDisabled);
  const strictBreaksInput = createCheckboxInput(settings.strictBreaks, settingsInputsDisabled);
  const autoStartInput = createCheckboxInput(settings.autoStart, settingsInputsDisabled);
  const workInput = createNumberInput(settings.workMinutes, 1, 1440, settingsInputsDisabled);
  const shortBreakInput = createNumberInput(settings.shortBreakMinutes, 1, 1440, settingsInputsDisabled);
  const longBreakInput = createNumberInput(settings.longBreakMinutes, 1, 1440, settingsInputsDisabled);
  const sessionsInput = createNumberInput(settings.sessionsBeforeLongBreak, 1, 12, settingsInputsDisabled);

  const grid = document.createElement('div');
  grid.className = 'plan-pomodoro-grid';
  grid.appendChild(createLabeledControl(getPlanMessage('pomodoroWorkMinutesLabel'), workInput));
  grid.appendChild(createLabeledControl(getPlanMessage('pomodoroShortBreakMinutesLabel'), shortBreakInput));
  grid.appendChild(createLabeledControl(getPlanMessage('pomodoroLongBreakMinutesLabel'), longBreakInput));
  grid.appendChild(createLabeledControl(getPlanMessage('pomodoroSessionsBeforeLongBreakLabel'), sessionsInput));

  const toggles = document.createElement('div');
  toggles.className = 'plan-checkbox-grid';
  toggles.appendChild(createLabeledCheckbox(getPlanMessage('pomodoroEnabledLabel'), enabledInput));
  toggles.appendChild(createLabeledCheckbox(getPlanMessage('pomodoroStrictBreaksLabel'), strictBreaksInput));
  toggles.appendChild(createLabeledCheckbox(getPlanMessage('pomodoroAutoStartLabel'), autoStartInput));

  const actions = document.createElement('div');
  actions.className = 'plan-entry-actions';

  const saveButton = createButton(getPlanMessage('pomodoroSaveLabel'), () => {
    onSaveSettings(plan.id, normalizePomodoroSettings({
      enabled: enabledInput.checked,
      workMinutes: workInput.value,
      shortBreakMinutes: shortBreakInput.value,
      longBreakMinutes: longBreakInput.value,
      sessionsBeforeLongBreak: sessionsInput.value,
      strictBreaks: strictBreaksInput.checked,
      autoStart: autoStartInput.checked
    }));
  }, 'save-button');

  actions.appendChild(saveButton);
  section.appendChild(createPlanPomodoroRuntimePanel(plan, isLocked));
  section.appendChild(toggles);
  section.appendChild(grid);
  section.appendChild(actions);
  return section;
}

export function startPlanPomodoroStatusPolling(plan, shouldPoll) {
  stopPlanPomodoroStatusPolling();
  if (!plan || !shouldPoll) {
    return;
  }

  refreshVisiblePlanPomodoroStatus(plan.id).catch(error => console.error('Failed to refresh Pomodoro status:', error));
  planPomodoroStatusInterval = window.setInterval(() => {
    refreshVisiblePlanPomodoroStatus(plan.id).catch(error => console.error('Failed to refresh Pomodoro status:', error));
  }, 1000);
}

export function stopPlanPomodoroStatusPolling() {
  if (planPomodoroStatusInterval) {
    window.clearInterval(planPomodoroStatusInterval);
    planPomodoroStatusInterval = null;
  }
}

export function getPlanPomodoroRuntimeControlState({
  isLocked = false,
  canStartTargetPlan = false,
  hasRuntimePlan = false,
  ownsRuntime = false,
  phase = POMODORO_PHASES.IDLE
} = {}) {
  const isRunning = ownsRuntime && [
    POMODORO_PHASES.WORK,
    POMODORO_PHASES.SHORT_BREAK,
    POMODORO_PHASES.LONG_BREAK
  ].includes(phase);
  const isPaused = ownsRuntime && phase === POMODORO_PHASES.PAUSED;
  const isCompleted = ownsRuntime && phase === POMODORO_PHASES.COMPLETED;
  const isIdle = phase === POMODORO_PHASES.IDLE;
  const canStartFromCurrentState = canStartTargetPlan && (!hasRuntimePlan || isCompleted);

  return {
    startDisabled: !canStartFromCurrentState,
    pauseDisabled: isLocked || !isRunning,
    resumeDisabled: !isPaused,
    resetDisabled: isLocked || !ownsRuntime || isIdle
  };
}

function createPlanPomodoroRuntimePanel(plan, isLocked) {
  const panel = document.createElement('div');
  const settings = normalizePomodoroSettings(plan.pomodoro);
  const active = isPlanActive(plan);
  panel.className = 'plan-pomodoro-runtime';
  panel.dataset.planPomodoroRuntime = plan.id;
  panel.dataset.planPomodoroLocked = isLocked ? 'true' : 'false';
  panel.dataset.planPomodoroCanStart = settings.enabled && active ? 'true' : 'false';
  panel.dataset.planPomodoroEnabled = settings.enabled ? 'true' : 'false';
  panel.dataset.planPomodoroActive = active ? 'true' : 'false';
  panel.dataset.planPomodoroWorkMinutes = String(settings.workMinutes);
  panel.dataset.planPomodoroShortBreakMinutes = String(settings.shortBreakMinutes);
  panel.dataset.planPomodoroLongBreakMinutes = String(settings.longBreakMinutes);
  panel.dataset.planPomodoroSessionsBeforeLongBreak = String(settings.sessionsBeforeLongBreak);

  const status = document.createElement('div');
  status.className = 'plan-pomodoro-runtime-status';

  const phase = document.createElement('strong');
  phase.dataset.planPomodoroPhase = 'true';
  phase.textContent = 'Idle';

  const detail = document.createElement('span');
  detail.dataset.planPomodoroDetail = 'true';
  detail.textContent = getPlanMessage('pomodoroIdleStatus');

  const activity = document.createElement('span');
  activity.dataset.planPomodoroActivity = 'true';
  activity.textContent = getPlanMessage('pomodoroActivityUnknown');

  status.appendChild(phase);
  status.appendChild(detail);
  status.appendChild(activity);

  const timeline = document.createElement('dl');
  timeline.className = 'plan-pomodoro-timeline';
  timeline.dataset.planPomodoroTimeline = 'true';
  timeline.setAttribute('aria-label', 'Pomodoro timing details');

  const controls = document.createElement('div');
  controls.className = 'plan-pomodoro-runtime-actions';

  const startButton = createButton(getPlanMessage('pomodoroStartLabel'), () => runPlanPomodoroCommand('startPomodoro', plan.id), 'secondary-button');
  startButton.dataset.planPomodoroStart = 'true';
  startButton.disabled = !settings.enabled || !active;

  const pauseButton = createButton(getPlanMessage('pomodoroPauseLabel'), () => runPlanPomodoroCommand('pausePomodoro', plan.id), 'secondary-button');
  pauseButton.dataset.planPomodoroPause = 'true';
  pauseButton.disabled = true;

  const resumeButton = createButton(getPlanMessage('pomodoroResumeLabel'), () => runPlanPomodoroCommand('resumePomodoro', plan.id), 'secondary-button');
  resumeButton.dataset.planPomodoroResume = 'true';
  resumeButton.disabled = true;

  const resetButton = createButton(getPlanMessage('pomodoroResetLabel'), () => runPlanPomodoroCommand('resetPomodoro', plan.id), 'delete-button');
  resetButton.dataset.planPomodoroReset = 'true';
  resetButton.disabled = true;

  controls.appendChild(startButton);
  controls.appendChild(pauseButton);
  controls.appendChild(resumeButton);
  controls.appendChild(resetButton);

  panel.appendChild(status);
  panel.appendChild(timeline);
  panel.appendChild(controls);
  return panel;
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

function getPanelPomodoroSettings(panel) {
  return normalizePomodoroSettings({
    enabled: panel.dataset.planPomodoroEnabled === 'true',
    workMinutes: panel.dataset.planPomodoroWorkMinutes,
    shortBreakMinutes: panel.dataset.planPomodoroShortBreakMinutes,
    longBreakMinutes: panel.dataset.planPomodoroLongBreakMinutes,
    sessionsBeforeLongBreak: panel.dataset.planPomodoroSessionsBeforeLongBreak
  });
}

function getPlanPomodoroBreakDurationMs(phase, settings = {}, completedWorkSessions = 0) {
  const shortBreakMinutes = Number(settings.shortBreakMinutes || 0);
  const longBreakMinutes = Number(settings.longBreakMinutes || 0);
  const sessionsBeforeLongBreak = Math.max(1, Number(settings.sessionsBeforeLongBreak || 1));

  if (phase === POMODORO_PHASES.LONG_BREAK) {
    return longBreakMinutes * 60 * 1000;
  }

  if (phase === POMODORO_PHASES.SHORT_BREAK) {
    return shortBreakMinutes * 60 * 1000;
  }

  const nextCompletedCount = completedWorkSessions + 1;
  return nextCompletedCount % sessionsBeforeLongBreak === 0
    ? longBreakMinutes * 60 * 1000
    : shortBreakMinutes * 60 * 1000;
}

function createPlanPomodoroTimelineRow(label, value) {
  const row = document.createElement('div');
  const term = document.createElement('dt');
  const description = document.createElement('dd');

  term.textContent = label;
  description.textContent = value || '--';
  row.append(term, description);
  return row;
}

function getPlanPomodoroIdleState(panel, payload, ownsRuntime) {
  if (payload?.runtime?.activePlanId && !ownsRuntime) {
    return getPlanMessage('pomodoroAnotherPlanRunningLabel');
  }

  if (panel.dataset.planPomodoroEnabled !== 'true') {
    return getPlanMessage('pomodoroDisabledLabel');
  }

  if (panel.dataset.planPomodoroActive !== 'true') {
    return getPlanMessage('pomodoroInactivePlanLabel');
  }

  return getPlanMessage('pomodoroReadyToStartLabel');
}

function renderPlanPomodoroTimeline(panel, payload, ownsRuntime) {
  const list = panel.querySelector('[data-plan-pomodoro-timeline]');
  if (!list) {
    return;
  }

  const runtime = ownsRuntime ? payload?.runtime || {} : {};
  const status = ownsRuntime ? payload?.timerStatus || {} : {};
  const phase = ownsRuntime ? status.phase || runtime.phase || POMODORO_PHASES.IDLE : POMODORO_PHASES.IDLE;
  const settings = ownsRuntime
    ? normalizePomodoroSettings(status.settings || payload?.plan?.pomodoro)
    : getPanelPomodoroSettings(panel);
  const completedWorkSessions = Number(status.completedWorkSessions || 0);
  const restCreditMs = Number.isFinite(Number(status.effectiveRestCreditMs))
    ? Number(status.effectiveRestCreditMs)
    : Number(status.restCreditMs || 0);
  const upcomingBreakMs = getPlanPomodoroBreakDurationMs(phase, settings, completedWorkSessions);
  const restStillNeededMs = Number.isFinite(Number(status.restStillNeededMs))
    ? Math.max(0, Number(status.restStillNeededMs))
    : Math.max(0, upcomingBreakMs - restCreditMs);
  const rows = [];

  if (phase === POMODORO_PHASES.WORK) {
    rows.push(createPlanPomodoroTimelineRow(getPlanMessage('pomodoroWorkStartedLabel'), formatClock(runtime.phaseStartedAt)));
    rows.push(createPlanPomodoroTimelineRow(getPlanMessage('pomodoroNextBreakLabel'), formatClock(runtime.phaseEndsAt)));
    rows.push(createPlanPomodoroTimelineRow(getPlanMessage('pomodoroRequiredRestLabel'), formatDuration(upcomingBreakMs)));
    rows.push(createPlanPomodoroTimelineRow(getPlanMessage('pomodoroRestCreditedLabel'), formatDuration(restCreditMs)));
    rows.push(createPlanPomodoroTimelineRow(getPlanMessage('pomodoroRestStillNeededLabel'), formatDuration(restStillNeededMs)));
    if (status.restSatisfiedByCredit) {
      rows.push(createPlanPomodoroTimelineRow(getPlanMessage('pomodoroReturnBehaviorLabel'), getPlanMessage('pomodoroReturnStartsNewWork')));
    }
  } else if ([POMODORO_PHASES.SHORT_BREAK, POMODORO_PHASES.LONG_BREAK].includes(phase)) {
    rows.push(createPlanPomodoroTimelineRow(getPlanMessage('pomodoroBreakStartedLabel'), formatClock(runtime.phaseStartedAt)));
    rows.push(createPlanPomodoroTimelineRow(getPlanMessage('pomodoroBreakEndsLabel'), formatClock(runtime.phaseEndsAt)));
    rows.push(createPlanPomodoroTimelineRow(getPlanMessage('pomodoroRequiredRestLabel'), formatDuration(upcomingBreakMs)));
    rows.push(createPlanPomodoroTimelineRow(getPlanMessage('pomodoroNextWorkLabel'), getPlanMessage('pomodoroNextWorkAfterRestLabel')));
  } else if (phase === POMODORO_PHASES.COMPLETED) {
    rows.push(createPlanPomodoroTimelineRow(getPlanMessage('pomodoroRestSatisfiedLabel'), formatClock(runtime.phaseStartedAt || runtime.lastCompletedAt)));
    rows.push(createPlanPomodoroTimelineRow(getPlanMessage('pomodoroNextWorkLabel'), getPlanMessage('pomodoroNextWorkOnActivityLabel')));
    rows.push(createPlanPomodoroTimelineRow(getPlanMessage('pomodoroCompletedBlocksLabel'), String(completedWorkSessions)));
  } else if (phase === POMODORO_PHASES.PAUSED) {
    rows.push(createPlanPomodoroTimelineRow(getPlanMessage('pomodoroPausedAtLabel'), formatClock(runtime.pausedAt)));
    rows.push(createPlanPomodoroTimelineRow(getPlanMessage('pomodoroPausedPhaseLabel'), runtime.pausedPhase || '--'));
    rows.push(createPlanPomodoroTimelineRow(getPlanMessage('pomodoroRemainingLabel'), status.remainingText || '--'));
  } else {
    rows.push(createPlanPomodoroTimelineRow(getPlanMessage('pomodoroTimerStateLabel'), getPlanPomodoroIdleState(panel, payload, ownsRuntime)));
    rows.push(createPlanPomodoroTimelineRow(
      getPlanMessage('pomodoroConfiguredCycleLabel'),
      `${Number(settings.workMinutes || 0)}m work / ${Number(settings.shortBreakMinutes || 0)}m rest`
    ));
  }

  list.replaceChildren(...rows);
}

function sendPlanRuntimeMessage(message) {
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

async function runPlanPomodoroCommand(action, planId) {
  const response = await sendPlanRuntimeMessage({ action, planId });
  if (response?.status === 'error') {
    alert(response.reason || 'Pomodoro action failed.');
  }
  refreshVisiblePlanPomodoroStatus(planId).catch(error => console.error('Failed to refresh Pomodoro status:', error));
}

async function refreshVisiblePlanPomodoroStatus(planId) {
  const panel = document.querySelector(`[data-plan-pomodoro-runtime="${planId}"]`);
  if (!panel) {
    return;
  }

  const payload = await sendPlanRuntimeMessage({ action: 'getPomodoroState' });
  renderPlanPomodoroRuntimePanel(panel, payload, planId);
}

function renderPlanPomodoroRuntimePanel(panel, payload, planId) {
  const timerStatus = payload?.timerStatus || {};
  const phase = timerStatus.phase || POMODORO_PHASES.IDLE;
  const ownsRuntime = payload?.runtime?.activePlanId === planId;
  const isLocked = panel.dataset.planPomodoroLocked === 'true';
  const canStartTargetPlan = panel.dataset.planPomodoroCanStart === 'true';
  const hasRuntimePlan = Boolean(payload?.runtime?.activePlanId);
  const hasOtherRuntime = hasRuntimePlan && !ownsRuntime;
  const isCompleted = ownsRuntime && phase === POMODORO_PHASES.COMPLETED;
  const phaseLabel = timerStatus.restSatisfiedByCredit
    ? getPlanMessage('pomodoroRestSatisfiedLabel')
    : (timerStatus.phaseLabel || 'Idle');
  const remainingText = timerStatus.remainingText || '0:00';
  const activityStatus = payload?.activityStatus;
  const controls = getPlanPomodoroRuntimeControlState({
    isLocked,
    canStartTargetPlan,
    hasRuntimePlan,
    ownsRuntime,
    phase
  });

  panel.querySelector('[data-plan-pomodoro-phase]').textContent = ownsRuntime
    ? (isCompleted || timerStatus.restSatisfiedByCredit ? phaseLabel : `${phaseLabel} · ${remainingText}`)
    : 'Idle';
  panel.querySelector('[data-plan-pomodoro-detail]').textContent = ownsRuntime
    ? `${payload?.plan?.name || 'Pomodoro'} · ${timerStatus.completedWorkSessions || 0} work sessions completed`
    : (hasOtherRuntime ? `${payload?.plan?.name || 'Pomodoro'} · ${getPlanMessage('pomodoroAnotherPlanRunningLabel')}` : getPlanMessage('pomodoroIdleStatus'));
  panel.querySelector('[data-plan-pomodoro-activity]').textContent = activityStatus
    ? `${activityStatus.stateLabel} · active today ${activityStatus.activeTodayText}`
    : getPlanMessage('pomodoroActivityUnknown');
  renderPlanPomodoroTimeline(panel, payload, ownsRuntime);

  panel.querySelector('[data-plan-pomodoro-start]').disabled = controls.startDisabled;
  panel.querySelector('[data-plan-pomodoro-pause]').disabled = controls.pauseDisabled;
  panel.querySelector('[data-plan-pomodoro-resume]').disabled = controls.resumeDisabled;
  panel.querySelector('[data-plan-pomodoro-reset]').disabled = controls.resetDisabled;
}
