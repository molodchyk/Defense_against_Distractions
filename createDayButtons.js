import { dayMapping } from './uiScheduleFunctions.js';

export function createDayButtons(selectedDays, scheduleState) {
  const index = scheduleState.index;
  const dayButtonsContainer = document.createElement('div');
  dayButtonsContainer.id = `dayButtons-${index}`;

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  daysOfWeek.forEach((day, dayIndex) => {
    const dayButton = document.createElement('button');
    dayButton.id = `dayButton-${index}-${dayIndex}`;
    dayButton.setAttribute('data-day', day); // Store the English day abbreviation
    dayButton.textContent = dayMapping[day];
    dayButton.classList.add('day-button');
    if (selectedDays.includes(day)) {
      dayButton.classList.add('selected');
    }

    dayButton.addEventListener('click', function () {
      if (scheduleState.isEditing) {
        this.classList.toggle('selected');
        console.log('Day button clicked:', this.textContent, 'Selected:', this.classList.contains('selected'));


        const day = this.getAttribute('data-day');
        const reverseDayMapping = {};
        for (const [engDay, localizedDay] of Object.entries(dayMapping)) {
          reverseDayMapping[localizedDay] = engDay;
        }
        const englishDay = reverseDayMapping[this.textContent];

        const updatedSelectedDays = Array.from(document.querySelectorAll(`#dayButtons-${index} .day-button.selected`))
          .map(selectedButton => reverseDayMapping[selectedButton.textContent] || selectedButton.textContent);
        const updatedSelectedDays = Array.from(document.querySelectorAll(`#dayButtons-${index} .day-button.selected`))
          .map(selectedButton => {
            // Reverse-translate the day name
            return Object.keys(dayMapping).find(key => dayMapping[key] === selectedButton.textContent);
          });

        scheduleState.updateTempState({ days: updatedSelectedDays });
      }
    });

    dayButtonsContainer.appendChild(dayButton);
  });

  return dayButtonsContainer;
}
