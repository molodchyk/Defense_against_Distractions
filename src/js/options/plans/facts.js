// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { INTENT_INTERVENTION_ACTIONS } from '../../shared/intentCoherence.js';
import { isPlanActive } from '../../shared/plans.js';
import { formatScheduleActivitySummary } from '../../shared/schedules/scheduleSummary.js';
import { getScheduleActivityCounts } from '../../shared/schedules/scheduleTime.js';
import { getPlanMessage } from './messages.js';

export function createPlanFactList(plan) {
  const list = document.createElement('dl');
  list.className = 'plan-fact-list';

  [
    [getPlanMessage('planStatusFactLabel'), `${getPlanStatusLabel(plan)} · ${getPlanActivityLabel(plan)}`],
    [getPlanMessage('planScheduleFactLabel'), formatPlanScheduleMeta(plan)],
    [getPlanMessage('planEntriesFactLabel'), String(getPlanEntryCount(plan))],
    [getPlanMessage('planWebsitesFactLabel'), String(getPlanWebsiteCount(plan))],
    [getPlanMessage('planKeywordsFactLabel'), String(getPlanKeywordCount(plan))],
    [getPlanMessage('planAllowedFactLabel'), String(plan.allowedSites.length)],
    [getPlanMessage('planUiFactLabel'), String(plan.uiRuleIds.length)],
    [getPlanMessage('planPomodoroFactLabel'), plan.pomodoro.enabled ? getPlanMessage('planEnabledLabel') : getPlanMessage('planOffLabel')],
    [getPlanMessage('planIntentFactLabel'), plan.intent.enabled ? getIntentActionLabel(plan.intent.action) : getPlanMessage('planOffLabel')]
  ].forEach(([label, value]) => {
    list.appendChild(createPlanFact(label, value));
  });

  return list;
}

function createPlanFact(label, value) {
  const wrapper = document.createElement('div');
  const term = document.createElement('dt');
  const description = document.createElement('dd');

  term.textContent = label;
  description.textContent = value;
  description.title = value;
  wrapper.append(term, description);
  return wrapper;
}

function getPlanStatusLabel(plan) {
  return plan.enabled ? getPlanMessage('planEnabledLabel') : getPlanMessage('planDisabledLabel');
}

function getPlanActivityLabel(plan) {
  return isPlanActive(plan) ? getPlanMessage('planActiveLabel') : getPlanMessage('planInactiveLabel');
}

function formatPlanScheduleMeta(plan) {
  const counts = getScheduleActivityCounts(plan.schedules);
  if (counts.saved === 0) {
    return getPlanMessage('noPlanSchedulesMeta');
  }

  return formatScheduleActivitySummary(counts, {
    getMessage: getPlanMessage,
    noSchedulesMessage: getPlanMessage('noPlanSchedulesMeta'),
    includeSaved: true,
    includeEnabled: false,
    includeDisabled: false,
    includeIncomplete: false,
    savedSummaryKey: 'scheduleTimeBlocksSummaryPart',
    savedSummaryFallback: `${counts.saved} time ${counts.saved === 1 ? 'block' : 'blocks'}`
  });
}

function getIntentActionLabel(action) {
  const labels = {
    [INTENT_INTERVENTION_ACTIONS.WARN]: getPlanMessage('intentActionWarnLabel'),
    [INTENT_INTERVENTION_ACTIONS.GRAYSCALE]: getPlanMessage('intentActionGrayscaleLabel'),
    [INTENT_INTERVENTION_ACTIONS.REDUCE_NOISE]: getPlanMessage('intentActionReduceNoiseLabel'),
    [INTENT_INTERVENTION_ACTIONS.PROMPT]: getPlanMessage('intentActionPromptLabel'),
    [INTENT_INTERVENTION_ACTIONS.BLOCK]: getPlanMessage('intentActionBlockLabel')
  };
  return labels[action] || String(action || '');
}

function getPlanEntryCount(plan) {
  const ids = new Set(plan.groups.map(group => group.id));
  plan.groupIds.forEach(groupId => ids.add(groupId));
  return ids.size;
}

function getPlanWebsiteCount(plan) {
  return plan.groups.reduce((count, group) => (
    count + (Array.isArray(group.websites) ? group.websites.length : 0)
  ), 0);
}

function getPlanKeywordCount(plan) {
  return plan.groups.reduce((count, group) => (
    count + (Array.isArray(group.keywords) ? group.keywords.length : 0)
  ), 0);
}
