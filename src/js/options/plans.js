// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { createDefaultSchedule, formatScheduleTime, getNextUnnamedScheduleName } from '../shared/scheduleForm.js';
import { savePlansWithPriority } from '../shared/criticalScheduleStorage.js';
import { getSync, setSync } from '../shared/chromeStorage.js';
import {
  cloneSchedule,
  createScheduleBoardWorkspace
} from './scheduleBoard.js';
import {
  getNextPlanName,
  isInProtectedSchedule,
  isPlanActive,
  normalizePlan,
  normalizePlans,
  PLAN_COUNTER_STORAGE_KEY,
  PLANS_STORAGE_KEY
} from '../shared/plans.js';
import { normalizeUrl } from '../shared/url.js';
import {
  POMODORO_PHASES,
  formatDuration,
  normalizePomodoroSettings
} from '../shared/pomodoro.js';
import {
  INTENT_INTERVENTION_ACTIONS,
  INTENT_POMODORO_INFLUENCE_MODES,
  normalizeIntentSettings
} from '../shared/intentCoherence.js';
import { doSchedulesOverlap, hasMinimumUnlockedTime, isScheduleMoreStrict } from '../shared/scheduleRules.js';
import { isCurrentTimeInAnySchedule, timeStringToMinutes } from '../shared/scheduleTime.js';
import { createScheduleRangeFromStart, SCHEDULE_GRID_DAYS } from '../shared/scheduleGrid.js';
import {
  confirmDestructiveAction,
  createButton,
  createCheckboxInput,
  createIconButton,
  createLabeledCheckbox,
  createLabeledControl,
  createNumberInput,
  createPlanSubsection,
  createSelectInput,
  createTextNavigationButton
} from './planDom.js';
import { uniqueStrings } from './planCollections.js';
import { createPlanEntriesEditor } from './planEntriesEditor.js';
import {
  ELEMENT_RULE_IDS_STORAGE_KEY,
  ELEMENT_RULE_ITEM_PREFIX,
  getElementRuleSummaries
} from './planElementRules.js';
import { createPlanFactList } from './planFacts.js';
import { ensureDefaultPlan } from './planMigration.js';
import { getMessage, getPlanMessage } from './planMessages.js';
import {
  normalizePlanScheduleAnchorDate,
  normalizePlanScheduleWeekInterval
} from './planScheduleModel.js';

let activePlanView = null;
const selectedPlanScheduleIndexes = new Map();
const planScheduleDrafts = new Map();
const expandedPlanScheduleIds = new Set();
let planPomodoroStatusInterval = null;
const NEW_PLAN_SCHEDULE_INDEX = -1;

export function initializePlans() {
  localizePlanShell();
  bindPlanShellEvents();
  ensureDefaultPlan().then(renderPlans).catch(error => {
    console.error('Failed to initialize plans:', error);
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync') return;

    const shouldRender = Boolean(
      changes[PLANS_STORAGE_KEY]
        || changes.schedules
        || changes.whitelistedSites
        || changes[ELEMENT_RULE_IDS_STORAGE_KEY]
        || Object.keys(changes).some(key => key.startsWith('group_') || key.startsWith(ELEMENT_RULE_ITEM_PREFIX))
    );

    if (shouldRender) {
      ensureDefaultPlan().then(renderPlans).catch(error => {
        console.error('Failed to sync plans UI:', error);
      });
    }
  });
}

function localizePlanShell() {
  const heading = document.getElementById('plansHeading');
  const input = document.getElementById('planNameInput');
  const button = document.getElementById('addPlanButton');

  if (heading) heading.textContent = getPlanMessage('plansHeading');
  if (input) input.placeholder = getPlanMessage('planNamePlaceholder');
  if (button) button.textContent = getPlanMessage('addPlanButton');
}

function bindPlanShellEvents() {
  const input = document.getElementById('planNameInput');
  const button = document.getElementById('addPlanButton');

  if (button) {
    button.addEventListener('click', addPlan);
  }

  if (input) {
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        addPlan();
      }
    });
  }
}

export async function renderPlans() {
  const list = document.getElementById('planList');
  if (!list) return;

  const items = await getSync(null);
  const plans = normalizePlans(items[PLANS_STORAGE_KEY]);
  const elementRules = await getElementRuleSummaries(items);
  const isLocked = isInProtectedSchedule(items);

  if (activePlanView && !plans.some(plan => plan.id === activePlanView.planId)) {
    activePlanView = null;
  }

  list.innerHTML = '';
  setPlanAddRowVisible(!activePlanView);

  if (activePlanView) {
    const activePlan = plans.find(plan => plan.id === activePlanView.planId);
    list.appendChild(createPlanPage(activePlan, plans, elementRules, isLocked));
    startPlanPomodoroStatusPolling(activePlan);
    return;
  }

  stopPlanPomodoroStatusPolling();
  plans.forEach(plan => list.appendChild(createPlanItem(plan, isLocked)));
}

function setPlanAddRowVisible(isVisible) {
  const input = document.getElementById('planNameInput');
  const addRow = input?.closest('.input-group');
  if (addRow) {
    addRow.hidden = !isVisible;
  }
}

