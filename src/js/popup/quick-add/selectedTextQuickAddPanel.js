// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  getSync
} from '../../../platform/chrome/storage.js';
import {
  savePlansWithPriority
} from '../../../features/plans/storage/criticalScheduleStorage.js';
import {
  isInProtectedSchedule,
  isPlanActive,
  isPlanChangeAllowedDuringProtectedSchedule,
  normalizePlans,
  PLANS_STORAGE_KEY
} from '../../shared/plans.js';
import {
  normalizeSelectedTextCandidate
} from '../pageSignalsPanel.js';
import {
  applySelectedTextQuickAdd,
  getDefaultQuickAddTarget,
  normalizeQuickAddScore,
  quickAddGroupMatchesUrl,
  QUICK_ADD_CREATE_ENTRY_VALUE,
  QUICK_ADD_DEFAULT_ENTRY_NAME
} from './selectedTextQuickAddModel.js';

const SITE_CHECK_MESSAGE = 'performSiteCheck';

export function createSelectedTextQuickAddPanel({
  getMessage,
  getActiveTab,
  sendTabMessage,
  setStatus,
  onPlansChange
}) {
  let latestCandidate = null;
  let latestPlans = [];
  let latestActiveTab = null;
  let selectedPlanId = '';
  let selectedGroupId = QUICK_ADD_CREATE_ENTRY_VALUE;
  let scoreTouched = false;

  function getElements() {
    return {
      panel: document.getElementById('selectedTextQuickAddPanel'),
      planSelect: document.getElementById('selectedTextQuickAddPlanSelect'),
      groupSelect: document.getElementById('selectedTextQuickAddEntrySelect'),
      scoreInput: document.getElementById('selectedTextQuickAddScoreInput'),
      simulation: document.getElementById('selectedTextQuickAddSimulation'),
      saveButton: document.getElementById('addSelectedTextRuleButton')
    };
  }

  function setActiveTab(activeTab) {
    latestActiveTab = activeTab || null;
    ensureSelectedTarget();
    render();
  }

  function setCandidate(candidate) {
    latestCandidate = normalizeSelectedTextCandidate(candidate);
    scoreTouched = false;
    const { scoreInput } = getElements();
    if (scoreInput && latestCandidate) {
      scoreInput.value = String(latestCandidate.estimatedScore100);
    }
    ensureSelectedTarget();
    render();
  }

  function setPlans(plans) {
    latestPlans = normalizePlans(plans);
    ensureSelectedTarget();
    render();
  }

  async function refreshPlans() {
    const items = await getSync({ [PLANS_STORAGE_KEY]: [] });
    setPlans(items?.[PLANS_STORAGE_KEY]);
    return latestPlans;
  }

  function ensureSelectedTarget() {
    const target = getDefaultQuickAddTarget(latestPlans, latestActiveTab?.url || '');
    if (!latestPlans.some(plan => plan.id === selectedPlanId)) {
      selectedPlanId = target.planId;
    }

    const selectedPlan = getSelectedPlan();
    if (!selectedPlan) {
      selectedGroupId = QUICK_ADD_CREATE_ENTRY_VALUE;
      return;
    }

    const groupExists = selectedPlan.groups.some(group => group.id === selectedGroupId);
    if (!groupExists && selectedGroupId !== QUICK_ADD_CREATE_ENTRY_VALUE) {
      selectedGroupId = target.planId === selectedPlan.id ? target.groupId : QUICK_ADD_CREATE_ENTRY_VALUE;
    }

    if (!selectedGroupId) {
      selectedGroupId = target.planId === selectedPlan.id ? target.groupId : QUICK_ADD_CREATE_ENTRY_VALUE;
    }
  }

  function getSelectedPlan() {
    return latestPlans.find(plan => plan.id === selectedPlanId) || null;
  }

  function populatePlanSelect(planSelect) {
    if (!planSelect) {
      return;
    }

    const activePlanIds = new Set(latestPlans.filter(plan => isPlanActive(plan)).map(plan => plan.id));
    replaceSelectOptions(
      planSelect,
      latestPlans.map(plan => ({
        value: plan.id,
        label: activePlanIds.has(plan.id)
          ? getMessage('popupQuickAddActivePlanOption', [plan.name])
          : plan.name
      })),
      selectedPlanId
    );
  }

  function populateGroupSelect(groupSelect) {
    if (!groupSelect) {
      return;
    }

    const selectedPlan = getSelectedPlan();
    const url = latestActiveTab?.url || '';
    const groupOptions = selectedPlan
      ? selectedPlan.groups.map(group => ({
          value: group.id,
          label: quickAddGroupMatchesUrl(group, url)
            ? getMessage('popupQuickAddMatchingEntryOption', [group.groupName])
            : group.groupName
        }))
      : [];

    groupOptions.push({
      value: QUICK_ADD_CREATE_ENTRY_VALUE,
      label: getMessage('popupQuickAddCreateEntryOption')
    });

    replaceSelectOptions(groupSelect, groupOptions, selectedGroupId);
  }

  function renderSimulation() {
    const { simulation, scoreInput } = getElements();
    if (!simulation) {
      return;
    }

    const selectedPlan = getSelectedPlan();
    const score = normalizeQuickAddScore(scoreInput?.value, latestCandidate?.estimatedScore100);
    const selectedGroup = selectedPlan?.groups.find(group => group.id === selectedGroupId) || null;
    const matchesCurrentPage = selectedGroupId === QUICK_ADD_CREATE_ENTRY_VALUE
      ? Boolean(latestActiveTab?.url)
      : quickAddGroupMatchesUrl(selectedGroup, latestActiveTab?.url || '');

    if (!latestCandidate) {
      simulation.textContent = getMessage('popupNoKeywordIdeas');
    } else if (!selectedPlan) {
      simulation.textContent = getMessage('popupQuickAddNoPlans');
    } else if (!matchesCurrentPage) {
      simulation.textContent = getMessage('popupQuickAddSimulationNoMatch');
    } else if (score >= 100) {
      simulation.textContent = getMessage('popupQuickAddSimulationWouldBlock', [score]);
    } else {
      simulation.textContent = getMessage('popupQuickAddSimulationWouldNotBlock', [score]);
    }
  }

  function render() {
    const {
      panel,
      planSelect,
      groupSelect,
      scoreInput,
      saveButton
    } = getElements();

    if (!panel) {
      return;
    }

    panel.hidden = !latestCandidate;
    populatePlanSelect(planSelect);
    populateGroupSelect(groupSelect);

    if (scoreInput && latestCandidate && !scoreTouched && !scoreInput.value) {
      scoreInput.value = String(latestCandidate.estimatedScore100);
    }

    const disabled = !latestCandidate || latestPlans.length === 0 || !selectedPlanId;
    if (planSelect) planSelect.disabled = !latestCandidate || latestPlans.length === 0;
    if (groupSelect) groupSelect.disabled = !latestCandidate || latestPlans.length === 0;
    if (scoreInput) scoreInput.disabled = !latestCandidate || latestPlans.length === 0;
    if (saveButton) saveButton.disabled = disabled;
    renderSimulation();
  }

  async function saveSelectedTextRule() {
    const { scoreInput, saveButton } = getElements();
    if (!latestCandidate) {
      setStatus?.(getMessage('popupNoKeywordIdeas'));
      return false;
    }

    const activeTab = latestActiveTab || await getActiveTab?.();
    const score = normalizeQuickAddScore(scoreInput?.value, latestCandidate.estimatedScore100);
    if (saveButton) saveButton.disabled = true;

    try {
      const items = await getSync(null);
      const currentPlans = normalizePlans(items?.[PLANS_STORAGE_KEY]);
      const originalPlan = currentPlans.find(plan => plan.id === selectedPlanId);
      const result = applySelectedTextQuickAdd(currentPlans, {
        planId: selectedPlanId,
        groupId: selectedGroupId,
        candidate: latestCandidate,
        score,
        url: activeTab?.url || '',
        createEntryName: getMessage('popupQuickAddEntryName')
      });

      if (!originalPlan || result.status === 'noPlan') {
        setStatus?.(getMessage('popupQuickAddNoPlans'));
        return false;
      }

      if (result.status === 'noCandidate') {
        setStatus?.(getMessage('popupNoKeywordIdeas'));
        return false;
      }

      const nextPlan = result.plans.find(plan => plan.id === originalPlan.id);
      if (isInProtectedSchedule(items) && !isPlanChangeAllowedDuringProtectedSchedule(originalPlan, nextPlan)) {
        setStatus?.(getMessage('popupQuickAddLockedRejected'));
        return false;
      }

      if (!result.changed) {
        setStatus?.(getMessage('popupQuickAddAlreadyCovered'));
        return false;
      }

      await savePlansWithPriority(result.plans);
      latestPlans = result.plans;
      onPlansChange?.(result.plans);
      render();
      if (activeTab?.id && sendTabMessage) {
        sendTabMessage(activeTab.id, { action: SITE_CHECK_MESSAGE }).catch(() => {});
      }
      setStatus?.(getMessage('popupQuickAddSaved'));
      return true;
    } catch (error) {
      console.error('Failed to save selected text rule:', error);
      setStatus?.(getMessage('popupQuickAddFailed'));
      return false;
    } finally {
      render();
    }
  }

  function bindEvents() {
    const { planSelect, groupSelect, scoreInput } = getElements();
    planSelect?.addEventListener('change', event => {
      selectedPlanId = event.currentTarget.value;
      selectedGroupId = '';
      ensureSelectedTarget();
      render();
    });
    groupSelect?.addEventListener('change', event => {
      selectedGroupId = event.currentTarget.value || QUICK_ADD_CREATE_ENTRY_VALUE;
      render();
    });
    scoreInput?.addEventListener('input', () => {
      scoreTouched = true;
      renderSimulation();
    });
  }

  return {
    bindEvents,
    refreshPlans,
    render,
    saveSelectedTextRule,
    setActiveTab,
    setCandidate,
    setPlans
  };
}

function replaceSelectOptions(select, options, selectedValue) {
  const normalizedSelectedValue = String(selectedValue || '');
  select.textContent = '';
  options.forEach(option => {
    const element = document.createElement('option');
    element.value = option.value;
    element.textContent = option.label || option.value;
    select.appendChild(element);
  });

  if (options.some(option => option.value === normalizedSelectedValue)) {
    select.value = normalizedSelectedValue;
  } else if (options[0]) {
    select.value = options[0].value;
  }
}
