// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  savePlansWithPriority
} from '../../../features/plans/storage/criticalScheduleStorage.js';
import {
  getSync
} from '../../../platform/chrome/storage.js';
import {
  isInProtectedSchedule,
  normalizePlans,
  PLANS_STORAGE_KEY
} from '../../shared/plans.js';
import {
  createLocalizedButton
} from '../dom.js';
import {
  FINGERPRINT_FIELDS,
  ELEMENT_RULE_ACTIONS,
  LABEL_MATCHES,
  STRATEGIES
} from './constants.js';
import {
  formatDate,
  formatList
} from './format.js';
import {
  getElementRuleMessage,
  getElementRuleOptionLabel
} from './messages.js';
import {
  removeRule,
  updateRule
} from './storage.js';

function createSelect(options, selectedValue, onChange) {
  const select = document.createElement('select');

  options.forEach((optionData) => {
    const [value] = optionData;
    const option = document.createElement('option');
    option.value = value;
    option.textContent = getElementRuleOptionLabel(optionData);
    select.appendChild(option);
  });

  select.value = selectedValue;
  select.addEventListener('change', () => onChange(select.value));
  return select;
}

function createNumberInput(value, min, max, onChange) {
  const input = document.createElement('input');
  input.type = 'number';
  input.min = String(min);
  input.max = String(max);
  input.value = String(value);
  input.addEventListener('change', () => {
    onChange(Number.parseInt(input.value, 10));
  });
  return input;
}

function createTextInput(value, onChange) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = value || '';
  input.addEventListener('change', () => {
    onChange(input.value.trim());
  });
  return input;
}

function createCheckbox(checked, onChange) {
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.addEventListener('change', () => {
    onChange(input.checked);
  });
  return input;
}

function createPlanAssignmentCheckbox(checked, disabled, onChange) {
  const input = createCheckbox(checked, onChange);
  input.disabled = disabled;
  return input;
}

function createControl(labelText, control) {
  const wrapper = document.createElement('label');
  wrapper.className = 'element-rule-control';

  const label = document.createElement('span');
  label.textContent = labelText;

  wrapper.appendChild(label);
  wrapper.appendChild(control);
  return wrapper;
}

function createButton(text, onClick, className) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = text;
  if (className) {
    button.className = className;
  }
  button.addEventListener('click', event => {
    event.preventDefault();
    onClick();
  });
  return button;
}

function handleProtectedRuleError(error, onRefresh) {
  const messageKey = typeof error?.messageKey === 'string'
    ? error.messageKey
    : 'elementRuleUpdateFailedMessage';
  alert(getElementRuleMessage(messageKey));
  onRefresh?.();
}

function createMetaLine(label, value) {
  const row = document.createElement('div');
  row.className = 'element-rule-meta-row';

  const key = document.createElement('span');
  key.textContent = label;

  const content = document.createElement('code');
  content.textContent = formatList(value);

  row.appendChild(key);
  row.appendChild(content);
  return row;
}

function getDomainPattern(pattern) {
  return (pattern || '').split('/')[0].trim();
}

function getAssignedPlans(rule, plans) {
  return plans.filter(plan => plan.uiRuleIds.includes(rule.id));
}

function formatPlanName(plan) {
  return plan.enabled
    ? plan.name
    : getElementRuleMessage('elementRuleDisabledPlanName', [plan.name]);
}

function formatPlanScope(rule, plans) {
  const assignedPlans = getAssignedPlans(rule, plans);

  if (assignedPlans.length === 0) {
    return getElementRuleMessage('elementRuleGlobalScope');
  }

  return getElementRuleMessage('elementRulePlanScope', [
    assignedPlans.map(formatPlanName).join(', ')
  ]);
}

function formatRuleAction(action) {
  if (action === 'click') {
    return getElementRuleMessage('elementRuleActionClickSummary');
  }

  if (action === 'clear') {
    return getElementRuleMessage('elementRuleActionClearSummary');
  }

  if (action === 'pauseMedia') {
    return getElementRuleMessage('elementRuleActionPauseSummary');
  }

  if (action === 'hideImages') {
    return getElementRuleMessage('elementRuleActionHideImagesSummary');
  }

  if (action === 'disableControls') {
    return getElementRuleMessage('elementRuleActionDisableControlsSummary');
  }

  return getElementRuleMessage('elementRuleActionHideSummary');
}

function formatOptionLabel(options, value, fallbackValue) {
  const selectedValue = value || fallbackValue;
  const option = options.find(([optionValue]) => optionValue === selectedValue);
  return option ? getElementRuleOptionLabel(option) : String(selectedValue || '');
}