function createPlanItem(plan, isLocked) {
  const normalizedPlan = normalizePlan(plan);
  const item = document.createElement('li');
  item.className = 'plan-item';

  const summary = document.createElement('div');
  summary.className = 'plan-summary';

  const deleteButton = createIconButton(
    getPlanMessage('deleteButtonLabel'),
    () => confirmDeletePlan(normalizedPlan.id),
    'plan-delete-icon'
  );
  deleteButton.disabled = isLocked;

  const titleGroup = document.createElement('div');
  titleGroup.className = 'plan-title-group';

  const title = document.createElement('strong');
  title.textContent = normalizedPlan.name;

  const meta = createPlanFactList(normalizedPlan);

  titleGroup.appendChild(title);
  titleGroup.appendChild(meta);

  const navigation = document.createElement('div');
  navigation.className = 'plan-row-navigation';
  navigation.appendChild(createTextNavigationButton(getPlanMessage('planSchedulesLabel'), () => openPlanView(normalizedPlan.id, 'schedule')));
  navigation.appendChild(createTextNavigationButton(getPlanMessage('planEntriesLabel'), () => openPlanView(normalizedPlan.id, 'entries')));
  navigation.appendChild(createTextNavigationButton(getPlanMessage('planPomodoroLabel'), () => openPlanView(normalizedPlan.id, 'pomodoro')));
  navigation.appendChild(createTextNavigationButton(getPlanMessage('planIntentLabel'), () => openPlanView(normalizedPlan.id, 'intent')));

  const actions = document.createElement('div');
  actions.className = 'plan-summary-actions';

  const enabledButton = createButton(
    normalizedPlan.enabled ? getPlanMessage('planEnabledLabel') : getPlanMessage('planDisabledLabel'),
    () => updatePlan(normalizedPlan.id, next => ({ ...next, enabled: !next.enabled })),
    normalizedPlan.enabled ? 'plan-toggle active' : 'plan-toggle'
  );
  enabledButton.disabled = isLocked && normalizedPlan.enabled;

  actions.appendChild(enabledButton);

  summary.appendChild(deleteButton);
  summary.appendChild(titleGroup);
  summary.appendChild(navigation);
  summary.appendChild(actions);
  item.appendChild(summary);

  return item;
}

function createPlanPage(plan, plans, elementRules, isLocked) {
  const page = document.createElement('li');
  page.className = 'plan-page';

  const header = document.createElement('div');
  header.className = 'plan-page-header';

  const backButton = createTextNavigationButton(getPlanMessage('backToPlansLabel'), () => {
    activePlanView = null;
    renderPlans();
  });
  backButton.classList.add('plan-back-button');

  const titleGroup = document.createElement('div');
  titleGroup.className = 'plan-title-group';
  const title = document.createElement('strong');
  title.textContent = plan.name;
  const meta = createPlanFactList(plan);
  titleGroup.appendChild(title);
  titleGroup.appendChild(meta);

  const navigation = document.createElement('div');
  navigation.className = 'plan-page-navigation';
  navigation.appendChild(createPlanPageTab('schedule', getPlanMessage('planSchedulesLabel')));
  navigation.appendChild(createPlanPageTab('entries', getPlanMessage('planEntriesLabel')));
  navigation.appendChild(createPlanPageTab('pomodoro', getPlanMessage('planPomodoroLabel')));
  navigation.appendChild(createPlanPageTab('intent', getPlanMessage('planIntentLabel')));

  header.appendChild(backButton);
  header.appendChild(titleGroup);
  header.appendChild(navigation);
  page.appendChild(header);

  if (activePlanView.view === 'schedule') {
    page.appendChild(createPlanScheduleEditor(plan, isLocked));
  } else if (activePlanView.view === 'pomodoro') {
    page.appendChild(createPlanPomodoroEditor(plan, isLocked));
  } else if (activePlanView.view === 'intent') {
    page.appendChild(createPlanIntentEditor(plan, isLocked));
  } else {
    page.appendChild(createPlanEntriesEditor({
      plan,
      plans,
      elementRules,
      isLocked,
      onRenamePlan: (planId, nextName) => updatePlan(planId, next => ({ ...next, name: nextName })),
      onAddGroup: addPlanGroup,
      onUpdateGroup: updatePlanGroup,
      onDeleteGroup: deletePlanGroup,
      onAddAllowedSite: addAllowedSite,
      onDeleteAllowedSite: deleteAllowedSite,
      onUpdateUiRuleIds: (planId, nextRuleIds) => {
        updatePlan(planId, next => ({ ...next, uiRuleIds: nextRuleIds }));
      }
    }));
  }

  return page;
}

function createPlanPageTab(view, label) {
  const button = createTextNavigationButton(label, () => openPlanView(activePlanView.planId, view));
  if (activePlanView.view === view) {
    button.classList.add('active');
  }

  return button;
}

function openPlanView(planId, view) {
  activePlanView = { planId, view };
  renderPlans();
}

