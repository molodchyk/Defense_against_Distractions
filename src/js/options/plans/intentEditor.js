// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  INTENT_INTERVENTION_ACTIONS,
  INTENT_POMODORO_INFLUENCE_MODES,
  normalizeIntentSettings
} from '../../shared/intentCoherence.js';
import {
  createButton,
  createCheckboxInput,
  createLabeledCheckbox,
  createLabeledControl,
  createNumberInput,
  createPlanSubsection,
  createSelectInput
} from './dom.js';
import { getPlanMessage } from './messages.js';

export function createPlanIntentEditor(plan, isLocked, { onSaveSettings }) {
  const section = createPlanSubsection('planIntentLabel');
  const settings = normalizeIntentSettings(plan.intent);

  const hint = document.createElement('p');
  hint.className = 'muted-text';
  hint.textContent = getPlanMessage('intentSettingsHint');

  const enabledInput = createCheckboxInput(settings.enabled, isLocked);
  const autoCalibrationInput = createCheckboxInput(settings.autoCalibration, isLocked);
  const actionSelect = createSelectInput([
    [INTENT_INTERVENTION_ACTIONS.WARN, getPlanMessage('intentActionWarnLabel')],
    [INTENT_INTERVENTION_ACTIONS.GRAYSCALE, getPlanMessage('intentActionGrayscaleLabel')],
    [INTENT_INTERVENTION_ACTIONS.PROMPT, getPlanMessage('intentActionPromptLabel')],
    [INTENT_INTERVENTION_ACTIONS.BLOCK, getPlanMessage('intentActionBlockLabel')]
  ], settings.action, isLocked);
  const interventionInput = createNumberInput(settings.interventionThreshold, 1, 99, isLocked);
  const lockedInput = createNumberInput(settings.lockedThreshold, 0, 98, isLocked);
  const pomodoroInfluenceSelect = createSelectInput([
    [INTENT_POMODORO_INFLUENCE_MODES.IGNORE, getPlanMessage('intentPomodoroIgnoreLabel')],
    [INTENT_POMODORO_INFLUENCE_MODES.WORK_STRICTER, getPlanMessage('intentPomodoroWorkStricterLabel')],
    [INTENT_POMODORO_INFLUENCE_MODES.BREAK_LENIENT, getPlanMessage('intentPomodoroBreakLenientLabel')],
    [INTENT_POMODORO_INFLUENCE_MODES.BOTH, getPlanMessage('intentPomodoroBothLabel')]
  ], settings.pomodoroInfluence, isLocked);
  const diagnosticsRetentionInput = createNumberInput(settings.diagnosticsRetentionDays, 1, 30, isLocked);

  const toggles = document.createElement('div');
  toggles.className = 'plan-checkbox-grid';
  toggles.appendChild(createLabeledCheckbox(getPlanMessage('intentEnabledLabel'), enabledInput));
  toggles.appendChild(createLabeledCheckbox(getPlanMessage('intentAutoCalibrationLabel'), autoCalibrationInput));

  const grid = document.createElement('div');
  grid.className = 'plan-pomodoro-grid';
  grid.appendChild(createLabeledControl(getPlanMessage('intentActionLabel'), actionSelect));
  grid.appendChild(createLabeledControl(getPlanMessage('intentInterventionThresholdLabel'), interventionInput));
  grid.appendChild(createLabeledControl(getPlanMessage('intentLockedThresholdLabel'), lockedInput));
  grid.appendChild(createLabeledControl(getPlanMessage('intentPomodoroInfluenceLabel'), pomodoroInfluenceSelect));
  grid.appendChild(createLabeledControl(getPlanMessage('intentDiagnosticsRetentionLabel'), diagnosticsRetentionInput));

  const actions = document.createElement('div');
  actions.className = 'plan-entry-actions';

  const saveButton = createButton(getPlanMessage('intentSaveLabel'), () => {
    onSaveSettings(plan.id, normalizeIntentSettings({
      enabled: enabledInput.checked,
      action: actionSelect.value,
      interventionThreshold: interventionInput.value,
      lockedThreshold: lockedInput.value,
      pomodoroInfluence: pomodoroInfluenceSelect.value,
      diagnosticsRetentionDays: diagnosticsRetentionInput.value,
      autoCalibration: autoCalibrationInput.checked
    }));
  }, 'save-button');
  saveButton.disabled = isLocked;

  actions.appendChild(saveButton);
  section.appendChild(hint);
  section.appendChild(toggles);
  section.appendChild(grid);
  section.appendChild(actions);
  return section;
}