async function updateRulePlanAssignment(ruleId, planId, assigned, onRefresh) {
  const items = await getSync({ [PLANS_STORAGE_KEY]: [], schedules: [] });
  const plans = normalizePlans(items[PLANS_STORAGE_KEY]);
  const plan = plans.find(candidate => candidate.id === planId);

  if (!plan) {
    return;
  }

  const isCurrentlyAssigned = plan.uiRuleIds.includes(ruleId);
  if (!assigned && isCurrentlyAssigned && isInProtectedSchedule(items)) {
    alert(getElementRuleMessage('lockedScheduleErrorMessage'));
    await onRefresh?.();
    return;
  }

  await savePlansWithPriority(plans.map(candidate => {
    if (candidate.id !== planId) {
      return candidate;
    }

    const nextRuleIds = assigned
      ? Array.from(new Set([...candidate.uiRuleIds, ruleId]))
      : candidate.uiRuleIds.filter(candidateRuleId => candidateRuleId !== ruleId);

    return {
      ...candidate,
      uiRuleIds: nextRuleIds
    };
  }));
}

function createRulePlanAssignment(rule, plans, isLocked, onRefresh) {
  const wrapper = document.createElement('div');
  wrapper.className = 'element-rule-control element-rule-control-wide';

  const label = document.createElement('span');
  label.textContent = getElementRuleMessage('elementRulePlanAssignmentLabel');
  wrapper.appendChild(label);

  if (plans.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'element-rule-plan-empty';
    empty.textContent = getElementRuleMessage('elementRuleGlobalPlanAssignment');
    wrapper.appendChild(empty);
    return wrapper;
  }

  const grid = document.createElement('div');
  grid.className = 'element-rule-plan-grid';

  plans.forEach(plan => {
    const assigned = plan.uiRuleIds.includes(rule.id);
    const row = document.createElement('label');
    row.className = 'element-rule-plan-row';

    const checkbox = createPlanAssignmentCheckbox(
      assigned,
      isLocked && assigned,
      value => {
        updateRulePlanAssignment(rule.id, plan.id, value, onRefresh).catch(error => {
          console.error('Failed to update UI rule plan assignment:', error);
        });
      }
    );

    const text = document.createElement('span');
    text.textContent = formatPlanName(plan);

    row.appendChild(checkbox);
    row.appendChild(text);
    grid.appendChild(row);
  });

  wrapper.appendChild(grid);
  return wrapper;
}

function createDiagnostics(rule, plans) {
  const details = document.createElement('details');
  details.className = 'element-rule-diagnostics';

  const summary = document.createElement('summary');
  summary.textContent = getElementRuleMessage('elementRuleDiagnosticsHeading');
  details.appendChild(summary);

  const body = document.createElement('div');
  body.className = 'element-rule-diagnostics-body';
  body.appendChild(createMetaLine(
    getElementRuleMessage('elementRuleMetaRuleId'),
    rule.id || getElementRuleMessage('elementRuleUnknownValue')
  ));
  body.appendChild(createMetaLine(getElementRuleMessage('elementRuleMetaCreated'), formatDate(rule.createdAt)));
  body.appendChild(createMetaLine(
    getElementRuleMessage('elementRuleMetaUrlScope'),
    rule.urlScope || getElementRuleMessage('elementRulePatternValue')
  ));
  body.appendChild(createMetaLine(
    getElementRuleMessage('elementRuleMetaUrlPattern'),
    rule.urlPattern || getElementRuleMessage('elementRuleCurrentSiteValue')
  ));
  body.appendChild(createMetaLine(getElementRuleMessage('elementRuleMetaPlanScope'), formatPlanScope(rule, plans)));

  FINGERPRINT_FIELDS.forEach(([key, messageKey, fallback]) => {
    body.appendChild(createMetaLine(getElementRuleMessage(messageKey, fallback), rule.fingerprint?.[key]));
  });

  details.appendChild(body);
  return details;
}

