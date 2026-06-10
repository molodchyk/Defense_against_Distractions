// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { normalizeUrl } from '../shared/url.js';
import {
  createButton,
  createCheckboxRow,
  createIconButton,
  createLabeledControl,
  createPlanSubsection,
  runAction
} from './planDom.js';
import { getMessage, getPlanMessage } from './planMessages.js';

export function createPlanEntriesEditor({
  plan,
  plans,
  elementRules,
  isLocked,
  onRenamePlan,
  onAddGroup,
  onUpdateGroup,
  onDeleteGroup,
  onAddAllowedSite,
  onDeleteAllowedSite,
  onUpdateUiRuleIds
}) {
  const details = document.createElement('div');
  details.className = 'plan-details';

  details.appendChild(createPlanNameEditor({ plan, plans, isLocked, onRenamePlan }));
  details.appendChild(createPlanGroupsEditor({ plan, isLocked, onAddGroup, onUpdateGroup, onDeleteGroup }));
  details.appendChild(createAllowedSitesEditor({ plan, isLocked, onAddAllowedSite, onDeleteAllowedSite }));
  details.appendChild(createElementRuleAssignment({ plan, elementRules, isLocked, onUpdateUiRuleIds }));

  if (plan.groups.length === 0) {
    const warning = document.createElement('p');
    warning.className = 'plan-warning';
    warning.textContent = getPlanMessage('planNeedsGroupWarning');
    details.appendChild(warning);
  }

  return details;
}

function createPlanNameEditor({ plan, plans, isLocked, onRenamePlan }) {
  const wrapper = document.createElement('label');
  wrapper.className = 'plan-field';

  const label = document.createElement('span');
  label.textContent = getPlanMessage('planNamePlaceholder');

  const input = document.createElement('input');
  input.type = 'text';
  input.value = plan.name;
  input.disabled = isLocked;

  const saveButton = createButton(getMessage('saveButtonLabel'), () => {
    const nextName = input.value.trim() || plan.name;
    const exists = plans.some(candidate => (
      candidate.id !== plan.id && candidate.name.toLowerCase() === nextName.toLowerCase()
    ));

    if (exists) {
      alert(getPlanMessage('planNameExists'));
      return;
    }

    onRenamePlan(plan.id, nextName);
  }, 'save-button');
  saveButton.disabled = isLocked;

  wrapper.appendChild(label);
  wrapper.appendChild(input);
  wrapper.appendChild(saveButton);
  return wrapper;
}

function createPlanGroupsEditor({ plan, isLocked, onAddGroup, onUpdateGroup, onDeleteGroup }) {
  const section = createPlanSubsection('planGroupsLabel');
  const addRow = document.createElement('div');
  addRow.className = 'plan-entry-add-row';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = getPlanMessage('planEntryNamePlaceholder');
  input.disabled = isLocked;

  const addButton = createButton(getPlanMessage('addPlanEntryButton'), () => {
    const requestedName = input.value.trim();
    input.value = '';
    onAddGroup(plan.id, requestedName);
  }, 'secondary-button');
  addButton.disabled = isLocked;

  addRow.appendChild(input);
  addRow.appendChild(addButton);
  section.appendChild(addRow);

  if (plan.groups.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'muted-text';
    empty.textContent = getPlanMessage('noGroupsLabel');
    section.appendChild(empty);
    return section;
  }

  const list = document.createElement('div');
  list.className = 'plan-entry-list';
  plan.groups.forEach((group, groupIndex) => {
    list.appendChild(createPlanGroupItem({ plan, group, groupIndex, isLocked, onUpdateGroup, onDeleteGroup }));
  });
  section.appendChild(list);
  return section;
}

