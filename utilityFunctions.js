export function adjustTextareaWidth(textarea) {
  const tempSpan = document.createElement('span');
  document.body.appendChild(tempSpan);

  // Copy font styles to the temporary span
  const styles = window.getComputedStyle(textarea);
  tempSpan.style.font = styles.font;
  tempSpan.style.letterSpacing = styles.letterSpacing;
  tempSpan.style.whiteSpace = 'pre-wrap';
  tempSpan.style.visibility = 'hidden';

  tempSpan.textContent = textarea.value || textarea.placeholder;

  // Calculate and set new width
  const padding = parseInt(styles.paddingLeft) + parseInt(styles.paddingRight);
  textarea.style.width = (tempSpan.offsetWidth + padding) + 'px';

  document.body.removeChild(tempSpan);
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
    console.log('Keypress detected:', event.key);
    if (event.key === 'Enter' && !field.readOnly) {
      console.log('Enter key pressed in editable field');
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


export function isCurrentTimeInAnySchedule(schedules) {
  const now = new Date();
  const currentDay = now.toLocaleString('en-US', { weekday: 'short' });
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

  return schedules.some(schedule => {
    if (!schedule.isActive || !schedule.days.includes(currentDay)) {
      return false;
    }
    const startTime = schedule.startTime.split(':').map(Number);
    const endTime = schedule.endTime.split(':').map(Number);
    const startMinutes = startTime[0] * 60 + startTime[1];
    const endMinutes = endTime[0] * 60 + endTime[1];

    return currentTimeMinutes >= startMinutes && currentTimeMinutes <= endMinutes;
  });
}
