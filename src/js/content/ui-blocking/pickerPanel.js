// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const elementBlocking = global.DAD.ElementBlocking = global.DAD.ElementBlocking || {};
  const { PICKER_PANEL_ID, DEFAULT_THEME_MODE, THEME_STORAGE_KEY } = elementBlocking.constants;
  const { describeElement, normalizeNumber } = elementBlocking.fingerprint;
  const { ensurePickerStyle } = elementBlocking.pickerStyle;

  const PICKER_MESSAGES = {
    elementPickerTitle: 'DaD UI picker',
    elementPickerInitialMessage: 'Hover an element, click to preview the rule, then save or choose again.',
    elementPickerNoElementSelected: 'No element selected',
    elementPickerModeLabel: 'Mode',
    elementPickerPickElementOption: 'Pick element',
    elementPickerClickPageOption: 'Click page',
    elementPickerActionLabel: 'Rule action',
    elementPickerHideActionOption: 'Hide',
    elementPickerClickActionOption: 'Click once',
    elementPickerClearActionOption: 'Clear field',
    elementPickerPauseMediaActionOption: 'Pause media',
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
    elementPickerPreviewClickingVerb: 'clicking once on',
    elementPickerPreviewClearingVerb: 'clearing once in',
    elementPickerPreviewPausingMediaVerb: 'pausing media in',
    elementPickerElementSingular: 'element',
    elementPickerElementPlural: 'elements',
    elementPickerPreviewMessage: 'Preview is $1 $2 $3. Adjust settings, save, choose again, or cancel.',
    elementPickerRuleSavedPickAnother: 'Element blocking rule saved. Pick another element.',
    elementPickerRuleSaved: 'Element blocking rule saved.',
    elementPickerChooseAgainMessage: 'Hover an element and click to preview the rule.',
    elementPickerClickPageModeMessage: 'Click page mode is active. Use the page normally, then hover Mode and scroll back to pick an element.',
    elementPickerPickModeMessage: 'Hover an element and click it to preview the rule.',
    elementPickerSaveErrorMessage: 'Could not save this rule. Try again.',
    elementPickerStorageUnavailableError: 'Cannot save this UI rule because extension storage is unavailable.',
    elementPickerProtectedReserveError: 'Cannot save this UI rule: sync storage reserve for locked schedules would be exceeded.',
    elementPickerLegacyRemoveError: 'Cannot remove legacy UI rule storage after saving.'
  };

  function getPickerMessage(key, fallbackOrSubstitutions, maybeSubstitutions) {
    const hasExplicitFallback = maybeSubstitutions !== undefined;
    const fallback = hasExplicitFallback ? fallbackOrSubstitutions : (PICKER_MESSAGES[key] || key);
    const substitutions = hasExplicitFallback ? maybeSubstitutions : fallbackOrSubstitutions;
    return global.DAD.UiLanguage?.getMessage?.(key, PICKER_MESSAGES[key] || fallback, substitutions)
      || PICKER_MESSAGES[key]
      || fallback;
  }

  function isPickerPanelEvent(event) {
    return Boolean(event.target?.closest?.(`#${PICKER_PANEL_ID}`));
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
    global.DAD.UiLanguage?.applyDirection?.(panel);
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
      getPickerMessage('elementPickerActionLabel'),
      createPickerWheelToggle([
        ['hide', getPickerMessage('elementPickerHideActionOption')],
        ['click', getPickerMessage('elementPickerClickActionOption')],
        ['clear', getPickerMessage('elementPickerClearActionOption')],
        ['pauseMedia', getPickerMessage('elementPickerPauseMediaActionOption')]
      ], controls.action, value => onControlsChange({ action: value }))
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

  elementBlocking.pickerPanel = {
    applyPickerTheme,
    createPickerPanel,
    ensurePickerStyle,
    getPickerMessage,
    isPickerPanelEvent
  };

  global.DAD.UiLanguage?.onChange?.(() => global.DAD.UiLanguage?.applyDirection?.(document.getElementById(PICKER_PANEL_ID)));
})(window);
