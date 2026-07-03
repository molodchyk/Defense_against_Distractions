// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const elementBlocking = global.DAD.ElementBlocking = global.DAD.ElementBlocking || {};
  const {
    PICKER_PANEL_ID,
    PICKER_ATTRIBUTE,
    ELEMENT_RULE_VERSION,
    DEFAULT_MIN_SCORE,
    DEFAULT_ANCESTOR_DEPTH,
    DEFAULT_RULE_ACTION,
    DEFAULT_PREVIEW_MODE,
    DEFAULT_PICKER_ACTION_MODE,
    DEFAULT_TARGET_LEVEL,
    THEME_STORAGE_KEY
  } = elementBlocking.constants;
  const {
    createFingerprint,
    createRuleName,
    getPickTargetFromPoint,
    getRuleTargetElement,
    isPickableElement,
    normalizeNumber,
    normalizeToken
  } = elementBlocking.fingerprint;
  const {
    hasElementRuleChange,
    loadElementRules,
    saveElementRule
  } = elementBlocking.storage;
  const {
    applyElementRules,
    clearPreviewBlocks,
    observeElementRules,
    previewElementRule,
    resetElementBlocks
  } = elementBlocking.dom;
  const {
    applyPickerTheme,
    createPickerPanel,
    ensurePickerStyle,
    getPickerMessage,
    isPickerPanelEvent
  } = elementBlocking.pickerPanel;
  const {
    getEffectivePreviewMode,
    getPreviewVerbKey
  } = elementBlocking.pickerPreview;
  const {
    applyBuiltInElementRules,
    observeBuiltInElementRules
  } = elementBlocking.builtInRules || {};

  let highlightedElement = null;
  let pickerCleanup = null;

  function getUrlPattern() {
    return normalizeToken(location.hostname);
  }

  function clearHighlight() {
    if (highlightedElement) {
      highlightedElement.removeAttribute(PICKER_ATTRIBUTE);
      highlightedElement = null;
    }
  }

  function stopPicker() {
    if (pickerCleanup) {
      pickerCleanup();
      pickerCleanup = null;
    }
  }

  global.DAD.createElementBlockRule = function(element, options = {}) {
    return {
      id: `element_rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      version: ELEMENT_RULE_VERSION,
      enabled: true,
      strategy: options.strategy || 'samePosition',
      minScore: normalizeNumber(options.minScore, DEFAULT_MIN_SCORE, 6, 24),
      ancestorDepth: normalizeNumber(options.ancestorDepth, DEFAULT_ANCESTOR_DEPTH, 0, 6),
      labelMatch: options.labelMatch || 'prefer',
      action: options.action || DEFAULT_RULE_ACTION,
      name: options.name || createRuleName(element),
      urlPattern: options.urlPattern || getUrlPattern(),
      urlScope: options.urlScope || 'host',
      createdAt: new Date().toISOString(),
      fingerprint: createFingerprint(element)
    };
  };

  global.DAD.applyElementBlockRules = function() {
    applyBuiltInElementRules?.();
    observeBuiltInElementRules?.();

    loadElementRules(rules => {
      global.DAD.safeSyncStorageGet('plans', items => {
        if (!items) {
          return;
        }

        const activeRules = global.DAD.Plans.filterElementRulesForActivePlans(rules, items);
        applyElementRules(activeRules);
        observeElementRules(activeRules);
      });
    });
  };

  global.DAD.safeStorageOnChangedAddListener((changes, areaName) => {
    if (areaName === 'sync' && changes[THEME_STORAGE_KEY]) {
      const pickerPanel = document.getElementById(PICKER_PANEL_ID);
      if (pickerPanel) {
        applyPickerTheme(pickerPanel, changes[THEME_STORAGE_KEY].newValue);
      }
    }

    if (areaName !== 'sync' || (!hasElementRuleChange(changes) && !changes.plans)) return;

    loadElementRules(rules => {
      global.DAD.safeSyncStorageGet('plans', items => {
        if (!items) {
          return;
        }

        const activeRules = global.DAD.Plans.filterElementRulesForActivePlans(rules, items);
        resetElementBlocks();
        applyElementRules(activeRules);
        observeElementRules(activeRules);
      });
    });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', global.DAD.applyElementBlockRules, { once: true });
  } else {
    global.DAD.applyElementBlockRules();
  }

  global.DAD.startElementPicker = function({
    strategy = 'samePosition',
    minScore = DEFAULT_MIN_SCORE,
    ancestorDepth = DEFAULT_ANCESTOR_DEPTH,
    labelMatch = 'prefer'
  } = {}) {
    stopPicker();
    ensurePickerStyle();
    let selectedElement = null;
    let previewRule = null;
    let previewObserver = null;
    let previewUpdateTimer = null;
    let shouldContinueAfterSave = false;
    const pickerControls = {
      strategy,
      minScore: normalizeNumber(minScore, DEFAULT_MIN_SCORE, 6, 24),
      ancestorDepth: normalizeNumber(ancestorDepth, DEFAULT_ANCESTOR_DEPTH, 0, 6),
      labelMatch,
      action: DEFAULT_RULE_ACTION,
      previewMode: DEFAULT_PREVIEW_MODE,
      actionMode: DEFAULT_PICKER_ACTION_MODE,
      targetLevel: DEFAULT_TARGET_LEVEL
    };
    let pickerPanel = null;

    const disconnectPreviewObserver = () => {
      if (previewObserver) {
        previewObserver.disconnect();
        previewObserver = null;
      }

      if (previewUpdateTimer) {
        global.clearTimeout(previewUpdateTimer);
        previewUpdateTimer = null;
      }
    };

    const buildPreviewRule = () => selectedElement
      ? global.DAD.createElementBlockRule(getRuleTargetElement(selectedElement, pickerControls.targetLevel), pickerControls)
      : null;

    const updatePreview = () => {
      if (!selectedElement || !pickerPanel) return;

      previewRule = buildPreviewRule();
      const effectivePreviewMode = getEffectivePreviewMode(pickerControls.action, pickerControls.previewMode);
      const matchCount = previewElementRule(previewRule, effectivePreviewMode);
      const verbKey = getPreviewVerbKey(pickerControls.action, effectivePreviewMode);
      const verb = getPickerMessage(verbKey);
      const noun = getPickerMessage(matchCount === 1 ? 'elementPickerElementSingular' : 'elementPickerElementPlural');
      pickerPanel.setSelection(getRuleTargetElement(selectedElement, pickerControls.targetLevel));
      pickerPanel.setMessage(getPickerMessage('elementPickerPreviewMessage', [
        verb,
        String(matchCount),
        noun
      ]));
    };

    const schedulePreviewUpdate = () => {
      if (!selectedElement) return;
      global.clearTimeout(previewUpdateTimer);
      previewUpdateTimer = global.setTimeout(updatePreview, 120);
    };

    const observePreviewChanges = () => {
      disconnectPreviewObserver();
      if (!document.body) return;

      previewObserver = new MutationObserver(schedulePreviewUpdate);
      previewObserver.observe(document.body, { childList: true, subtree: true });
    };

    const onMouseMove = event => {
      if (isPickerPanelEvent(event)) return;

      if (pickerControls.actionMode === 'click') {
        clearHighlight();
        return;
      }

      if (selectedElement) return;
      const pickTarget = getPickTargetFromPoint(event.clientX, event.clientY, event.target);
      if (!isPickableElement(pickTarget)) return;
      if (highlightedElement === pickTarget) return;
      clearHighlight();
      highlightedElement = pickTarget;
      highlightedElement.setAttribute(PICKER_ATTRIBUTE, 'true');
    };

    const onClick = async event => {
      if (isPickerPanelEvent(event)) return;

      if (pickerControls.actionMode === 'click') {
        return;
      }

      const pickTarget = getPickTargetFromPoint(event.clientX, event.clientY, event.target);
      if (!isPickableElement(pickTarget)) return;
      event.preventDefault();
      event.stopImmediatePropagation();

      clearPreviewBlocks();
      selectedElement = pickTarget;
      clearHighlight();
      updatePreview();
      observePreviewChanges();
    };

    const saveSelection = async () => {
      if (!previewRule) return;

      const continuePicking = shouldContinueAfterSave;
      clearPreviewBlocks();
      const updatedRules = await saveElementRule(previewRule);
      applyElementRules(updatedRules);
      observeElementRules(updatedRules);

      if (continuePicking) {
        selectedElement = null;
        previewRule = null;
        disconnectPreviewObserver();
        clearHighlight();
        pickerPanel.setSelection(null);
        pickerPanel.setMessage(getPickerMessage('elementPickerRuleSavedPickAnother'));
        return;
      }

      pickerPanel.setMessage(getPickerMessage('elementPickerRuleSaved'));
      window.setTimeout(stopPicker, 500);
    };

    const chooseAgain = () => {
      disconnectPreviewObserver();
      clearPreviewBlocks();
      selectedElement = null;
      previewRule = null;
      clearHighlight();
      pickerPanel.setSelection(null);
      pickerPanel.setMessage(getPickerMessage('elementPickerChooseAgainMessage'));
    };

    const onKeyDown = event => {
      if (event.key === 'Shift') {
        shouldContinueAfterSave = true;
        pickerPanel?.setSaveContinuation(true);
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        stopPicker();
      }
    };

    const onKeyUp = event => {
      if (event.key === 'Shift') {
        shouldContinueAfterSave = false;
        pickerPanel?.setSaveContinuation(false);
      }
    };

    window.addEventListener('mousemove', onMouseMove, true);
    window.addEventListener('click', onClick, true);
    window.addEventListener('scroll', schedulePreviewUpdate, true);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    pickerPanel = createPickerPanel({
      controls: pickerControls,
      onControlsChange: patch => {
        Object.assign(pickerControls, patch);
        if (patch.actionMode === 'click') {
          clearHighlight();
          pickerPanel.setMessage(getPickerMessage('elementPickerClickPageModeMessage'));
          return;
        }
        if (selectedElement) {
          updatePreview();
          return;
        }
        pickerPanel.setMessage(getPickerMessage('elementPickerPickModeMessage'));
      },
      onSave: () => {
        saveSelection().catch(error => {
          console.error('Failed to save element blocking rule:', error);
          const messageKey = typeof error?.messageKey === 'string' ? error.messageKey : 'elementPickerSaveErrorMessage';
          pickerPanel.setMessage(getPickerMessage(messageKey));
        });
      },
      onChooseAgain: chooseAgain,
      onCancel: stopPicker
    });

    pickerCleanup = () => {
      window.removeEventListener('mousemove', onMouseMove, true);
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('scroll', schedulePreviewUpdate, true);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      disconnectPreviewObserver();
      clearPreviewBlocks();
      clearHighlight();
      pickerPanel?.remove();
    };
  };
})(window);
