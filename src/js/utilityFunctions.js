// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export { isCurrentTimeInAnySchedule } from './shared/scheduleTime.js';

export function adjustTextareaWidth(textarea) {
  textarea.style.width = '100%';
}


export function adjustTextareaHeight(textarea) {
  textarea.style.height = 'auto'; // Reset height to recalculate
  textarea.style.height = textarea.scrollHeight + 'px'; // Set height to scroll height
}

export function addEnterFunctionalityToField(field) {
  if (field.dataset.enterFunctionalityAdded) {
    return;
  }

  field.addEventListener('keypress', function(event) {
    if (event.key === 'Enter' && !field.readOnly) {
      event.preventDefault();
      event.stopPropagation(); // Prevent event propagation
      const cursorPosition = field.selectionStart;
      field.setRangeText('\n', cursorPosition, cursorPosition, 'end');
      field.selectionStart = field.selectionEnd = cursorPosition + 1;

      adjustTextareaHeight(field); // Adjust the height after adding a newline
      adjustTextareaWidth(field);
    }
  });

  field.dataset.enterFunctionalityAdded = 'true'; // Set flag to indicate event listener added
}


