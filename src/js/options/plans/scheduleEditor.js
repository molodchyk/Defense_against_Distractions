// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { getSync } from '../../../platform/chrome/storage.js';
import { savePlansWithPriority } from '../../../features/plans/storage/criticalScheduleStorage.js';
import { createDefaultSchedule, formatScheduleTime, getNextUnnamedScheduleName } from '../../../features/schedules/core/scheduleForm.js';
import { createScheduleRangeFromStart, SCHEDULE_GRID_DAYS } from '../../../features/schedules/core/scheduleGrid.js';
import { doSchedulesOverlap, hasMinimumUnlockedTime, isScheduleMoreStrict } from '../../../features/schedules/core/scheduleRules.js';
import { isCurrentTimeInAnySchedule, timeStringToMinutes } from '../../../features/schedules/core/scheduleTime.js';
import {
  isInProtectedSchedule,
  normalizePlan,
  normalizePlans,
  PLANS_STORAGE_KEY
} from '../../shared/plans.js';
import {
  cloneSchedule,
  createScheduleBoardWorkspace
} from '../schedules/scheduleBoard.js';
import { confirmDestructiveAction, createButton, createPlanSubsection } from './dom.js';
import { getMessage, getPlanMessage } from './messages.js';
import {
  normalizePlanScheduleAnchorDate,
  normalizePlanScheduleWeekInterval
} from './scheduleModel.js';

const selectedPlanScheduleIndexes = new Map();
const planScheduleDrafts = new Map();
const collapsedPlanScheduleIds = new Set();
const NEW_PLAN_SCHEDULE_INDEX = -1;

let renderPlansCallback = null;

export function createPlanScheduleEditor(plan, isLocked, { onRender } = {}) {
  renderPlansCallback = onRender;

  const section = createPlanSubsection('planSchedulesLabel');
  const isExpanded = !collapsedPlanScheduleIds.has(plan.id);
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

export function clearPlanScheduleState(planId) {
  selectedPlanScheduleIndexes.delete(planId);
  planScheduleDrafts.delete(planId);
  collapsedPlanScheduleIds.delete(planId);
}

function requestRender(context) {
  if (typeof renderPlansCallback !== 'function') {
    return;
  }

  renderPlansCallback().catch(error => console.error(`Failed to ${context}:`, error));
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
  if (collapsedPlanScheduleIds.has(planId)) {
    collapsedPlanScheduleIds.delete(planId);
  } else {
    collapsedPlanScheduleIds.add(planId);
  }

  requestRender('toggle plan schedule expansion');
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
  requestRender('select plan schedule');
}

function updatePlanScheduleDraft(planId, draftSchedule) {
  planScheduleDrafts.set(planId, cloneSchedule(draftSchedule));
  requestRender('update plan schedule draft');
}

function resetPlanScheduleDraft(planId, schedules) {
  const selectedIndex = selectedPlanScheduleIndexes.get(planId);
  if (selectedIndex === NEW_PLAN_SCHEDULE_INDEX) {
    selectedPlanScheduleIndexes.delete(planId);
    planScheduleDrafts.delete(planId);
    requestRender('reset plan schedule draft');
    return;
  }

  if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= schedules.length) {
    planScheduleDrafts.delete(planId);
    requestRender('reset plan schedule draft');
    return;
  }

  planScheduleDrafts.set(planId, cloneSchedule(schedules[selectedIndex]));
  requestRender('reset plan schedule draft');
}

function canDeselectPlanScheduleDay(isLocked, day, schedule) {
  if (isLocked && schedule.days.includes(day)) {
    alert(getPlanMessage('lockedScheduleErrorMessage'));
    return false;
  }

  return true;
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
  await renderPlansCallback?.();
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
  await renderPlansCallback?.();
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
  await renderPlansCallback?.();
}

async function deleteSelectedPlanSchedule(planId) {
  const selectedIndex = selectedPlanScheduleIndexes.get(planId);
  if (!Number.isInteger(selectedIndex)) {
    return;
  }

  if (selectedIndex === NEW_PLAN_SCHEDULE_INDEX) {
    selectedPlanScheduleIndexes.delete(planId);
    planScheduleDrafts.delete(planId);
    await renderPlansCallback?.();
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

  await renderPlansCallback?.();
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
