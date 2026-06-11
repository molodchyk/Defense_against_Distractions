// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { getBytesInUseSync, getSync, removeSync, setSync } from '../shared/storage/chromeStorage.js';
import { savePlansWithPriority } from '../shared/storage/criticalScheduleStorage.js';
import { isInProtectedSchedule, normalizePlans, PLANS_STORAGE_KEY } from '../shared/plans.js';
import { getUiMessage } from '../shared/ui/uiLanguage.js';
import { createLocalizedButton } from './dom.js';

const ELEMENT_RULES_STORAGE_KEY = 'elementBlockRules';
const ELEMENT_RULE_IDS_STORAGE_KEY = 'elementBlockRuleIds';
const ELEMENT_RULE_ITEM_PREFIX = 'elementBlockRule.';
const SYNC_QUOTA_BYTES_FALLBACK = 102400;
const PROTECTED_SYNC_RESERVE_BYTES = 20480;

const STRATEGIES = [
  ['samePosition', 'Same position'],
  ['sameText', 'Same text or label'],
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
  ['labelTokens', 'Label tokens'],
  ['directTextTokens', 'Direct text tokens']
];

const ELEMENT_RULE_MESSAGES = {
  lockedScheduleErrorMessage: 'Cannot weaken protection during an active protected schedule.',
  noElementRulesLabel: 'No blocked UI elements'
};

function getElementRuleMessage(key, fallback = '') {
  return getUiMessage(key, ELEMENT_RULE_MESSAGES[key] || fallback || key);
}

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

function estimateSyncItemBytes(items) {
  return Object.entries(items).reduce((totalBytes, [key, value]) => {
    return totalBytes + key.length + String(JSON.stringify(value) || '').length;
  }, 0);
}

