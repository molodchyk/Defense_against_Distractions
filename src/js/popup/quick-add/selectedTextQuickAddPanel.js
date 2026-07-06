// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { getSync } from '../../../platform/chrome/storage.js';
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
import { normalizeSelectedTextCandidate } from '../pageSignalsPanel.js';
import {
  QUICK_ADD_ACTION_PRESETS,
  applySelectedTextQuickAdd,
  getDefaultQuickAddGroupId,
  getDefaultQuickAddTarget,
  normalizeQuickAddActionPreset,
  normalizeQuickAddScore,
  quickAddGroupMatchesUrl,
  QUICK_ADD_CREATE_ENTRY_VALUE,
  QUICK_ADD_DEFAULT_ENTRY_NAME
} from './selectedTextQuickAddModel.js';

const SITE_CHECK_MESSAGE = 'performSiteCheck';
const CONSUME_PENDING_SELECTED_TEXT_QUICK_ADD_ACTION = 'consumePendingSelectedTextQuickAdd';

export function createSelectedTextQuickAddPanel({
  getMessage,
  getActiveTab,
  sendRuntimeMessage,
  sendTabMessage,
  startElementPicker,
  openPlanActions,
  setStatus,
  onPlansChange
}) {
  let latestCandidate = null;
  let latestPlans = [];
  let latestActiveTab = null;
  let selectedPlanId = '';
  let selectedGroupId = QUICK_ADD_CREATE_ENTRY_VALUE;
  let selectedActionPreset = QUICK_ADD_ACTION_PRESETS.KEYWORD_ONLY;
  let scoreTouched = false;
  let lastKeywordScoreValue = '';

  function getElements() {
    return {
      panel: document.getElementById('selectedTextQuickAddPanel'),
      planSelect: document.getElementById('selectedTextQuickAddPlanSelect'),
      groupSelect: document.getElementById('selectedTextQuickAddEntrySelect'),
      actionSelect: document.getElementById('selectedTextQuickAddActionSelect'),
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
      lastKeywordScoreValue = String(latestCandidate.estimatedScore100);
      scoreInput.value = isBlockPagePreset() ? '100' : lastKeywordScoreValue;
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

  async function refreshPendingCandidate() {
    if (!sendRuntimeMessage) {
      return null;
    }

    const activeTab = latestActiveTab || await getActiveTab?.();
    if (activeTab) {
      setActiveTab(activeTab);
    }

    if (!activeTab?.id && !activeTab?.url) {
      return null;
    }

    const response = await sendRuntimeMessage({
      action: CONSUME_PENDING_SELECTED_TEXT_QUICK_ADD_ACTION,
      tabId: activeTab?.id,
      url: activeTab?.url || ''
    });
    if (!response?.candidate) {
      return null;
    }

    if (response.tab?.id || response.tab?.url) {
      latestActiveTab = {
        ...activeTab,
        id: response.tab.id || activeTab?.id,
        url: response.tab.url || activeTab?.url || ''
      };
    }

    setCandidate(response.candidate);
    return latestCandidate;
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

    const selectedPlanDefaultGroupId = getDefaultQuickAddGroupId(selectedPlan, latestActiveTab?.url || '');
    const groupExists = selectedPlan.groups.some(group => group.id === selectedGroupId);
    if (!groupExists && selectedGroupId !== QUICK_ADD_CREATE_ENTRY_VALUE) {
      selectedGroupId = selectedPlanDefaultGroupId;
    }

    if (!selectedGroupId) {
      selectedGroupId = selectedPlanDefaultGroupId;
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

  function populateActionSelect(actionSelect) {
    if (!actionSelect) {
      return;
    }

    replaceSelectOptions(actionSelect, [{
      value: QUICK_ADD_ACTION_PRESETS.KEYWORD_ONLY,
      label: getMessage('popupQuickAddKeywordOnlyOption')
    }, {
      value: QUICK_ADD_ACTION_PRESETS.BLOCK_PAGE,
      label: getMessage('popupQuickAddBlockPageOption')
    }, {
      value: QUICK_ADD_ACTION_PRESETS.HIDE_IMAGES,
      label: getMessage('elementPickerHideImagesActionOption')
    }, {
      value: QUICK_ADD_ACTION_PRESETS.DISABLE_CONTROLS,
      label: getMessage('elementPickerDisableControlsActionOption')
    }, {
      value: QUICK_ADD_ACTION_PRESETS.ACTION_CHAIN,
      label: getMessage('popupQuickAddActionChainOption')
    }], selectedActionPreset);
  }

  function isBlockPagePreset() {
    return selectedActionPreset === QUICK_ADD_ACTION_PRESETS.BLOCK_PAGE;
  }

  function isCleanupPreset() {
    return selectedActionPreset === QUICK_ADD_ACTION_PRESETS.HIDE_IMAGES
      || selectedActionPreset === QUICK_ADD_ACTION_PRESETS.DISABLE_CONTROLS;
  }

  function isActionChainPreset() {
    return selectedActionPreset === QUICK_ADD_ACTION_PRESETS.ACTION_CHAIN;
  }

  function getSelectedScore(scoreInput) {
    if (isBlockPagePreset()) {
      return 100;
    }

    return normalizeQuickAddScore(scoreInput?.value, latestCandidate?.estimatedScore100);
  }

  function renderSimulation() {
    const { simulation, scoreInput } = getElements();
    if (!simulation) {
      return;
    }

    const selectedPlan = getSelectedPlan();
    const score = getSelectedScore(scoreInput);
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
      actionSelect,
      scoreInput,
      saveButton
    } = getElements();

    if (!panel) {
      return;
    }

    panel.hidden = !latestCandidate;
    populatePlanSelect(planSelect);
    populateGroupSelect(groupSelect);
    populateActionSelect(actionSelect);

    if (scoreInput && latestCandidate && !scoreTouched && !scoreInput.value) {
      lastKeywordScoreValue = lastKeywordScoreValue || String(latestCandidate.estimatedScore100);
      scoreInput.value = isBlockPagePreset() ? '100' : lastKeywordScoreValue;
    } else if (scoreInput && latestCandidate && isBlockPagePreset()) {
      scoreInput.value = '100';
    }

    const disabled = !latestCandidate || latestPlans.length === 0 || !selectedPlanId;
    if (planSelect) planSelect.disabled = !latestCandidate || latestPlans.length === 0;
    if (groupSelect) groupSelect.disabled = !latestCandidate || latestPlans.length === 0;
    if (actionSelect) actionSelect.disabled = !latestCandidate || latestPlans.length === 0;
    if (scoreInput) scoreInput.disabled = !latestCandidate || latestPlans.length === 0 || isBlockPagePreset();
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
    const score = getSelectedScore(scoreInput);
    if (saveButton) saveButton.disabled = true;

    try {
      const items = await getSync(null);
      const currentPlans = normalizePlans(items?.[PLANS_STORAGE_KEY]);
      const originalPlan = currentPlans.find(plan => plan.id === selectedPlanId);
      const result = applySelectedTextQuickAdd(currentPlans, {
        planId: selectedPlanId,
        groupId: selectedGroupId,
        actionPreset: isCleanupPreset()
          ? QUICK_ADD_ACTION_PRESETS.KEYWORD_ONLY
          : selectedActionPreset,
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

      if (!result.changed && !canContinueWithoutPlanChange()) {
        setStatus?.(getMessage('popupQuickAddAlreadyCovered'));
        return false;
      }

      if (result.changed) {
        await savePlansWithPriority(result.plans);
        latestPlans = result.plans;
        onPlansChange?.(result.plans);
        render();
      }

      if (isCleanupPreset() && startElementPicker) {
        await startElementPicker({
          initialAction: selectedActionPreset,
          assignRuleToPlanId: selectedPlanId
        });
        return true;
      }
      if (isActionChainPreset() && openPlanActions) {
        setStatus?.(getMessage(result.changed ? 'popupQuickAddSavedOpenActions' : 'popupQuickAddOpenActions'));
        openPlanActions(selectedPlanId, { triggerFilter: result.keywordTriggerFilter });
        return true;
      }
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

  function canContinueWithoutPlanChange() {
    return (isCleanupPreset() && startElementPicker) || (isActionChainPreset() && openPlanActions);
  }

  function bindEvents() {
    const { planSelect, groupSelect, actionSelect, scoreInput } = getElements();
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
    actionSelect?.addEventListener('change', event => {
      if (scoreInput && !isBlockPagePreset()) {
        lastKeywordScoreValue = scoreInput.value || lastKeywordScoreValue;
      }

      selectedActionPreset = normalizeQuickAddActionPreset(event.currentTarget.value);
      if (scoreInput) {
        scoreInput.value = isBlockPagePreset()
          ? '100'
          : (lastKeywordScoreValue || String(latestCandidate?.estimatedScore100 || 25));
      }
      render();
    });
    scoreInput?.addEventListener('input', () => {
      scoreTouched = true;
      if (!isBlockPagePreset()) {
        lastKeywordScoreValue = scoreInput.value;
      }
      renderSimulation();
    });
  }

  return {
    bindEvents,
    refreshPendingCandidate,
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