function createPlanPomodoroEditor(plan, isLocked) {
  const section = createPlanSubsection('planPomodoroLabel');
  const settings = normalizePomodoroSettings(plan.pomodoro);
  const enabledInput = createCheckboxInput(settings.enabled, isLocked);
  const strictBreaksInput = createCheckboxInput(settings.strictBreaks, isLocked);
  const autoStartInput = createCheckboxInput(settings.autoStart, isLocked);
  const workInput = createNumberInput(settings.workMinutes, 1, 1440, isLocked);
  const shortBreakInput = createNumberInput(settings.shortBreakMinutes, 1, 1440, isLocked);
  const longBreakInput = createNumberInput(settings.longBreakMinutes, 1, 1440, isLocked);
  const sessionsInput = createNumberInput(settings.sessionsBeforeLongBreak, 1, 12, isLocked);

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
    updatePlan(plan.id, next => ({
      ...next,
      pomodoro: normalizePomodoroSettings({
        enabled: enabledInput.checked,
        workMinutes: workInput.value,
        shortBreakMinutes: shortBreakInput.value,
        longBreakMinutes: longBreakInput.value,
        sessionsBeforeLongBreak: sessionsInput.value,
        strictBreaks: strictBreaksInput.checked,
        autoStart: autoStartInput.checked
      })
    }));
  }, 'save-button');
  saveButton.disabled = isLocked;

  actions.appendChild(saveButton);
  section.appendChild(createPlanPomodoroRuntimePanel(plan, isLocked));
  section.appendChild(toggles);
  section.appendChild(grid);
  section.appendChild(actions);
  return section;
}

function createPlanIntentEditor(plan, isLocked) {
  const section = createPlanSubsection('planIntentLabel');
  const settings = normalizeIntentSettings(plan.intent);

  const hint = document.createElement('p');
  hint.className = 'muted-text';
  hint.textContent = getPlanMessage('intentSettingsHint');

  const enabledInput = createCheckboxInput(settings.enabled, isLocked);
  const autoCalibrationInput = createCheckboxInput(settings.autoCalibration, isLocked);
  const actionSelect = createSelectInput([
    [INTENT_INTERVENTION_ACTIONS.WARN, getPlanMessage('intentActionWarnLabel')],
    [INTENT_INTERVENTION_ACTIONS.GRAYSCALE, getPlanMessage('intentActionGrayscaleLabel')],
    [INTENT_INTERVENTION_ACTIONS.PROMPT, getPlanMessage('intentActionPromptLabel')],
    [INTENT_INTERVENTION_ACTIONS.BLOCK, getPlanMessage('intentActionBlockLabel')]
  ], settings.action, isLocked);
  const interventionInput = createNumberInput(settings.interventionThreshold, 1, 99, isLocked);
  const lockedInput = createNumberInput(settings.lockedThreshold, 0, 98, isLocked);
  const pomodoroInfluenceSelect = createSelectInput([
    [INTENT_POMODORO_INFLUENCE_MODES.IGNORE, getPlanMessage('intentPomodoroIgnoreLabel')],
    [INTENT_POMODORO_INFLUENCE_MODES.WORK_STRICTER, getPlanMessage('intentPomodoroWorkStricterLabel')],
    [INTENT_POMODORO_INFLUENCE_MODES.BREAK_LENIENT, getPlanMessage('intentPomodoroBreakLenientLabel')],
    [INTENT_POMODORO_INFLUENCE_MODES.BOTH, getPlanMessage('intentPomodoroBothLabel')]
  ], settings.pomodoroInfluence, isLocked);
  const diagnosticsRetentionInput = createNumberInput(settings.diagnosticsRetentionDays, 1, 30, isLocked);

  const toggles = document.createElement('div');
  toggles.className = 'plan-checkbox-grid';
  toggles.appendChild(createLabeledCheckbox(getPlanMessage('intentEnabledLabel'), enabledInput));
  toggles.appendChild(createLabeledCheckbox(getPlanMessage('intentAutoCalibrationLabel'), autoCalibrationInput));

  const grid = document.createElement('div');
  grid.className = 'plan-pomodoro-grid';
  grid.appendChild(createLabeledControl(getPlanMessage('intentActionLabel'), actionSelect));
  grid.appendChild(createLabeledControl(getPlanMessage('intentInterventionThresholdLabel'), interventionInput));
  grid.appendChild(createLabeledControl(getPlanMessage('intentLockedThresholdLabel'), lockedInput));
  grid.appendChild(createLabeledControl(getPlanMessage('intentPomodoroInfluenceLabel'), pomodoroInfluenceSelect));
  grid.appendChild(createLabeledControl(getPlanMessage('intentDiagnosticsRetentionLabel'), diagnosticsRetentionInput));

  const actions = document.createElement('div');
  actions.className = 'plan-entry-actions';

  const saveButton = createButton(getPlanMessage('intentSaveLabel'), () => {
    updatePlan(plan.id, next => ({
      ...next,
      intent: normalizeIntentSettings({
        enabled: enabledInput.checked,
        action: actionSelect.value,
        interventionThreshold: interventionInput.value,
        lockedThreshold: lockedInput.value,
        pomodoroInfluence: pomodoroInfluenceSelect.value,
        diagnosticsRetentionDays: diagnosticsRetentionInput.value,
        autoCalibration: autoCalibrationInput.checked
      })
    }));
  }, 'save-button');
  saveButton.disabled = isLocked;

  actions.appendChild(saveButton);
  section.appendChild(hint);
  section.appendChild(toggles);
  section.appendChild(grid);
  section.appendChild(actions);
  return section;
}

