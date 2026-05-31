// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { getSync, setSync } from '../shared/chromeStorage.js';
import { createLocalizedButton } from './dom.js';

const ELEMENT_RULES_STORAGE_KEY = 'elementBlockRules';

const STRATEGIES = [
  ['samePosition', 'Same position'],
  ['similar', 'Similar structure'],
  ['exact', 'Closest match']
];
const LABEL_MATCHES = [
  ['prefer', 'Prefer label'],
  ['ignore', 'Ignore label'],
  ['require', 'Require label']
];

async function getRules() {
  const result = await getSync({ [ELEMENT_RULES_STORAGE_KEY]: [] });
  return result[ELEMENT_RULES_STORAGE_KEY] || [];
}

async function saveRules(rules) {
  await setSync({ [ELEMENT_RULES_STORAGE_KEY]: rules });
}

async function updateRule(ruleId, patch) {
  const rules = await getRules();
  await saveRules(rules.map(rule => {
    return rule.id === ruleId ? { ...rule, ...patch } : rule;
  }));
}

async function removeRule(ruleId) {
  const rules = await getRules();
  await saveRules(rules.filter(rule => rule.id !== ruleId));
}

function createSelect(options, selectedValue, onChange) {
  const select = document.createElement('select');

  options.forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
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

function createControl(labelText, control) {
  const wrapper = document.createElement('label');
  wrapper.className = 'element-rule-control';

  const label = document.createElement('span');
  label.textContent = labelText;

  wrapper.appendChild(label);
  wrapper.appendChild(control);
  return wrapper;
}

function createRuleItem(rule) {
  const item = document.createElement('li');
  item.className = 'element-rule-item';

  const title = document.createElement('div');
  title.className = 'element-rule-title';
  title.textContent = `${rule.name || 'UI element'} · ${rule.urlPattern || 'current site'}`;

  const controls = document.createElement('div');
  controls.className = 'element-rule-controls';

  controls.appendChild(createControl(
    'Strategy',
    createSelect(STRATEGIES, rule.strategy || rule.mode || 'samePosition', value => {
      updateRule(rule.id, { strategy: value }).catch(error => {
        console.error('Failed to update UI rule strategy:', error);
      });
    })
  ));

  controls.appendChild(createControl(
    'Minimum score',
    createNumberInput(rule.minScore || 12, 6, 24, value => {
      updateRule(rule.id, { minScore: value }).catch(error => {
        console.error('Failed to update UI rule score:', error);
      });
    })
  ));

  controls.appendChild(createControl(
    'Ancestor depth',
    createNumberInput(rule.ancestorDepth ?? 2, 0, 6, value => {
      updateRule(rule.id, { ancestorDepth: value }).catch(error => {
        console.error('Failed to update UI rule ancestor depth:', error);
      });
    })
  ));

  controls.appendChild(createControl(
    'Label match',
    createSelect(LABEL_MATCHES, rule.labelMatch || 'prefer', value => {
      updateRule(rule.id, { labelMatch: value }).catch(error => {
        console.error('Failed to update UI rule label match:', error);
      });
    })
  ));

  const deleteButton = createLocalizedButton('Delete', () => {
    removeRule(rule.id).catch(error => {
      console.error('Failed to remove element blocking rule:', error);
    });
  }, 'delete-button');

  item.appendChild(title);
  item.appendChild(controls);
  item.appendChild(deleteButton);
  return item;
}

export async function renderElementRules() {
  const list = document.getElementById('elementRuleList');
  if (!list) {
    return;
  }

  const rules = await getRules();
  list.innerHTML = '';

  if (rules.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'element-rule-empty';
    emptyItem.textContent = chrome.i18n.getMessage('noElementRulesLabel') || 'No blocked UI elements';
    list.appendChild(emptyItem);
    return;
  }

  rules.forEach(rule => {
    list.appendChild(createRuleItem(rule));
  });
}

export function initializeElementRulesSync() {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes[ELEMENT_RULES_STORAGE_KEY]) {
      renderElementRules().catch(error => {
        console.error('Failed to sync element blocking rules:', error);
      });
    }
  });
}
