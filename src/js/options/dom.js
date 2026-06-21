// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { getUiMessage } from '../shared/ui/uiLanguage.js';

export function createLocalizedButton(messageKey, onClick, className, options = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = getUiMessage(messageKey, messageKey);

  if (className) {
    button.className = className;
  }

  if (options.id) {
    button.id = options.id;
  }

  button.addEventListener('click', event => {
    event.preventDefault();

    if (options.stopPropagation) {
      event.stopPropagation();
    }

    onClick(event);
  });

  return button;
}
