// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  SIMPLE_CHAIN_TRIGGER_TYPES,
  TRIGGERED_ACTION_TRIGGER_TYPES
} from '../../features/triggered-actions/core/index.js';

const PLAN_VIEW_NAMES = new Set(['schedule', 'entries', 'actions', 'pomodoro', 'intent']);

export function getPlanViewFromOptionsHash(hash = '') {
  const [panelId, query = ''] = String(hash || '').trim().replace(/^#/, '').split('?');
  if (panelId !== 'plansPanel') {
    return null;
  }

  const params = new URLSearchParams(query);
  const planId = String(params.get('planId') || '').trim();
  const view = String(params.get('view') || 'entries').trim();
  if (!planId || !PLAN_VIEW_NAMES.has(view)) {
    return null;
  }

  const actionDraft = view === 'actions' ? getActionDraftFromParams(params) : null;
  return actionDraft ? { planId, view, actionDraft } : { planId, view };
}

export function planViewStatesEqual(left = null, right = null) {
  return Boolean(left && right)
    && left.planId === right.planId
    && left.view === right.view
    && getDraftKey(left.actionDraft) === getDraftKey(right.actionDraft);
}

function getActionDraftFromParams(params) {
  const triggerFilter = normalizeTextParam(params.get('triggerFilter'));
  const triggerType = normalizeTriggerType(params.get('triggerType'));
  return triggerFilter && triggerType !== TRIGGERED_ACTION_TRIGGER_TYPES.BLOCK_SCORE
    ? { triggerType, triggerFilter }
    : null;
}

function normalizeTriggerType(value) {
  const triggerType = normalizeTextParam(value);
  return SIMPLE_CHAIN_TRIGGER_TYPES.includes(triggerType)
    ? triggerType
    : TRIGGERED_ACTION_TRIGGER_TYPES.BLOCK_SCORE;
}

function normalizeTextParam(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function getDraftKey(draft = null) {
  return draft ? `${draft.triggerType}|${draft.triggerFilter}` : '';
}