function createPlanPomodoroRuntimePanel(plan, isLocked) {
  const panel = document.createElement('div');
  const settings = normalizePomodoroSettings(plan.pomodoro);
  panel.className = 'plan-pomodoro-runtime';
  panel.dataset.planPomodoroRuntime = plan.id;
  panel.dataset.planPomodoroLocked = isLocked ? 'true' : 'false';
  panel.dataset.planPomodoroCanStart = settings.enabled && isPlanActive(plan) ? 'true' : 'false';
  panel.dataset.planPomodoroEnabled = settings.enabled ? 'true' : 'false';
  panel.dataset.planPomodoroActive = isPlanActive(plan) ? 'true' : 'false';
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
  startButton.disabled = isLocked || !plan.pomodoro.enabled || !isPlanActive(plan);

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
  const restCreditMs = Number(status.restCreditMs || 0);
  const upcomingBreakMs = getPlanPomodoroBreakDurationMs(phase, settings, completedWorkSessions);
  const rows = [];

  if (phase === POMODORO_PHASES.WORK) {
    rows.push(createPlanPomodoroTimelineRow(getPlanMessage('pomodoroWorkStartedLabel'), formatClock(runtime.phaseStartedAt)));
    rows.push(createPlanPomodoroTimelineRow(getPlanMessage('pomodoroNextBreakLabel'), formatClock(runtime.phaseEndsAt)));
    rows.push(createPlanPomodoroTimelineRow(getPlanMessage('pomodoroRequiredRestLabel'), formatDuration(upcomingBreakMs)));
    rows.push(createPlanPomodoroTimelineRow(getPlanMessage('pomodoroRestCreditedLabel'), formatDuration(restCreditMs)));
    rows.push(createPlanPomodoroTimelineRow(getPlanMessage('pomodoroRestStillNeededLabel'), formatDuration(Math.max(0, upcomingBreakMs - restCreditMs))));
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
  refreshVisiblePlanPomodoroStatus().catch(error => console.error('Failed to refresh Pomodoro status:', error));
}

function startPlanPomodoroStatusPolling(plan) {
  stopPlanPomodoroStatusPolling();
  if (!plan || activePlanView?.view !== 'pomodoro') {
    return;
  }

  refreshVisiblePlanPomodoroStatus().catch(error => console.error('Failed to refresh Pomodoro status:', error));
  planPomodoroStatusInterval = window.setInterval(() => {
    refreshVisiblePlanPomodoroStatus().catch(error => console.error('Failed to refresh Pomodoro status:', error));
  }, 1000);
}

function stopPlanPomodoroStatusPolling() {
  if (planPomodoroStatusInterval) {
    window.clearInterval(planPomodoroStatusInterval);
    planPomodoroStatusInterval = null;
  }
}

async function refreshVisiblePlanPomodoroStatus() {
  if (!activePlanView || activePlanView.view !== 'pomodoro') {
    return;
  }

  const panel = document.querySelector(`[data-plan-pomodoro-runtime="${activePlanView.planId}"]`);
  if (!panel) {
    return;
  }

  const payload = await sendPlanRuntimeMessage({ action: 'getPomodoroState' });
  renderPlanPomodoroRuntimePanel(panel, payload, activePlanView.planId);
}

function renderPlanPomodoroRuntimePanel(panel, payload, planId) {
  const timerStatus = payload?.timerStatus || {};
  const phase = timerStatus.phase || POMODORO_PHASES.IDLE;
  const ownsRuntime = payload?.runtime?.activePlanId === planId;
  const isLocked = panel.dataset.planPomodoroLocked === 'true';
  const canStartTargetPlan = panel.dataset.planPomodoroCanStart === 'true';
  const hasRuntimePlan = Boolean(payload?.runtime?.activePlanId);
  const hasOtherRuntime = hasRuntimePlan && !ownsRuntime;
  const isRunning = ownsRuntime && [
    POMODORO_PHASES.WORK,
    POMODORO_PHASES.SHORT_BREAK,
    POMODORO_PHASES.LONG_BREAK
  ].includes(phase);
  const isPaused = ownsRuntime && phase === POMODORO_PHASES.PAUSED;
  const isCompleted = ownsRuntime && phase === POMODORO_PHASES.COMPLETED;
  const isIdle = phase === POMODORO_PHASES.IDLE;
  const phaseLabel = timerStatus.phaseLabel || 'Idle';
  const remainingText = timerStatus.remainingText || '0:00';
  const canStartFromCurrentState = canStartTargetPlan && (!hasRuntimePlan || isCompleted);
  const activityStatus = payload?.activityStatus;

  panel.querySelector('[data-plan-pomodoro-phase]').textContent = ownsRuntime
    ? (isCompleted ? phaseLabel : `${phaseLabel} · ${remainingText}`)
    : 'Idle';
  panel.querySelector('[data-plan-pomodoro-detail]').textContent = ownsRuntime
    ? `${payload?.plan?.name || 'Pomodoro'} · ${timerStatus.completedWorkSessions || 0} work sessions completed`
    : (hasOtherRuntime ? `${payload?.plan?.name || 'Pomodoro'} · ${getPlanMessage('pomodoroAnotherPlanRunningLabel')}` : getPlanMessage('pomodoroIdleStatus'));
  panel.querySelector('[data-plan-pomodoro-activity]').textContent = activityStatus
    ? `${activityStatus.stateLabel} · active today ${activityStatus.activeTodayText}`
    : getPlanMessage('pomodoroActivityUnknown');
  renderPlanPomodoroTimeline(panel, payload, ownsRuntime);

  panel.querySelector('[data-plan-pomodoro-start]').disabled = isLocked || !canStartFromCurrentState;
  panel.querySelector('[data-plan-pomodoro-pause]').disabled = isLocked || !isRunning;
  panel.querySelector('[data-plan-pomodoro-resume]').disabled = isLocked || !isPaused;
  panel.querySelector('[data-plan-pomodoro-reset]').disabled = isLocked || !ownsRuntime || isIdle;
}

function createPlanScheduleEditor(plan, isLocked) {
  const section = createPlanSubsection('planSchedulesLabel');
  const isExpanded = expandedPlanScheduleIds.has(plan.id);
  section.classList.add('plan-schedule-section');
  if (isExpanded) {
    section.classList.add('plan-schedule-section-expanded');
  }

  attachPlanScheduleHeaderActions(section, plan.id, isExpanded);

  const addRow = document.createElement('div');
  addRow.className = 'plan-schedule-add-row';

  const addButton = createButton(getPlanMessage('addPlanScheduleButton'), () => {
    addPlanSchedule(plan.id);
  }, 'schedule-add-button');
  addButton.disabled = isLocked;

  addRow.appendChild(addButton);
  section.appendChild(addRow);

  let selectedIndex = getSelectedPlanScheduleIndex(plan);
  if (isLocked) {
    planScheduleDrafts.delete(plan.id);
    if (selectedIndex === NEW_PLAN_SCHEDULE_INDEX) {
      selectedPlanScheduleIndexes.delete(plan.id);
      selectedIndex = getSelectedPlanScheduleIndex(plan);
    }
  }
  const draftSchedule = isLocked ? null : getPlanScheduleDraft(plan, selectedIndex);

  if (plan.schedules.length === 0 && !draftSchedule) {
    const empty = document.createElement('p');
    empty.className = 'muted-text';
    empty.textContent = getPlanMessage('noPlanSchedulesLabel');
    section.appendChild(empty);
  }

  const board = createScheduleBoardWorkspace({
    schedules: plan.schedules,
    selectedIndex,
    draftSchedule,
    message: (key, fallback, substitutions) => getPlanMessage(key, fallback, substitutions),
    onSelect: index => selectPlanSchedule(plan.id, plan.schedules, index),
    onDraftChange: draft => updatePlanScheduleDraft(plan.id, draft),
    onSave: () => saveSelectedPlanSchedule(plan.id),
    onCancel: () => resetPlanScheduleDraft(plan.id, plan.schedules),
    onDelete: () => deleteSelectedPlanSchedule(plan.id),
    onCreateFromGrid: schedule => addPlanScheduleFromGrid(plan.id, schedule),
    canDeleteSchedule: schedule => !isLocked && !isCurrentTimeInAnySchedule([schedule]),
    canDeselectDay: (day, schedule) => canDeselectPlanScheduleDay(isLocked, day, schedule),
    showScheduleNames: false,
    readOnly: isLocked
  });

  section.appendChild(board);
  return section;
}

function attachPlanScheduleHeaderActions(section, planId, isExpanded) {
  const heading = section.querySelector('h4');
  if (!heading) {
    return;
  }

  const header = document.createElement('div');
  header.className = 'plan-subsection-header';
  section.insertBefore(header, heading);
  header.appendChild(heading);

  const expandButton = createButton(
    isExpanded ? getPlanMessage('collapseScheduleGraphLabel') : getPlanMessage('expandScheduleGraphLabel'),
    () => togglePlanScheduleExpanded(planId),
    'secondary-button schedule-expand-button'
  );
  header.appendChild(expandButton);
}

function togglePlanScheduleExpanded(planId) {
  if (expandedPlanScheduleIds.has(planId)) {
    expandedPlanScheduleIds.delete(planId);
  } else {
    expandedPlanScheduleIds.add(planId);
  }

  renderPlans();
}

function getSelectedPlanScheduleIndex(plan) {
  const selectedIndex = selectedPlanScheduleIndexes.get(plan.id);

  if (selectedIndex === NEW_PLAN_SCHEDULE_INDEX) {
    return NEW_PLAN_SCHEDULE_INDEX;
  }

  if (plan.schedules.length === 0) {
    selectedPlanScheduleIndexes.delete(plan.id);
    planScheduleDrafts.delete(plan.id);
    return null;
  }

  if (Number.isInteger(selectedIndex) && selectedIndex >= 0 && selectedIndex < plan.schedules.length) {
    return selectedIndex;
  }

  selectedPlanScheduleIndexes.set(plan.id, 0);
  return 0;
}

function getPlanScheduleDraft(plan, selectedIndex) {
  if (selectedIndex === null) {
    return null;
  }

  const draft = planScheduleDrafts.get(plan.id);
  if (draft) {
    return cloneSchedule(draft);
  }

  if (selectedIndex === NEW_PLAN_SCHEDULE_INDEX) {
    return null;
  }

  return cloneSchedule(plan.schedules[selectedIndex]);
}

function selectPlanSchedule(planId, schedules, scheduleIndex) {
  if (!Number.isInteger(scheduleIndex) || scheduleIndex < 0 || scheduleIndex >= schedules.length) {
    return;
  }

  selectedPlanScheduleIndexes.set(planId, scheduleIndex);
  planScheduleDrafts.set(planId, cloneSchedule(schedules[scheduleIndex]));
  renderPlans().catch(error => console.error('Failed to select plan schedule:', error));
}

function updatePlanScheduleDraft(planId, draftSchedule) {
  planScheduleDrafts.set(planId, cloneSchedule(draftSchedule));
  renderPlans().catch(error => console.error('Failed to update plan schedule draft:', error));
}

function resetPlanScheduleDraft(planId, schedules) {
  const selectedIndex = selectedPlanScheduleIndexes.get(planId);
  if (selectedIndex === NEW_PLAN_SCHEDULE_INDEX) {
    selectedPlanScheduleIndexes.delete(planId);
    planScheduleDrafts.delete(planId);
    renderPlans().catch(error => console.error('Failed to reset plan schedule draft:', error));
    return;
  }

  if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= schedules.length) {
    planScheduleDrafts.delete(planId);
    renderPlans().catch(error => console.error('Failed to reset plan schedule draft:', error));
    return;
  }

  planScheduleDrafts.set(planId, cloneSchedule(schedules[selectedIndex]));
  renderPlans().catch(error => console.error('Failed to reset plan schedule draft:', error));
}

