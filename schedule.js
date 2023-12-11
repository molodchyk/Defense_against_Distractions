// Saves the new or updated schedule to the storage
function saveSchedule(index) {
  const selectedDays = Array.from(document.querySelectorAll('#dayButtons button.selected')).map(button => button.textContent);

  const startTime = document.getElementById('startTime').value;
  const endTime = document.getElementById('endTime').value;

  // Get the active state from the active toggle button
  const isActive = document.querySelector('.active-toggle').classList.contains('active');

  const schedule = {
    days: selectedDays,
    start: startTime,
    end: endTime,
    isActive: isActive // or false, depending on your default or a UI element's state
  };

  chrome.storage.sync.get('schedules', ({ schedules }) => {
    if (index !== undefined) {
      schedules[index] = schedule; // Update existing schedule
    } else {
      schedules.push(schedule); // Add new schedule
    }
    chrome.storage.sync.set({ schedules }, () => {
      updateSchedulesUI(schedules);
    });
  });
}

function createButton(text, onClick, className, index) {
  const button = document.createElement('button');
  button.textContent = text;
  button.addEventListener('click', onClick);
  button.className = className;
  if (index !== undefined) {
    button.setAttribute('data-index', index);
  }
  return button;
}

// Function to dynamically create the schedule UI
function updateSchedulesUI(schedules) {
  const scheduleList = document.getElementById('scheduleList');
  scheduleList.innerHTML = ''; // Clear the list

  schedules.forEach((schedule, index) => {
    const li = document.createElement('li');
    li.className = 'schedule-item';

    // Schedule Name
    createScheduleField(li, 'Schedule Name:', schedule.name, `schedule-name-${index}`, true, index);

    // Days buttons
    const daysContainer = createDayButtons(schedule.days);
    li.appendChild(daysContainer);

    // Start Time
    createScheduleField(li, 'Start Time:', schedule.startTime, `schedule-startTime-${index}`, true, index);

    // End Time
    createScheduleField(li, 'End Time: ', schedule.endTime, `schedule-endTime-${index}`, true, index);

    // Active toggle button
    const activeToggleButton = createActiveToggleButton(schedule.isActive);
    li.appendChild(activeToggleButton);

    // Control buttons container
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'controls-container';

    // Edit button
    const editButton = createButton('Edit', () => toggleScheduleEdit(index), 'edit-button-schedule');
    controlsContainer.appendChild(editButton);

    // Save button
    const saveButton = createButton('Save', () => saveSchedule(index), 'save-button-schedule');
    // saveButton.style.display = 'none'; // Initially hidden, shown when editing
    controlsContainer.appendChild(saveButton);

    // Delete button
    const deleteButton = createButton('Delete', () => removeSchedule(index), 'delete-button-schedule');
    controlsContainer.appendChild(deleteButton);

    li.appendChild(controlsContainer);

    scheduleList.appendChild(li);
  });
}

// Function to create day buttons
function createDayButtons(selectedDays) {
  const dayButtonsContainer = document.createElement('div');
  dayButtonsContainer.id = 'dayButtons';

  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(day => {
    const dayButton = document.createElement('button');
    dayButton.textContent = day;
    dayButton.classList.add('day-button');
    if (selectedDays.includes(day)) {
      dayButton.classList.add('selected');
    }
    dayButton.addEventListener('click', function() {
      this.classList.toggle('selected');
    });
    dayButtonsContainer.appendChild(dayButton);
  });

  return dayButtonsContainer;
}

// Function to create the active toggle button
function createActiveToggleButton(isActive) {
  const activeButton = document.createElement('button');
  activeButton.textContent = isActive ? 'Active' : 'Inactive';
  activeButton.classList.add('active-toggle');
  activeButton.addEventListener('click', function() {
    this.classList.toggle('active');
    this.textContent = this.classList.contains('active') ? 'Active' : 'Inactive';
  });

  return activeButton;
}

// Function to create a save button
function createSaveButton(index) {
  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save';
  saveButton.classList.add('save-button');
  saveButton.addEventListener('click', function() {
    saveSchedule(index);
  });

  return saveButton;
}

// Helper function to create a schedule field
function createScheduleField(container, label, value, id, isReadOnly, index) {
  const fieldDiv = document.createElement('div');
  const labelElement = document.createElement('label');
  labelElement.textContent = label;
  const inputElement = document.createElement('input');

  inputElement.value = value;
  inputElement.id = id;
  inputElement.readOnly = isReadOnly;

  fieldDiv.appendChild(labelElement);
  fieldDiv.appendChild(inputElement);

  container.appendChild(fieldDiv);
}