export function createRuleItem(rule, plans, isLocked, { onRefresh } = {}) {
  const item = document.createElement('li');
  item.className = 'element-rule-item';

  const title = document.createElement('div');
  title.className = 'element-rule-title';
  title.textContent = rule.name || getElementRuleMessage('elementRuleDefaultName');

  const summary = document.createElement('div');
  summary.className = 'element-rule-summary';
  summary.textContent = [
    rule.enabled === false
      ? getElementRuleMessage('elementRuleDisabledSummary')
      : getElementRuleMessage('elementRuleEnabledSummary'),
    formatPlanScope(rule, plans),
    rule.urlPattern || getElementRuleMessage('elementRuleCurrentSiteValue'),
    formatRuleAction(rule.action),
    formatOptionLabel(STRATEGIES, rule.strategy || rule.mode, 'samePosition'),
    getElementRuleMessage('elementRuleScoreSummary', [String(rule.minScore || 12)]),
    getElementRuleMessage('elementRuleDepthSummary', [String(rule.ancestorDepth ?? 2)]),
    formatOptionLabel(LABEL_MATCHES, rule.labelMatch, 'prefer')
  ].join(' · ');

  const controls = document.createElement('div');
  controls.className = 'element-rule-controls';

  controls.appendChild(createControl(
    getElementRuleMessage('elementRuleEnabledLabel'),
    createCheckbox(rule.enabled !== false, value => {
      updateRule(rule.id, { enabled: value }).catch(error => {
        console.error('Failed to update UI rule enabled state:', error);
        handleProtectedRuleError(error, onRefresh);
      });
    })
  ));

  controls.appendChild(createControl(
    getElementRuleMessage('elementRuleNameLabel'),
    createTextInput(rule.name || '', value => {
      updateRule(rule.id, { name: value || getElementRuleMessage('elementRuleDefaultName') }).catch(error => {
        console.error('Failed to update UI rule name:', error);
      });
    })
  ));

  controls.appendChild(createControl(
    getElementRuleMessage('elementRuleUrlPatternLabel'),
    createTextInput(rule.urlPattern || '', value => {
      updateRule(rule.id, { urlPattern: value, urlScope: 'pattern' }).catch(error => {
        console.error('Failed to update UI rule URL pattern:', error);
      });
    })
  ));

  controls.appendChild(createControl(
    getElementRuleMessage('elementRuleActionLabel'),
    createSelect(ELEMENT_RULE_ACTIONS, rule.action || 'hide', value => {
      updateRule(rule.id, { action: value }).catch(error => {
        console.error('Failed to update UI rule action:', error);
      });
    })
  ));

  controls.appendChild(createControl(
    getElementRuleMessage('elementRuleStrategyLabel'),
    createSelect(STRATEGIES, rule.strategy || rule.mode || 'samePosition', value => {
      updateRule(rule.id, { strategy: value }).catch(error => {
        console.error('Failed to update UI rule strategy:', error);
      });
    })
  ));

  controls.appendChild(createControl(
    getElementRuleMessage('elementRuleMinimumScoreLabel'),
    createNumberInput(rule.minScore || 12, 6, 24, value => {
      updateRule(rule.id, { minScore: value }).catch(error => {
        console.error('Failed to update UI rule score:', error);
      });
    })
  ));

  controls.appendChild(createControl(
    getElementRuleMessage('elementRuleAncestorDepthLabel'),
    createNumberInput(rule.ancestorDepth ?? 2, 0, 6, value => {
      updateRule(rule.id, { ancestorDepth: value }).catch(error => {
        console.error('Failed to update UI rule ancestor depth:', error);
      });
    })
  ));

  controls.appendChild(createControl(
    getElementRuleMessage('elementRuleLabelMatchLabel'),
    createSelect(LABEL_MATCHES, rule.labelMatch || 'prefer', value => {
      updateRule(rule.id, { labelMatch: value }).catch(error => {
        console.error('Failed to update UI rule label match:', error);
      });
    })
  ));

  controls.appendChild(createRulePlanAssignment(rule, plans, isLocked, onRefresh));

  const domainButton = createButton(getElementRuleMessage('elementRuleUseDomainButton'), () => {
    const domainPattern = getDomainPattern(rule.urlPattern);
    if (!domainPattern) return;

    updateRule(rule.id, { urlPattern: domainPattern, urlScope: 'host' }).catch(error => {
      console.error('Failed to update UI rule domain scope:', error);
    });
  }, 'secondary-button');

  const deleteButton = createLocalizedButton('Delete', () => {
    removeRule(rule.id).catch(error => {
      console.error('Failed to remove element blocking rule:', error);
      handleProtectedRuleError(error, onRefresh);
    });
  }, 'delete-button');

  item.appendChild(title);
  item.appendChild(summary);
  item.appendChild(controls);
  item.appendChild(createDiagnostics(rule, plans));
  item.appendChild(domainButton);
  item.appendChild(deleteButton);
  return item;
}