async function ensureElementRuleStorageBudget(items, replacingKeys) {
  const quotaBytes = chrome.storage.sync.QUOTA_BYTES || SYNC_QUOTA_BYTES_FALLBACK;
  const protectedLimit = quotaBytes - PROTECTED_SYNC_RESERVE_BYTES;
  const [totalBytes, replacingBytes] = await Promise.all([
    getBytesInUseSync(null),
    getBytesInUseSync(replacingKeys)
  ]);
  const projectedBytes = totalBytes - replacingBytes + estimateSyncItemBytes(items);

  if (projectedBytes > protectedLimit && projectedBytes > totalBytes) {
    throw new Error('Cannot save this UI rule: sync storage reserve for locked schedules would be exceeded.');
  }
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

  const removedKeys = previousIds
    .filter(ruleId => !nextIds.includes(ruleId))
    .map(getElementRuleStorageKey);
  const replacingKeys = [
    ELEMENT_RULES_STORAGE_KEY,
    ELEMENT_RULE_IDS_STORAGE_KEY,
    ...previousIds.map(getElementRuleStorageKey),
    ...nextIds.map(getElementRuleStorageKey)
  ];

  await ensureElementRuleStorageBudget(items, replacingKeys);
  await setSync(items);
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
  const items = await getSync({ [PLANS_STORAGE_KEY]: [] });
  const plans = normalizePlans(items[PLANS_STORAGE_KEY]);

  await saveRules(rules.filter(rule => rule.id !== ruleId));

  if (plans.length > 0) {
    await savePlansWithPriority(plans.map(plan => ({
      ...plan,
      uiRuleIds: plan.uiRuleIds.filter(candidateId => candidateId !== ruleId)
    })));
  }
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
  const protectedLimit = quotaBytes - PROTECTED_SYNC_RESERVE_BYTES;
  const reserveLabel = `Locked schedule reserve ${formatBytes(PROTECTED_SYNC_RESERVE_BYTES)}`;
  const reserveStatus = totalBytes > protectedLimit ? `${reserveLabel} low` : reserveLabel;

  storageUsage.textContent = [
    `${rules.length} UI ${rules.length === 1 ? 'rule' : 'rules'}`,
    `UI rules ${formatBytes(ruleBytes)}`,
    `Sync ${formatBytes(totalBytes)} / ${formatBytes(quotaBytes)}`,
    reserveStatus
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

function getAssignedPlans(rule, plans) {
  return plans.filter(plan => plan.uiRuleIds.includes(rule.id));
}

function formatPlanScope(rule, plans) {
  const assignedPlans = getAssignedPlans(rule, plans);

  if (assignedPlans.length === 0) {
    return 'global';
  }

  return `plans: ${assignedPlans.map(plan => {
    return plan.enabled ? plan.name : `${plan.name} (disabled)`;
  }).join(', ')}`;
}

function getLockedAssignmentMessage() {
  return getElementRuleMessage('lockedScheduleErrorMessage');
}

async function updateRulePlanAssignment(ruleId, planId, assigned) {
  const items = await getSync({ [PLANS_STORAGE_KEY]: [], schedules: [] });
  const plans = normalizePlans(items[PLANS_STORAGE_KEY]);
  const plan = plans.find(candidate => candidate.id === planId);

  if (!plan) {
    return;
  }

  const isCurrentlyAssigned = plan.uiRuleIds.includes(ruleId);
  if (!assigned && isCurrentlyAssigned && isInProtectedSchedule(items)) {
    alert(getLockedAssignmentMessage());
    await renderElementRules();
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

function createRulePlanAssignment(rule, plans, isLocked) {
  const wrapper = document.createElement('div');
  wrapper.className = 'element-rule-control element-rule-control-wide';

  const label = document.createElement('span');
  label.textContent = 'Plan assignment';
  wrapper.appendChild(label);

  if (plans.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'element-rule-plan-empty';
    empty.textContent = 'Global rule. Create a plan to scope it.';
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
        updateRulePlanAssignment(rule.id, plan.id, value).catch(error => {
          console.error('Failed to update UI rule plan assignment:', error);
        });
      }
    );

    const text = document.createElement('span');
    text.textContent = plan.enabled ? plan.name : `${plan.name} (disabled)`;

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
  summary.textContent = 'Diagnostics';
  details.appendChild(summary);

  const body = document.createElement('div');
  body.className = 'element-rule-diagnostics-body';
  body.appendChild(createMetaLine('Rule ID', rule.id || 'unknown'));
  body.appendChild(createMetaLine('Created', formatDate(rule.createdAt)));
  body.appendChild(createMetaLine('URL scope', rule.urlScope || 'pattern'));
  body.appendChild(createMetaLine('URL pattern', rule.urlPattern || 'current site'));
  body.appendChild(createMetaLine('Plan scope', formatPlanScope(rule, plans)));

  FINGERPRINT_FIELDS.forEach(([key, label]) => {
    body.appendChild(createMetaLine(label, rule.fingerprint?.[key]));
  });

  details.appendChild(body);
  return details;
}

function createRuleItem(rule, plans, isLocked) {
  const item = document.createElement('li');
  item.className = 'element-rule-item';

  const title = document.createElement('div');
  title.className = 'element-rule-title';
  title.textContent = rule.name || 'UI element';

  const summary = document.createElement('div');
  summary.className = 'element-rule-summary';
  summary.textContent = [
    rule.enabled === false ? 'disabled' : 'enabled',
    formatPlanScope(rule, plans),
    rule.urlPattern || 'current site',
    rule.strategy || rule.mode || 'samePosition',
    `score ${rule.minScore || 12}`,
    `depth ${rule.ancestorDepth ?? 2}`,
    rule.labelMatch || 'prefer'
  ].join(' · ');

  const controls = document.createElement('div');
  controls.className = 'element-rule-controls';

  controls.appendChild(createControl(
    'Enabled',
    createCheckbox(rule.enabled !== false, value => {
      updateRule(rule.id, { enabled: value }).catch(error => {
        console.error('Failed to update UI rule enabled state:', error);
      });
    })
  ));

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

  controls.appendChild(createRulePlanAssignment(rule, plans, isLocked));

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
  item.appendChild(createDiagnostics(rule, plans));
  item.appendChild(domainButton);
  item.appendChild(deleteButton);
  return item;
}

export async function renderElementRules() {
  const list = document.getElementById('elementRuleList');
  if (!list) {
    return;
  }

  const [rules, items] = await Promise.all([
    getRules(),
    getSync({ [PLANS_STORAGE_KEY]: [], schedules: [] })
  ]);
  const plans = normalizePlans(items[PLANS_STORAGE_KEY]);
  const isLocked = isInProtectedSchedule(items);
  list.innerHTML = '';
  renderStorageUsage(rules).catch(error => {
    console.error('Failed to render element rule storage usage:', error);
  });

  if (rules.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'element-rule-empty';
    emptyItem.textContent = getElementRuleMessage('noElementRulesLabel');
    list.appendChild(emptyItem);
    return;
  }

  rules.forEach(rule => {
    list.appendChild(createRuleItem(rule, plans, isLocked));
  });
}

export function initializeElementRulesSync() {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    const hasElementRuleChange = Boolean(
      changes[ELEMENT_RULES_STORAGE_KEY]
        || changes[ELEMENT_RULE_IDS_STORAGE_KEY]
        || Object.keys(changes).some(key => key.startsWith(ELEMENT_RULE_ITEM_PREFIX))
    );

    if (areaName === 'sync' && (hasElementRuleChange || changes[PLANS_STORAGE_KEY])) {
      renderElementRules().catch(error => {
        console.error('Failed to sync element blocking rules:', error);
      });
    }
  });
}