function canDeselectPlanScheduleDay(isLocked, day, schedule) {
  if (isLocked && schedule.days.includes(day)) {
    alert(getPlanMessage('lockedScheduleErrorMessage'));
    return false;
  }

  return true;
}

async function addPlan() {
  const input = document.getElementById('planNameInput');
  const items = await getSync(null);
  const plans = normalizePlans(items[PLANS_STORAGE_KEY]);
  const nextName = input.value.trim() || getNextPlanName(plans, 'Plan ');

  if (plans.some(plan => plan.name.toLowerCase() === nextName.toLowerCase())) {
    alert(getPlanMessage('planNameExists'));
    return;
  }

  const nextCounter = Number(items[PLAN_COUNTER_STORAGE_KEY] || plans.length || 0) + 1;
  const nextPlan = normalizePlan({
    id: `plan_${nextCounter}`,
    name: nextName,
    enabled: true,
    groupIds: [],
    allowedSites: [],
    uiRuleIds: [],
    schedules: [],
    pomodoro: {},
    intent: {}
  });
  const nextPlans = [...plans, nextPlan];

  await savePlansWithPriority(nextPlans);
  await setSync({ [PLAN_COUNTER_STORAGE_KEY]: nextCounter });
  activePlanView = { planId: nextPlan.id, view: 'entries' };
  input.value = '';
  await renderPlans();
}

