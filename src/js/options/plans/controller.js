// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { savePlansWithPriority } from '../../shared/criticalScheduleStorage.js';
import { getSync, setSync } from '../../shared/chromeStorage.js';
import {
  getNextPlanName,
  isInProtectedSchedule,
  normalizePlan,
  normalizePlans,
  PLAN_COUNTER_STORAGE_KEY,
  PLANS_STORAGE_KEY
} from '../../shared/plans.js';
import { normalizeUrl } from '../../shared/url.js';
import {
  confirmDestructiveAction,
  createButton,
  createIconButton,
  createTextNavigationButton
} from './dom.js';
import { uniqueStrings } from './collections.js';
import { createPlanEntriesEditor } from './entriesEditor.js';
import {
  ELEMENT_RULE_IDS_STORAGE_KEY,
  ELEMENT_RULE_ITEM_PREFIX,
  getElementRuleSummaries
} from './elementRules.js';
import { createPlanFactList } from './facts.js';
import { createPlanIntentEditor } from './intentEditor.js';
import { ensureDefaultPlan } from './migration.js';
import { getPlanMessage } from './messages.js';
import {
  createPlanPomodoroEditor,
  startPlanPomodoroStatusPolling,
  stopPlanPomodoroStatusPolling
} from './pomodoroEditor.js';
import {
  clearPlanScheduleState,
  createPlanScheduleEditor
} from './scheduleEditor.js';

let activePlanView = null;

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
    startPlanPomodoroStatusPolling(activePlan, activePlanView.view === 'pomodoro');
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
    page.appendChild(createPlanScheduleEditor(plan, isLocked, { onRender: renderPlans }));
  } else if (activePlanView.view === 'pomodoro') {
    page.appendChild(createPlanPomodoroEditor(plan, isLocked, {
      onSaveSettings: (planId, pomodoro) => updatePlan(planId, next => ({ ...next, pomodoro }))
    }));
  } else if (activePlanView.view === 'intent') {
    page.appendChild(createPlanIntentEditor(plan, isLocked, {
      onSaveSettings: (planId, intent) => updatePlan(planId, next => ({ ...next, intent }))
    }));
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
  clearPlanScheduleState(planId);
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