function createPlanGroupItem({ plan, group, groupIndex, isLocked, onUpdateGroup, onDeleteGroup }) {
  const item = document.createElement('article');
  item.className = 'plan-entry-item';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = group.groupName || '';
  nameInput.disabled = isLocked;

  const websitesTextarea = document.createElement('textarea');
  websitesTextarea.value = (group.websites || []).join('\n');
  websitesTextarea.disabled = isLocked;

  const keywordsTextarea = document.createElement('textarea');
  keywordsTextarea.value = (group.keywords || []).join('\n');
  keywordsTextarea.disabled = isLocked;

  item.appendChild(createLabeledControl(getPlanMessage('planEntryNamePlaceholder'), nameInput));
  item.appendChild(createLabeledControl(getPlanMessage('planEntryWebsitesLabel'), websitesTextarea));
  item.appendChild(createLabeledControl(getPlanMessage('planEntryKeywordsLabel'), keywordsTextarea));

  const actions = document.createElement('div');
  actions.className = 'plan-entry-actions';

  const deleteButton = createButton(getPlanMessage('deleteButtonLabel'), () => {
    onDeleteGroup(plan.id, groupIndex);
  }, 'delete-button');
  deleteButton.disabled = isLocked;

  const saveButton = createButton(getPlanMessage('saveButtonLabel'), () => {
    onUpdateGroup(plan.id, groupIndex, {
      ...group,
      groupName: nameInput.value.trim() || group.groupName,
      websites: parseMultilineValues(websitesTextarea.value).map(normalizeUrl).filter(Boolean),
      keywords: parseMultilineValues(keywordsTextarea.value)
    });
  }, 'save-button');
  saveButton.disabled = isLocked;

  actions.appendChild(deleteButton);
  actions.appendChild(saveButton);
  item.appendChild(actions);
  return item;
}

function createAllowedSitesEditor({ plan, isLocked, onAddAllowedSite, onDeleteAllowedSite }) {
  const section = createPlanSubsection('planAllowedSitesLabel');

  const hint = document.createElement('p');
  hint.className = 'muted-text';
  hint.textContent = getPlanMessage('planAllowedSitesHint');

  const addRow = document.createElement('div');
  addRow.className = 'plan-entry-add-row';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'example.com';
  input.disabled = isLocked;

  const submitAllowedSite = () => {
    const requestedSite = input.value.trim();
    if (!requestedSite) {
      return;
    }

    input.value = '';
    return onAddAllowedSite(plan.id, requestedSite);
  };

  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      runAction(submitAllowedSite);
    }
  });

  const addButton = createButton(getPlanMessage('addAllowedSiteButton'), submitAllowedSite, 'secondary-button');
  addButton.disabled = isLocked;

  addRow.appendChild(input);
  addRow.appendChild(addButton);

  section.appendChild(hint);
  section.appendChild(addRow);

  const list = document.createElement('div');
  list.className = 'allowed-site-list';
  plan.allowedSites.forEach((site, siteIndex) => {
    const item = document.createElement('div');
    item.className = 'allowed-site-item';

    const label = document.createElement('span');
    label.textContent = site;

    const deleteButton = createIconButton(getPlanMessage('deleteButtonLabel'), () => {
      onDeleteAllowedSite(plan.id, siteIndex);
    }, 'allowed-site-delete-icon');
    deleteButton.disabled = isLocked;

    item.appendChild(label);
    item.appendChild(deleteButton);
    list.appendChild(item);
  });
  section.appendChild(list);
  return section;
}

function createElementRuleAssignment({ plan, elementRules, isLocked, onUpdateUiRuleIds }) {
  const section = createPlanSubsection('planUiRulesLabel');
  const grid = document.createElement('div');
  grid.className = 'plan-checkbox-grid';

  if (elementRules.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'muted-text';
    empty.textContent = getMessage('noElementRulesLabel');
    section.appendChild(empty);
    return section;
  }

  elementRules.forEach(rule => {
    grid.appendChild(createCheckboxRow(
      rule.name,
      plan.uiRuleIds.includes(rule.id),
      checked => {
        const nextRuleIds = checked
          ? [...plan.uiRuleIds, rule.id]
          : plan.uiRuleIds.filter(ruleId => ruleId !== rule.id);

        onUpdateUiRuleIds(plan.id, nextRuleIds);
      },
      isLocked && plan.uiRuleIds.includes(rule.id)
    ));
  });

  section.appendChild(grid);
  return section;
}

function parseMultilineValues(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map(item => item.trim())
    .filter(Boolean);
}