async function confirmDeletePlan(planId) {
  const confirmed = await confirmDestructiveAction({
    message: getPlanMessage('confirmDeletePlan')
  });
  if (!confirmed) {
    return;
  }

  await deletePlan(planId);
}

async function deletePlan(planId) {
  const items = await getSync(null);
  if (isInProtectedSchedule(items)) {
    alert(getPlanMessage('lockedScheduleErrorMessage'));
    return;
  }

  const plans = normalizePlans(items[PLANS_STORAGE_KEY]).filter(plan => plan.id !== planId);
  await savePlansWithPriority(plans);
  if (activePlanView?.planId === planId) {
    activePlanView = null;
  }
  selectedPlanScheduleIndexes.delete(planId);
  planScheduleDrafts.delete(planId);
  expandedPlanScheduleIds.delete(planId);
  await renderPlans();
}

async function updatePlan(planId, updater) {
  const items = await getSync(null);
  const plans = normalizePlans(items[PLANS_STORAGE_KEY]);
  const planIndex = plans.findIndex(plan => plan.id === planId);
  if (planIndex === -1) return;

  const originalPlan = plans[planIndex];
  const nextPlan = normalizePlan(typeof updater === 'function' ? updater(originalPlan) : { ...originalPlan, ...updater });

  if (isInProtectedSchedule(items) && !isPlanChangeAllowedDuringProtectedSchedule(originalPlan, nextPlan)) {
    alert(getPlanMessage('lockedScheduleErrorMessage'));
    return;
  }

  plans[planIndex] = nextPlan;
  await savePlansWithPriority(plans);
  await renderPlans();
}

async function addPlanGroup(planId, requestedName) {
  const groupId = `${planId}_entry_${Date.now().toString(36)}`;

  await updatePlan(planId, plan => ({
    ...plan,
    groupIds: [],
    groups: [
      ...plan.groups,
      {
        id: groupId,
        groupName: requestedName || `Entry ${plan.groups.length + 1}`,
        websites: [],
        keywords: []
      }
    ]
  }));
}

async function updatePlanGroup(planId, groupIndex, group) {
  await updatePlan(planId, plan => ({
    ...plan,
    groupIds: [],
    groups: plan.groups.map((candidate, index) => (
      index === groupIndex ? group : candidate
    ))
  }));
}