function toggleScheduleEdit(index) {
  const scheduleNameField = document.getElementById(`schedule-name-${index}`);
  const startTimeField = document.getElementById(`schedule-startTime-${index}`);
  const endTimeField = document.getElementById(`schedule-endTime-${index}`);
  const dayButtons = document.querySelectorAll(`#schedule-days-${index} .day-button`);
  const activeToggle = document.querySelector(`#active-toggle-${index}`);

  const editButton = document.querySelector(`.edit-button-schedule[data-index="${index}"]`);
  const saveButton = document.querySelector(`.save-button-schedule[data-index="${index}"]`);

  // Debugging: log the elements to see if they are being selected correctly
  console.log(`Edit Button: `, editButton);
  console.log(`Save Button: `, saveButton);

  // Check if the buttons are found
  if (!editButton || !saveButton) {
    console.error(`Buttons not found for schedule index ${index}`);//line 165
    return;
  }

  // Determine current editing state
  const isEditing = editButton.textContent === 'Edit';

  // Toggle button text and field states
  editButton.textContent = isEditing ? 'Cancel' : 'Edit';
  saveButton.disabled = !isEditing;

  // Toggle field editability
  [scheduleNameField, startTimeField, endTimeField].forEach(field => {
    if (field) field.readOnly = !isEditing;
  });

  // Toggle day buttons and active toggle button
  dayButtons.forEach(button => button.disabled = !isEditing);
  if (activeToggle) activeToggle.disabled = !isEditing;

  // Add console log for debugging
  console.log(`Toggled edit mode for schedule ${index}: ${isEditing}`);
}

// Removes a schedule from the storage and updates the UI
function removeSchedule(index) {
  chrome.storage.sync.get('schedules', ({ schedules }) => {
    schedules.splice(index, 1);
    chrome.storage.sync.set({ schedules }, () => {
      updateSchedulesUI(schedules); // Update the UI to reflect the removal
    });
  });
}

// Updates the schedule with new values from the fields
function updateSchedule(index) {
  chrome.storage.sync.get('schedules', ({ schedules }) => {
    // Assuming you've created editable fields for each of these properties
    const nameField = document.getElementById(`schedule-name-${index}`);
    const daysField = document.getElementById(`schedule-days-${index}`);
    const startTimeField = document.getElementById(`schedule-startTime-${index}`);
    const endTimeField = document.getElementById(`schedule-endTime-${index}`);

    // Update the schedule object with new values
    const updatedSchedule = {
      name: nameField.value,
      days: daysField.value.split(', '), // Assuming a comma-separated list of days
      startTime: startTimeField.value,
      endTime: endTimeField.value,
      isActive: schedules[index].isActive // Keep the original active state
    };

    schedules[index] = updatedSchedule;
    chrome.storage.sync.set({ schedules }, () => {
      updateSchedulesUI(schedules); // Update the UI with the new schedule
    });
  });
}

document.addEventListener('DOMContentLoaded', function() {
  // Set up day buttons
  document.querySelectorAll('#dayButtons button').forEach(button => {
      button.addEventListener('click', function() {
          this.classList.toggle('selected');
      });
  });

  // Set up save schedule button
  const saveScheduleButton = document.getElementById('saveSchedule');
  if (saveScheduleButton) {
      saveScheduleButton.addEventListener('click', saveSchedule);
  }

  // Set up add schedule button
  const addScheduleButton = document.getElementById('addScheduleButton');
  if (addScheduleButton) {
      addScheduleButton.addEventListener('click', addSchedule);
  }

  const scheduleNameInput = document.getElementById('scheduleNameInput');
  scheduleNameInput.addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
      addSchedule();
    }
  });

  // Initialize schedules UI
  chrome.storage.sync.get('schedules', ({ schedules = [] }) => {
      updateSchedulesUI(schedules);
  });
});




document.getElementById('addScheduleButton').addEventListener('click', addSchedule);

function addSchedule() {
  const scheduleName = document.getElementById('scheduleNameInput').value.trim();
  if (!scheduleName) {
    alert("Schedule name cannot be empty.");
    return;
  }

  chrome.storage.sync.get('schedules', ({ schedules = [] }) => {
    if (schedules.some(schedule => schedule.name.toLowerCase() === scheduleName.toLowerCase())) {
      alert("A schedule with this name already exists.");
      return;
    }

    // Add new schedule
    schedules.push({
      name: scheduleName,
      days: [],
      startTime: '00:00',
      endTime: '23:59',
      isActive: false // Initially, the schedule is not active
    });
    console.log("New schedule added:", scheduleName);

    chrome.storage.sync.set({ schedules }, () => {
      updateSchedulesUI(schedules); // You will need to implement this function
      document.getElementById('scheduleNameInput').value = ''; // Clear input field
    });
  });
}
