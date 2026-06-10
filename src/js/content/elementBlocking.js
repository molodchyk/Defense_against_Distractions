// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const elementBlocking = global.DAD.ElementBlocking = global.DAD.ElementBlocking || {};
  const {
    PICKER_STYLE_ID,
    PICKER_PANEL_ID,
    PICKER_ATTRIBUTE,
    ELEMENT_RULE_VERSION,
    DEFAULT_MIN_SCORE,
    DEFAULT_ANCESTOR_DEPTH,
    DEFAULT_PREVIEW_MODE,
    DEFAULT_PICKER_ACTION_MODE,
    DEFAULT_TARGET_LEVEL,
    THEME_STORAGE_KEY,
    DEFAULT_THEME_MODE
  } = elementBlocking.constants;
  const {
    createFingerprint,
    createRuleName,
    describeElement,
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

  let highlightedElement = null;
  let pickerCleanup = null;

  const PICKER_MESSAGES = {
    elementPickerTitle: 'DaD UI picker',
    elementPickerInitialMessage: 'Hover an element, click to preview the rule, then save or choose again.',
    elementPickerNoElementSelected: 'No element selected',
    elementPickerModeLabel: 'Mode',
    elementPickerPickElementOption: 'Pick element',
    elementPickerClickPageOption: 'Click page',
    elementPickerPreviewLabel: 'Preview',
    elementPickerHideMatchedOption: 'Hide matched',
    elementPickerOutlineMatchedOption: 'Outline matched',
    elementPickerTargetLabel: 'Target',
    elementPickerClickedElementOption: 'Clicked element',
    elementPickerParentOption: 'Parent',
    elementPickerGrandparentOption: 'Grandparent',
    elementPickerGreatGrandparentOption: 'Great-grandparent',
    elementPickerStrategyLabel: 'Strategy',
    elementPickerSamePositionOption: 'Same position',
    elementPickerSameTextOption: 'Same text/label',
    elementPickerSimilarOption: 'Similar',
    elementPickerClosestOption: 'Closest',
    elementPickerMinimumScoreLabel: 'Minimum score',
    elementPickerAncestorDepthLabel: 'Ancestor depth',
    elementPickerLabelMatchLabel: 'Label match',
    elementPickerPreferLabelOption: 'Prefer label',
    elementPickerIgnoreLabelOption: 'Ignore label',
    elementPickerRequireLabelOption: 'Require label',
    elementPickerSaveRuleButton: 'Save rule',
    elementPickerSaveRuleAndContinueButton: 'Save rule and continue',
    elementPickerChooseAgainButton: 'Choose again',
    elementPickerCancelButton: 'Cancel',
    elementPickerPreviewHidingVerb: 'hiding',
    elementPickerPreviewOutliningVerb: 'outlining',
    elementPickerElementSingular: 'element',
    elementPickerElementPlural: 'elements',
    elementPickerPreviewMessage: 'Preview is $1 $2 $3. Adjust settings, save, choose again, or cancel.',
    elementPickerRuleSavedPickAnother: 'Element blocking rule saved. Pick another element.',
    elementPickerRuleSaved: 'Element blocking rule saved.',
    elementPickerChooseAgainMessage: 'Hover an element and click to preview the rule.',
    elementPickerClickPageModeMessage: 'Click page mode is active. Use the page normally, then hover Mode and scroll back to pick an element.',
    elementPickerPickModeMessage: 'Hover an element and click it to preview the rule.',
    elementPickerSaveErrorMessage: 'Could not save this rule. Try again.'
  };

  function getPickerMessage(key, fallbackOrSubstitutions, maybeSubstitutions) {
    const hasExplicitFallback = maybeSubstitutions !== undefined;
    const fallback = hasExplicitFallback ? fallbackOrSubstitutions : (PICKER_MESSAGES[key] || key);
    const substitutions = hasExplicitFallback ? maybeSubstitutions : fallbackOrSubstitutions;
    return global.DAD.UiLanguage?.getMessage?.(key, PICKER_MESSAGES[key] || fallback, substitutions)
      || PICKER_MESSAGES[key]
      || fallback;
  }

  function getUrlPattern() {
    return normalizeToken(location.hostname);
  }

  function isPickerPanelEvent(event) {
    return Boolean(event.target?.closest?.(`#${PICKER_PANEL_ID}`));
  }

  function ensurePickerStyle() {
    if (document.getElementById(PICKER_STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = PICKER_STYLE_ID;
    style.textContent = `
      #${PICKER_PANEL_ID} {
        --dad-picker-bg: #111318;
        --dad-picker-surface: #1a1e26;
        --dad-picker-field: #151922;
        --dad-picker-border: #343b49;
        --dad-picker-text: #eef2f7;
        --dad-picker-muted: #a8b0bf;
        --dad-picker-primary: #3d8bfd;
        --dad-picker-neutral: #343b49;
        --dad-picker-disabled: #596477;
        color-scheme: dark;
      }

      #${PICKER_PANEL_ID}[data-theme="light"] {
        --dad-picker-bg: #ffffff;
        --dad-picker-surface: #f5f7fb;
        --dad-picker-field: #ffffff;
        --dad-picker-border: #cfd6e2;
        --dad-picker-text: #17202e;
        --dad-picker-muted: #526173;
        --dad-picker-primary: #2463d6;
        --dad-picker-neutral: #68758a;
        --dad-picker-disabled: #d8dee8;
        color-scheme: light;
      }

      [${PICKER_ATTRIBUTE}="true"] {
        outline: 3px solid #3d8bfd !important;
        outline-offset: 3px !important;
        cursor: crosshair !important;
      }

      #${PICKER_PANEL_ID} {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 2147483647;
        width: min(420px, calc(100vw - 32px));
        border-radius: 8px;
        background: var(--dad-picker-bg);
        color: var(--dad-picker-text);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28);
        font: 14px/1.4 Arial, sans-serif;
        overflow: hidden;
      }

      #${PICKER_PANEL_ID} label {
        display: grid;
        gap: 4px;
        color: var(--dad-picker-muted);
        font: 700 12px/1.3 Arial, sans-serif;
      }

      #${PICKER_PANEL_ID} select,
      #${PICKER_PANEL_ID} input {
        appearance: auto !important;
        min-height: 32px;
        width: 100%;
        border: 1px solid var(--dad-picker-border);
        border-radius: 6px;
        background: var(--dad-picker-field);
        color: var(--dad-picker-text);
        padding: 6px 8px;
        font: 13px/1.3 Arial, sans-serif;
      }

      #${PICKER_PANEL_ID} input[type="number"]::-webkit-inner-spin-button,
      #${PICKER_PANEL_ID} input[type="number"]::-webkit-outer-spin-button {
        -webkit-appearance: auto !important;
        appearance: auto !important;
        background: transparent !important;
      }

      #${PICKER_PANEL_ID} button {
        min-height: 32px;
        border: 1px solid transparent;
        border-radius: 6px;
        padding: 6px 10px;
        background: var(--dad-picker-primary);
        color: #ffffff;
        cursor: pointer;
        font: 700 13px/1.2 Arial, sans-serif;
      }

      #${PICKER_PANEL_ID} button[data-dad-secondary="true"] {
        background: var(--dad-picker-neutral);
      }

      #${PICKER_PANEL_ID} button:disabled {
        background: var(--dad-picker-disabled);
        color: var(--dad-picker-muted);
        cursor: not-allowed;
      }

      #${PICKER_PANEL_ID} .dad-picker-wheel-toggle {
        min-height: 32px;
        width: 100%;
        border: 1px solid var(--dad-picker-border);
        border-radius: 6px;
        background: var(--dad-picker-field);
        color: var(--dad-picker-text);
        cursor: ns-resize;
        padding: 6px 8px;
        font: 13px/1.3 Arial, sans-serif;
      }

      #${PICKER_PANEL_ID} .dad-picker-wheel-toggle:focus-visible {
        outline: 2px solid var(--dad-picker-primary);
        outline-offset: 2px;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function createPickerButton(text, onClick, isSecondary = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    if (isSecondary) {
      button.dataset.dadSecondary = 'true';
    }
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });
    return button;
  }

  function makePickerPanelDraggable(panel, handle) {
    let pointerOffsetX = 0;
    let pointerOffsetY = 0;

    const onPointerMove = event => {
      const nextLeft = Math.max(8, Math.min(window.innerWidth - panel.offsetWidth - 8, event.clientX - pointerOffsetX));
      const nextTop = Math.max(8, Math.min(window.innerHeight - panel.offsetHeight - 8, event.clientY - pointerOffsetY));

      panel.style.left = `${nextLeft}px`;
      panel.style.top = `${nextTop}px`;
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('pointerup', onPointerUp, true);
    };

    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      const rect = panel.getBoundingClientRect();
      pointerOffsetX = event.clientX - rect.left;
      pointerOffsetY = event.clientY - rect.top;
      window.addEventListener('pointermove', onPointerMove, true);
      window.addEventListener('pointerup', onPointerUp, true);
    });
  }

  function resolveThemeMode(mode) {
    if (mode === 'dark' || mode === 'light') return mode;
    return global.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyPickerTheme(panel, mode) {
    panel.dataset.theme = resolveThemeMode(mode || DEFAULT_THEME_MODE);
  }

  function syncPickerTheme(panel) {
    global.DAD.safeSyncStorageGet({ [THEME_STORAGE_KEY]: DEFAULT_THEME_MODE }, result => {
      if (!result) {
        applyPickerTheme(panel, DEFAULT_THEME_MODE);
        return;
      }

      applyPickerTheme(panel, result[THEME_STORAGE_KEY]);
    });
  }

  function createPickerSelect(options, selectedValue, onChange) {
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

  function createPickerNumberInput(value, min, max, onChange) {
    const input = document.createElement('input');
    input.type = 'number';
    input.min = String(min);
    input.max = String(max);
    input.value = String(value);
    input.addEventListener('change', () => {
      const normalizedValue = normalizeNumber(input.value, value, min, max);
      input.value = String(normalizedValue);
      onChange(normalizedValue);
    });
    return input;
  }

  function createPickerWheelToggle(options, selectedValue, onChange) {
    const control = document.createElement('div');
    control.className = 'dad-picker-wheel-toggle';
    control.role = 'button';
    control.tabIndex = 0;

    const updateText = value => {
      const option = options.find(([optionValue]) => optionValue === value) || options[0];
      control.dataset.value = option[0];
      control.textContent = option[1];
    };

    const step = direction => {
      const currentIndex = Math.max(0, options.findIndex(([value]) => value === control.dataset.value));
      const nextIndex = (currentIndex + direction + options.length) % options.length;
      const [nextValue] = options[nextIndex];
      updateText(nextValue);
      onChange(nextValue);
    };

    control.addEventListener('wheel', event => {
      event.preventDefault();
      event.stopPropagation();
      step(event.deltaY >= 0 ? 1 : -1);
    }, { passive: false });
    control.addEventListener('keydown', event => {
      if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      step(event.key === 'ArrowDown' ? 1 : -1);
    });

    updateText(selectedValue);
    return control;
  }

  function createPickerControl(labelText, control) {
    const label = document.createElement('label');
    const text = document.createElement('span');
    text.textContent = labelText;
    label.appendChild(text);
    label.appendChild(control);
    return label;
  }

  function createPickerPanel({ controls, onControlsChange, onSave, onChooseAgain, onCancel }) {
    document.getElementById(PICKER_PANEL_ID)?.remove();

    const panel = document.createElement('section');
    panel.id = PICKER_PANEL_ID;
    syncPickerTheme(panel);

    const handle = document.createElement('div');
    handle.style.cssText = 'display:grid;gap:2px;padding:12px 12px 8px;cursor:move;border-bottom:1px solid var(--dad-picker-border);';

    const title = document.createElement('strong');
    title.textContent = getPickerMessage('elementPickerTitle');

    const message = document.createElement('span');
    message.style.cssText = 'color:var(--dad-picker-muted);font-size:12px;';
    message.textContent = getPickerMessage('elementPickerInitialMessage');

    handle.appendChild(title);
    handle.appendChild(message);

    const selectedText = document.createElement('div');
    selectedText.style.cssText = 'padding:10px 12px 0;color:var(--dad-picker-text);overflow-wrap:anywhere;';
    selectedText.textContent = getPickerMessage('elementPickerNoElementSelected');

    const controlGrid = document.createElement('div');
    controlGrid.style.cssText = 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:10px 12px 0;';

    controlGrid.appendChild(createPickerControl(
      getPickerMessage('elementPickerModeLabel'),
      createPickerWheelToggle([
        ['pick', getPickerMessage('elementPickerPickElementOption')],
        ['click', getPickerMessage('elementPickerClickPageOption')]
      ], controls.actionMode, value => onControlsChange({ actionMode: value }))
    ));
    controlGrid.appendChild(createPickerControl(
      getPickerMessage('elementPickerPreviewLabel'),
      createPickerWheelToggle([
        ['hide', getPickerMessage('elementPickerHideMatchedOption')],
        ['outline', getPickerMessage('elementPickerOutlineMatchedOption')]
      ], controls.previewMode, value => onControlsChange({ previewMode: value }))
    ));
    controlGrid.appendChild(createPickerControl(
      getPickerMessage('elementPickerTargetLabel'),
      createPickerWheelToggle([
        ['0', getPickerMessage('elementPickerClickedElementOption')],
        ['1', getPickerMessage('elementPickerParentOption')],
        ['2', getPickerMessage('elementPickerGrandparentOption')],
        ['3', getPickerMessage('elementPickerGreatGrandparentOption')]
      ], String(controls.targetLevel), value => onControlsChange({ targetLevel: Number.parseInt(value, 10) }))
    ));
    controlGrid.appendChild(createPickerControl(
      getPickerMessage('elementPickerStrategyLabel'),
      createPickerSelect([
        ['samePosition', getPickerMessage('elementPickerSamePositionOption')],
        ['sameText', getPickerMessage('elementPickerSameTextOption')],
        ['similar', getPickerMessage('elementPickerSimilarOption')],
        ['exact', getPickerMessage('elementPickerClosestOption')]
      ], controls.strategy, value => onControlsChange({ strategy: value }))
    ));
    controlGrid.appendChild(createPickerControl(
      getPickerMessage('elementPickerMinimumScoreLabel'),
      createPickerNumberInput(controls.minScore, 6, 24, value => onControlsChange({ minScore: value }))
    ));
    controlGrid.appendChild(createPickerControl(
      getPickerMessage('elementPickerAncestorDepthLabel'),
      createPickerNumberInput(controls.ancestorDepth, 0, 6, value => onControlsChange({ ancestorDepth: value }))
    ));
    controlGrid.appendChild(createPickerControl(
      getPickerMessage('elementPickerLabelMatchLabel'),
      createPickerSelect([
        ['prefer', getPickerMessage('elementPickerPreferLabelOption')],
        ['ignore', getPickerMessage('elementPickerIgnoreLabelOption')],
        ['require', getPickerMessage('elementPickerRequireLabelOption')]
      ], controls.labelMatch, value => onControlsChange({ labelMatch: value }))
    ));

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;padding:0 12px 12px;flex-wrap:wrap;';

    const saveButton = createPickerButton(getPickerMessage('elementPickerSaveRuleButton'), onSave);
    saveButton.disabled = true;
    actions.appendChild(createPickerButton(getPickerMessage('elementPickerChooseAgainButton'), onChooseAgain, true));
    actions.appendChild(createPickerButton(getPickerMessage('elementPickerCancelButton'), onCancel, true));
    actions.appendChild(saveButton);

    panel.appendChild(handle);
    panel.appendChild(selectedText);
    panel.appendChild(controlGrid);
    panel.appendChild(actions);
    document.documentElement.appendChild(panel);
    makePickerPanelDraggable(panel, handle);

    return {
      setSelection(element) {
        selectedText.textContent = element ? describeElement(element) : getPickerMessage('elementPickerNoElementSelected');
        saveButton.disabled = !element;
      },
      setMessage(text) {
        message.textContent = text;
      },
      setSaveContinuation(isContinuing) {
        saveButton.textContent = isContinuing
          ? getPickerMessage('elementPickerSaveRuleAndContinueButton')
          : getPickerMessage('elementPickerSaveRuleButton');
      },
      remove() {
        panel.remove();
      }
    };
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
      name: options.name || createRuleName(element),
      urlPattern: options.urlPattern || getUrlPattern(),
      urlScope: options.urlScope || 'host',
      createdAt: new Date().toISOString(),
      fingerprint: createFingerprint(element)
    };
  };

  global.DAD.applyElementBlockRules = function() {
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

    const buildPreviewRule = () => {
      if (!selectedElement) return null;

      return global.DAD.createElementBlockRule(getRuleTargetElement(selectedElement, pickerControls.targetLevel), pickerControls);
    };

    const updatePreview = () => {
      if (!selectedElement || !pickerPanel) return;

      previewRule = buildPreviewRule();
      const matchCount = previewElementRule(previewRule, pickerControls.previewMode);
      const verb = pickerControls.previewMode === 'outline'
        ? getPickerMessage('elementPickerPreviewOutliningVerb')
        : getPickerMessage('elementPickerPreviewHidingVerb');
      const noun = matchCount === 1
        ? getPickerMessage('elementPickerElementSingular')
        : getPickerMessage('elementPickerElementPlural');
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
          pickerPanel.setMessage(error?.message || getPickerMessage('elementPickerSaveErrorMessage'));
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