async function deletePlanGroup(planId, groupIndex) {
  const confirmed = await confirmDestructiveAction({
    message: getPlanMessage('confirmDeletePlanEntry')
  });
  if (!confirmed) {
    return;
  }

  await updatePlan(planId, plan => ({
    ...plan,
    groupIds: [],
    groups: plan.groups.filter((group, index) => index !== groupIndex)
  }));
}

async function addAllowedSite(planId, value) {
  const allowedSite = normalizeUrl(value);
  if (!allowedSite) {
    return;
  }

  await updatePlan(planId, plan => ({
    ...plan,
    allowedSites: uniqueStrings([...plan.allowedSites, allowedSite])
  }));
}

async function deleteAllowedSite(planId, siteIndex) {
  const confirmed = await confirmDestructiveAction({
    message: getPlanMessage('confirmDeleteAllowedSite')
  });
  if (!confirmed) {
    return;
  }

  await updatePlan(planId, plan => ({
    ...plan,
    allowedSites: plan.allowedSites.filter((site, index) => index !== siteIndex)
  }));
}

async function addPlanSchedule(planId) {
  const items = await getSync(null);
  if (isInProtectedSchedule(items)) {
    alert(getPlanMessage('lockedScheduleErrorMessage'));
    return;
  }

  const plans = normalizePlans(items[PLANS_STORAGE_KEY]);
  const plan = plans.find(candidate => candidate.id === planId);
  if (!plan) return;

  selectedPlanScheduleIndexes.set(planId, NEW_PLAN_SCHEDULE_INDEX);
  planScheduleDrafts.set(planId, createUnsavedPlanScheduleDraft(plan));
  await renderPlans();
}

async function addPlanScheduleFromGrid(planId, draftSchedule) {
  const items = await getSync(null);
  if (isInProtectedSchedule(items)) {
    alert(getPlanMessage('lockedScheduleErrorMessage'));
    return;
  }

  const plans = normalizePlans(items[PLANS_STORAGE_KEY]);
  const planIndex = plans.findIndex(candidate => candidate.id === planId);
  if (planIndex === -1) return;

  const plan = plans[planIndex];
  const scheduleName = getNextUnnamedScheduleName(plan.schedules, getMessage('unnamedSchedulePrefix') || 'Schedule ');
  const schedule = {
    ...createDefaultSchedule(scheduleName),
    ...draftSchedule,
    name: scheduleName,
    days: SCHEDULE_GRID_DAYS.filter(day => draftSchedule.days?.includes(day)),
    startTime: formatScheduleTime(draftSchedule.startTime || '00:00'),
    endTime: formatScheduleTime(draftSchedule.endTime || '00:15'),
    weekInterval: normalizePlanScheduleWeekInterval(draftSchedule.weekInterval),
    anchorDate: normalizePlanScheduleAnchorDate(draftSchedule.anchorDate),
    isActive: true
  };

  selectedPlanScheduleIndexes.set(planId, NEW_PLAN_SCHEDULE_INDEX);
  planScheduleDrafts.set(planId, cloneSchedule(schedule));
  await renderPlans();
}

async function saveSelectedPlanSchedule(planId) {
  const items = await getSync(null);
  const plans = normalizePlans(items[PLANS_STORAGE_KEY]);
  const planIndex = plans.findIndex(candidate => candidate.id === planId);
  if (planIndex === -1) return;

  const plan = plans[planIndex];
  const scheduleIndex = selectedPlanScheduleIndexes.get(planId);
  if (!Number.isInteger(scheduleIndex)) {
    return;
  }

  const isNewSchedule = scheduleIndex === NEW_PLAN_SCHEDULE_INDEX;
  if (!isNewSchedule && !plan.schedules[scheduleIndex]) {
    return;
  }

  const draftSchedule = planScheduleDrafts.get(planId) || plan.schedules[scheduleIndex];
  if (!draftSchedule) {
    return;
  }

  const normalizedSchedule = normalizePlanScheduleForSave(draftSchedule, plan.schedules, scheduleIndex);
  const nextSchedules = isNewSchedule
    ? [...plan.schedules, normalizedSchedule]
    : plan.schedules.map((candidate, index) => (
      index === scheduleIndex ? normalizedSchedule : candidate
    ));

  if (!validatePlanSchedules(nextSchedules)) {
    return;
  }

  if (
    !isNewSchedule
      && isInProtectedSchedule(items)
      && plan.enabled
      && !isScheduleMoreStrict(plan.schedules[scheduleIndex], normalizedSchedule)
  ) {
    alert(getPlanMessage('cannotRelaxConstraints'));
    return;
  }

  plans[planIndex] = normalizePlan({
    ...plan,
    schedules: nextSchedules
  });

  await savePlansWithPriority(plans);
  selectedPlanScheduleIndexes.set(planId, isNewSchedule ? nextSchedules.length - 1 : scheduleIndex);
  planScheduleDrafts.set(planId, cloneSchedule(normalizedSchedule));
  await renderPlans();
}

