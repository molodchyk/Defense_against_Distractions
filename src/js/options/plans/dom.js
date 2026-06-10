// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { getPlanMessage } from './messages.js';

export function createPlanSubsection(titleKey) {
  const section = document.createElement('section');
  section.className = 'plan-subsection';

  const heading = document.createElement('h4');
  heading.textContent = getPlanMessage(titleKey);
  section.appendChild(heading);

  return section;
}

export function createCheckboxRow(labelText, checked, onChange, disabled = false) {
  const label = document.createElement('label');
  label.className = 'plan-checkbox-row';

  const input = createCheckboxInput(checked, disabled);
  input.addEventListener('change', () => onChange(input.checked));

  const text = document.createElement('span');
  text.textContent = labelText;

  label.appendChild(input);
  label.appendChild(text);
  return label;
}

export function createLabeledCheckbox(labelText, input) {
  const label = document.createElement('label');
  label.className = 'plan-checkbox-row';
  const text = document.createElement('span');
  text.textContent = labelText;
  label.appendChild(input);
  label.appendChild(text);
  return label;
}

export function createCheckboxInput(checked, disabled = false) {
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.disabled = disabled;
  return input;
}

export function createNumberInput(value, min, max, disabled = false) {
  const input = document.createElement('input');
  input.type = 'number';
  input.min = String(min);
  input.max = String(max);
  input.step = '1';
  input.value = String(value);
  input.disabled = disabled;
  return input;
}

export function createSelectInput(options, value, disabled = false) {
  const select = document.createElement('select');
  select.disabled = disabled;
  options.forEach(([optionValue, label]) => {
    const option = document.createElement('option');
    option.value = optionValue;
    option.textContent = label;
    option.selected = optionValue === value;
    select.appendChild(option);
  });
  return select;
}

export function createLabeledControl(labelText, control) {
  const label = document.createElement('label');
  label.className = 'plan-entry-field';

  const text = document.createElement('span');
  text.textContent = labelText;

  label.appendChild(text);
  label.appendChild(control);
  return label;
}

export function createTextNavigationButton(text, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'plan-text-button';
  button.textContent = text;
  button.addEventListener('click', event => {
    event.preventDefault();
    runAction(onClick);
  });
  return button;
}

export function confirmDestructiveAction({ title, message, confirmLabel, cancelLabel } = {}) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'confirmation-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'confirmationDialogTitle');

    const dialog = document.createElement('section');
    dialog.className = 'confirmation-dialog';

    const heading = document.createElement('h2');
    heading.id = 'confirmationDialogTitle';
    heading.textContent = title || getPlanMessage('confirmDeleteTitle');

    const body = document.createElement('p');
    body.textContent = message || getPlanMessage('confirmDeleteGeneric');

    const actions = document.createElement('div');
    actions.className = 'confirmation-actions';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'secondary-button';
    cancelButton.textContent = cancelLabel || getPlanMessage('cancelLabel');

    const confirmButton = document.createElement('button');
    confirmButton.type = 'button';
    confirmButton.className = 'delete-button';
    confirmButton.textContent = confirmLabel || getPlanMessage('deleteButtonLabel');

    let resolved = false;
    const finish = confirmed => {
      if (resolved) return;
      resolved = true;
      document.removeEventListener('keydown', handleKeydown);
      overlay.remove();
      resolve(confirmed);
    };

    function handleKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
      }
    }

    cancelButton.addEventListener('click', () => finish(false));
    confirmButton.addEventListener('click', () => finish(true));
    overlay.addEventListener('click', event => {
      if (event.target === overlay) {
        finish(false);
      }
    });
    document.addEventListener('keydown', handleKeydown);

    actions.appendChild(cancelButton);
    actions.appendChild(confirmButton);
    dialog.appendChild(heading);
    dialog.appendChild(body);
    dialog.appendChild(actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    cancelButton.focus();
  });
}

export function createIconButton(labelText, onClick, className) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `icon-button${className ? ` ${className}` : ''}`;
  button.setAttribute('aria-label', labelText);
  button.title = labelText;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M3 6h18M8 6V4h8v2m-1 5v6M9 11v6m-1 4h8a2 2 0 0 0 2-2V6H6v13a2 2 0 0 0 2 2Z');
  svg.appendChild(path);
  button.appendChild(svg);

  button.addEventListener('click', event => {
    event.preventDefault();
    runAction(onClick);
  });
  return button;
}

export function createButton(text, onClick, className) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = text;
  if (className) button.className = className;
  button.addEventListener('click', event => {
    event.preventDefault();
    runAction(onClick);
  });
  return button;
}

export function runAction(action) {
  try {
    const result = action();
    if (result && typeof result.catch === 'function') {
      result.catch(error => console.error('Plan action failed:', error));
    }
  } catch (error) {
    console.error('Plan action failed:', error);
  }
}
