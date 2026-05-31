// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { getSync, setSync } from '../shared/chromeStorage.js';
import { createLocalizedButton } from './dom.js';

const ELEMENT_RULES_STORAGE_KEY = 'elementBlockRules';

function formatRule(rule) {
  const name = rule.name || 'UI element';
  const pattern = rule.urlPattern || 'current site';
  const mode = rule.mode || 'similar';
  return `${name} · ${pattern} · ${mode}`;
}

async function removeRule(ruleId) {
  const result = await getSync({ [ELEMENT_RULES_STORAGE_KEY]: [] });
  const nextRules = (result[ELEMENT_RULES_STORAGE_KEY] || []).filter(rule => rule.id !== ruleId);
  await setSync({ [ELEMENT_RULES_STORAGE_KEY]: nextRules });
  renderElementRules();
}

export async function renderElementRules() {
  const list = document.getElementById('elementRuleList');
  if (!list) {
    return;
  }

  const result = await getSync({ [ELEMENT_RULES_STORAGE_KEY]: [] });
  const rules = result[ELEMENT_RULES_STORAGE_KEY] || [];
  list.innerHTML = '';

  if (rules.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'element-rule-empty';
    emptyItem.textContent = chrome.i18n.getMessage('noElementRulesLabel') || 'No blocked UI elements';
    list.appendChild(emptyItem);
    return;
  }

  rules.forEach(rule => {
    const item = document.createElement('li');
    const ruleText = document.createElement('span');
    ruleText.textContent = formatRule(rule);

    const deleteButton = createLocalizedButton('Delete', () => {
      removeRule(rule.id).catch(error => {
        console.error('Failed to remove element blocking rule:', error);
      });
    }, 'delete-button');

    item.appendChild(ruleText);
    item.appendChild(deleteButton);
    list.appendChild(item);
  });
}