async function deleteSelectedPlanSchedule(planId) {
  const selectedIndex = selectedPlanScheduleIndexes.get(planId);
  if (!Number.isInteger(selectedIndex)) {
    return;
  }

  if (selectedIndex === NEW_PLAN_SCHEDULE_INDEX) {
    selectedPlanScheduleIndexes.delete(planId);
    planScheduleDrafts.delete(planId);
    await renderPlans();
    return;
  }

  const confirmed = await confirmDestructiveAction({
    message: getPlanMessage('confirmDeletePlanSchedule')
  });
  if (!confirmed) {
    return;
  }

  await deletePlanSchedule(planId, selectedIndex);
}

async function deletePlanSchedule(planId, scheduleIndex) {
  const items = await getSync(null);
  if (isInProtectedSchedule(items)) {
    alert(getPlanMessage('lockedScheduleErrorMessage'));
    return;
  }

  const plans = normalizePlans(items[PLANS_STORAGE_KEY]);
  const planIndex = plans.findIndex(candidate => candidate.id === planId);
  if (planIndex === -1 || !plans[planIndex].schedules[scheduleIndex]) {
    return;
  }

  const nextSchedules = plans[planIndex].schedules.filter((schedule, index) => index !== scheduleIndex);
  plans[planIndex] = normalizePlan({
    ...plans[planIndex],
    schedules: nextSchedules
  });

  await savePlansWithPriority(plans);

  if (nextSchedules.length === 0) {
    selectedPlanScheduleIndexes.delete(planId);
    planScheduleDrafts.delete(planId);
  } else {
    const nextSelectedIndex = Math.min(scheduleIndex, nextSchedules.length - 1);
    selectedPlanScheduleIndexes.set(planId, nextSelectedIndex);
    planScheduleDrafts.set(planId, cloneSchedule(nextSchedules[nextSelectedIndex]));
  }

  await renderPlans();
}

function normalizePlanScheduleForSave(schedule, schedules, scheduleIndex) {
  const selectedDays = Array.isArray(schedule.days) ? schedule.days : [];

  return {
    ...schedule,
    name: String(schedule.name || '').trim()
      || schedules[scheduleIndex]?.name
      || getNextUnnamedScheduleName(schedules, getMessage('unnamedSchedulePrefix') || 'Schedule '),
    startTime: formatScheduleTime(schedule.startTime || schedules[scheduleIndex]?.startTime || '00:00'),
    endTime: formatScheduleTime(schedule.endTime || schedules[scheduleIndex]?.endTime || '23:59'),
    days: SCHEDULE_GRID_DAYS.filter(day => selectedDays.includes(day)),
    weekInterval: normalizePlanScheduleWeekInterval(schedule.weekInterval ?? schedules[scheduleIndex]?.weekInterval),
    anchorDate: normalizePlanScheduleAnchorDate(schedule.anchorDate || schedules[scheduleIndex]?.anchorDate),
    isActive: true
  };
}

function createUnsavedPlanScheduleDraft(plan) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const nextHourMinutes = Math.min(Math.ceil(currentMinutes / 60) * 60, 23 * 60);
  const scheduleName = getNextUnnamedScheduleName(plan.schedules, getMessage('unnamedSchedulePrefix') || 'Schedule ');

  return {
    ...createDefaultSchedule(scheduleName),
    ...createScheduleRangeFromStart(nextHourMinutes),
    name: scheduleName,
    days: [now.toLocaleString('en-US', { weekday: 'short' })],
    weekInterval: 1,
    anchorDate: normalizePlanScheduleAnchorDate(''),
    isActive: true
  };
}

function validatePlanSchedules(schedules) {
  const scheduleWithoutDays = schedules.find(schedule => !Array.isArray(schedule.days) || schedule.days.length === 0);
  if (scheduleWithoutDays) {
    alert(getPlanMessage('scheduleNeedsDayError'));
    return false;
  }

  const invalidSchedule = schedules.find(schedule => {
    const startMinutes = timeStringToMinutes(schedule.startTime);
    const endMinutes = timeStringToMinutes(schedule.endTime);
    return !Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || endMinutes <= startMinutes;
  });
  if (invalidSchedule) {
    alert(getPlanMessage('endTimeAfterStartTimeError'));
    return false;
  }

  if (doSchedulesOverlap(schedules)) {
    alert(getPlanMessage('schedulesOverlapError'));
    return false;
  }

  if (!hasMinimumUnlockedTime(schedules)) {
    alert(getPlanMessage('minimumUnlockedTimeError'));
    return false;
  }

  return true;
}

function isPlanChangeAllowedDuringProtectedSchedule(originalPlan, nextPlan) {
  if (originalPlan.enabled && !nextPlan.enabled) {
    return false;
  }

  if (!originalPlan.groupIds.every(groupId => nextPlan.groupIds.includes(groupId))) {
    return false;
  }

  if (JSON.stringify(originalPlan.groups) !== JSON.stringify(nextPlan.groups)) {
    return false;
  }

  if (nextPlan.allowedSites.some(site => !originalPlan.allowedSites.includes(site))) {
    return false;
  }

  if (!originalPlan.uiRuleIds.every(ruleId => nextPlan.uiRuleIds.includes(ruleId))) {
    return false;
  }

  if (JSON.stringify(originalPlan.pomodoro) !== JSON.stringify(nextPlan.pomodoro)) {
    return false;
  }

  if (JSON.stringify(originalPlan.intent) !== JSON.stringify(nextPlan.intent)) {
    return false;
  }

  return true;
}
