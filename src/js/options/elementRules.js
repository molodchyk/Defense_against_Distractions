// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { getBytesInUseSync, getSync, removeSync, setSync } from '../shared/chromeStorage.js';
import { createLocalizedButton } from './dom.js';

const ELEMENT_RULES_STORAGE_KEY = 'elementBlockRules';
const ELEMENT_RULE_IDS_STORAGE_KEY = 'elementBlockRuleIds';
const ELEMENT_RULE_ITEM_PREFIX = 'elementBlockRule.';

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
const FINGERPRINT_FIELDS = [
  ['tag', 'Tag'],
  ['role', 'Role'],
  ['inputType', 'Input type'],
  ['parentTag', 'Parent tag'],
  ['parentRole', 'Parent role'],
  ['childCount', 'Child count'],
  ['tagIndex', 'Tag index'],
  ['positionPath', 'Position path'],
  ['ancestorSignature', 'Ancestors'],
  ['childSignature', 'Children'],
  ['classTokens', 'Class tokens'],
  ['labelTokens', 'Label tokens']
];

function getElementRuleStorageKey(ruleId) {
  return `${ELEMENT_RULE_ITEM_PREFIX}${ruleId}`;
}

function formatBytes(bytes) {
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${bytes} B`;
}

function dedupeRules(rules) {
  const seenIds = new Set();
  return (rules || []).filter(rule => {
    if (!rule?.id || seenIds.has(rule.id)) return false;
    seenIds.add(rule.id);
    return true;
  });
}

async function getRules() {
  const result = await getSync({ [ELEMENT_RULES_STORAGE_KEY]: [], [ELEMENT_RULE_IDS_STORAGE_KEY]: [] });
  const legacyRules = Array.isArray(result[ELEMENT_RULES_STORAGE_KEY]) ? result[ELEMENT_RULES_STORAGE_KEY] : [];
  const ruleIds = Array.isArray(result[ELEMENT_RULE_IDS_STORAGE_KEY]) ? result[ELEMENT_RULE_IDS_STORAGE_KEY] : [];

  if (ruleIds.length === 0) {
    const rules = dedupeRules(legacyRules);
    if (rules.length > 0) {
      await saveRules(rules);
    }
    return rules;
  }

  const ruleKeys = ruleIds.map(getElementRuleStorageKey);
  const ruleItems = await getSync(ruleKeys);
  const indexedRules = ruleIds.map(ruleId => ruleItems[getElementRuleStorageKey(ruleId)]).filter(Boolean);
  const rules = dedupeRules([...indexedRules, ...legacyRules]);

  if (legacyRules.length > 0) {
    await saveRules(rules);
  }

  return rules;
}

async function saveRules(rules) {
  const current = await getSync({ [ELEMENT_RULE_IDS_STORAGE_KEY]: [] });
  const previousIds = Array.isArray(current[ELEMENT_RULE_IDS_STORAGE_KEY]) ? current[ELEMENT_RULE_IDS_STORAGE_KEY] : [];
  const nextRules = dedupeRules(rules);
  const nextIds = nextRules.map(rule => rule.id);
  const items = {
    [ELEMENT_RULE_IDS_STORAGE_KEY]: nextIds
  };

  nextRules.forEach(rule => {
    items[getElementRuleStorageKey(rule.id)] = rule;
  });

  await setSync(items);

  const removedKeys = previousIds
    .filter(ruleId => !nextIds.includes(ruleId))
    .map(getElementRuleStorageKey);
  await removeSync([ELEMENT_RULES_STORAGE_KEY, ...removedKeys]);
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

async function renderStorageUsage(rules) {
  const storageUsage = document.getElementById('elementRuleStorageUsage');
  if (!storageUsage) return;

  const ruleKeys = [
    ELEMENT_RULE_IDS_STORAGE_KEY,
    ...rules.map(rule => getElementRuleStorageKey(rule.id))
  ];
  const [ruleBytes, totalBytes] = await Promise.all([
    getBytesInUseSync(ruleKeys),
    getBytesInUseSync(null)
  ]);
  const quotaBytes = chrome.storage.sync.QUOTA_BYTES || 102400;

  storageUsage.textContent = [
    `${rules.length} UI ${rules.length === 1 ? 'rule' : 'rules'}`,
    `UI rules ${formatBytes(ruleBytes)}`,
    `Sync ${formatBytes(totalBytes)} / ${formatBytes(quotaBytes)}`
  ].join(' · ');
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

function createTextInput(value, onChange) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = value || '';
  input.addEventListener('change', () => {
    onChange(input.value.trim());
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

function formatList(value) {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(' / ') : 'none';
  }

  if (value === undefined || value === null || value === '') {
    return 'none';
  }

  return String(value);
}

function formatDate(value) {
  if (!value) return 'unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
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

function createDiagnostics(rule) {
  const details = document.createElement('details');
  details.className = 'element-rule-diagnostics';

  const summary = document.createElement('summary');
  summary.textContent = 'Diagnostics';
  details.appendChild(summary);

  const body = document.createElement('div');
  body.className = 'element-rule-diagnostics-body';
  body.appendChild(createMetaLine('Rule ID', rule.id || 'unknown'));
  body.appendChild(createMetaLine('Created', formatDate(rule.createdAt)));
  body.appendChild(createMetaLine('URL scope', rule.urlScope || 'pattern'));
  body.appendChild(createMetaLine('URL pattern', rule.urlPattern || 'current site'));

  FINGERPRINT_FIELDS.forEach(([key, label]) => {
    body.appendChild(createMetaLine(label, rule.fingerprint?.[key]));
  });

  details.appendChild(body);
  return details;
}

function createRuleItem(rule) {
  const item = document.createElement('li');
  item.className = 'element-rule-item';

  const title = document.createElement('div');
  title.className = 'element-rule-title';
  title.textContent = rule.name || 'UI element';

  const summary = document.createElement('div');
  summary.className = 'element-rule-summary';
  summary.textContent = [
    rule.urlPattern || 'current site',
    rule.strategy || rule.mode || 'samePosition',
    `score ${rule.minScore || 12}`,
    `depth ${rule.ancestorDepth ?? 2}`,
    rule.labelMatch || 'prefer'
  ].join(' · ');

  const controls = document.createElement('div');
  controls.className = 'element-rule-controls';

  controls.appendChild(createControl(
    'Name',
    createTextInput(rule.name || '', value => {
      updateRule(rule.id, { name: value || 'UI element' }).catch(error => {
        console.error('Failed to update UI rule name:', error);
      });
    })
  ));

  controls.appendChild(createControl(
    'URL pattern',
    createTextInput(rule.urlPattern || '', value => {
      updateRule(rule.id, { urlPattern: value, urlScope: 'pattern' }).catch(error => {
        console.error('Failed to update UI rule URL pattern:', error);
      });
    })
  ));

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

  const domainButton = createButton('Use domain', () => {
    const domainPattern = getDomainPattern(rule.urlPattern);
    if (!domainPattern) return;

    updateRule(rule.id, { urlPattern: domainPattern, urlScope: 'host' }).catch(error => {
      console.error('Failed to update UI rule domain scope:', error);
    });
  }, 'secondary-button');

  const deleteButton = createLocalizedButton('Delete', () => {
    removeRule(rule.id).catch(error => {
      console.error('Failed to remove element blocking rule:', error);
    });
  }, 'delete-button');

  item.appendChild(title);
  item.appendChild(summary);
  item.appendChild(controls);
  item.appendChild(createDiagnostics(rule));
  item.appendChild(domainButton);
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
  renderStorageUsage(rules).catch(error => {
    console.error('Failed to render element rule storage usage:', error);
  });

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
    const hasElementRuleChange = Boolean(
      changes[ELEMENT_RULES_STORAGE_KEY]
        || changes[ELEMENT_RULE_IDS_STORAGE_KEY]
        || Object.keys(changes).some(key => key.startsWith(ELEMENT_RULE_ITEM_PREFIX))
    );

    if (areaName === 'sync' && hasElementRuleChange) {
      renderElementRules().catch(error => {
        console.error('Failed to sync element blocking rules:', error);
      });
    }
  });
}
