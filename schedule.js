let isEditing = {}; // Tracks editing state for each schedule

// Saves the new or updated schedule to the storage
function saveSchedule(index) {
  console.log(`Saving schedule at index: ${index}`);

  if (!isEditing[index]) {
    console.error('Not in editing mode, cannot save.');
    return;
  }

  const selectedDays = Array.from(document.querySelectorAll(`#schedule-days-${index} .day-button.selected`)).map(button => button.textContent);
  const startTime = document.getElementById(`schedule-startTime-${index}`).value;
  const endTime = document.getElementById(`schedule-endTime-${index}`).value;


  // Debugging the active toggle element
  const activeToggleElement = document.querySelector(`#active-toggle-${index}`);
  if (!activeToggleElement) {
    console.error(`Active toggle element not found for index: ${index}`);
    return; // Abort saving if the element is not found
  }
  const isActive = activeToggleElement.classList.contains('active');

  const schedule = {
    name: document.getElementById(`schedule-name-${index}`).value,
    days: selectedDays,
    start: startTime,
    end: endTime,
    isActive
  };

  chrome.storage.sync.get('schedules', ({ schedules }) => {
    schedules[index] = schedule; // Update existing schedule
    chrome.storage.sync.set({ schedules }, () => {
      updateSchedulesUI(schedules);
      console.log(`Schedule saved at index ${index}:`, schedule);
      isEditing[index] = false; // Exit editing mode
      toggleFieldEditability(index, false); // Function to toggle field editability
      console.log(`isEditing[index]: ${isEditing[index]}, saveSchedule button Save pressed`)
      // Update the button texts after saving
      document.getElementById(`edit-button-schedule-${index}`).textContent = 'Edit';
      document.getElementById(`save-button-schedule-${index}`).disabled = true;
    });
  });
}

function toggleFieldEditability(index, isEditable) {
  const fields = [
    document.getElementById(`schedule-name-${index}`),
    document.getElementById(`schedule-startTime-${index}`),
    document.getElementById(`schedule-endTime-${index}`)
  ];

  fields.forEach(field => {
    if (field) {
      field.readOnly = !isEditable;
    }
  });
}

function createButton(text, onClick, className, index) {
  const button = document.createElement('button');
  button.textContent = text;
  button.addEventListener('click', onClick);
  button.className = className;
  
  if (typeof index === 'number') {
    button.id = `${className}-${index}`;
    console.log(`Created button with ID: ${button.id}`);//46
  } else {
    console.log(`Index is not a number, it's: ${index}`);
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
    const editButton = createButton('Edit', () => toggleScheduleEdit(index), 'edit-button-schedule', index);
    controlsContainer.appendChild(editButton);

    // Save button
    const saveButton = createButton('Save', () => saveSchedule(index), 'save-button-schedule', index);//89
    controlsContainer.appendChild(saveButton);

    // Delete button
    const deleteButton = createButton('Delete', () => removeSchedule(index), 'delete-button-schedule', index);
    controlsContainer.appendChild(deleteButton);

    li.appendChild(controlsContainer);

    scheduleList.appendChild(li);
  });
}

function createDayButtons(selectedDays, index) {
  const dayButtonsContainer = document.createElement('div');
  dayButtonsContainer.id = `dayButtons-${index}`;
  console.log(`day buttons container id: ${dayButtonsContainer.id}`);
  console.log(`index for createDayButtons is: ${index}`);

  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(day => {
    const dayButton = document.createElement('button');
    dayButton.textContent = day;
    dayButton.classList.add('day-button');
    console.log(`day button id: ${dayButton.id}`);
    if (selectedDays.includes(day)) {
      dayButton.classList.add('selected');
    }
    dayButton.addEventListener('click', function() {
      if (isEditing[index]) {
        this.classList.toggle('selected');
      }
      console.log(`is editing[index] day buttons: ${isEditing[index]}`);
    });
    dayButtonsContainer.appendChild(dayButton);
    console.log(`Created day button for ${day} with editing check`);//119
  });

  return dayButtonsContainer;
}

function createActiveToggleButton(isActive, index) {
  const activeButton = document.createElement('button');
  activeButton.textContent = isActive ? 'Active' : 'Inactive';
  activeButton.classList.add('active-toggle');
  activeButton.id = `active-toggle-${index}`; // Ensuring correct ID
  console.log(`active button id: ${activeButton.id}`);
  activeButton.addEventListener('click', function() {
    if (isEditing[index]) {
      this.classList.toggle('active');
      this.textContent = this.classList.contains('active') ? 'Active' : 'Inactive';
    }
    console.log(`is editing[index] active toggle button: ${isEditing[index]}`);
  });

  console.log(`Created active toggle button with editing check`);//137
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
  isEditing[index] = !isEditing[index]; // Toggle editing state globally

  const scheduleNameField = document.getElementById(`schedule-name-${index}`);
  const startTimeField = document.getElementById(`schedule-startTime-${index}`);
  const endTimeField = document.getElementById(`schedule-endTime-${index}`);
  const dayButtons = document.querySelectorAll(`#schedule-days-${index} .day-button`);
  const activeToggle = document.querySelector(`#active-toggle-${index}`);

  const editButtonId = `edit-button-schedule-${index}`;
  const saveButtonId = `save-button-schedule-${index}`;


  // Log the current state when entering edit mode
  if (isEditing[index]) {
    console.log(`Editing schedule ${index}`);//185
    if (scheduleNameField) console.log(`Name: ${scheduleNameField.value}`);//186
    if (startTimeField) console.log(`Start Time: ${startTimeField.value}`);//187
    if (endTimeField) console.log(`End Time: ${endTimeField.value}`);//188
    if (activeToggle) console.log(`Active: ${activeToggle.classList.contains('active')}`);//189

    let selectedDays = [];
    dayButtons.forEach(button => {
        if (button && button.classList.contains('selected')) {
            selectedDays.push(button.textContent);
        }
    });
    console.log(`Selected Days: ${selectedDays.join(', ')}`);//197

    // Log day buttons
    console.log('Day buttons found:', dayButtons.length);//200
    dayButtons.forEach(button => console.log(`${button.textContent}: ${button.classList.contains('selected')}`));

    // Log active toggle state
    if (activeToggle) {
      console.log(`Active Toggle State: ${activeToggle.classList.contains('active')}`);
    } else {
      console.log('Active Toggle not found');//207
    }
  }

  // Check if elements are not null before accessing dataset
  if (isEditing[index]) {
    if(scheduleNameField) scheduleNameField.dataset.original = scheduleNameField.value;
    if(startTimeField) startTimeField.dataset.original = startTimeField.value;
    if(endTimeField) endTimeField.dataset.original = endTimeField.value;
    
    dayButtons.forEach(button => {
      if(button) button.dataset.original = button.classList.contains('selected').toString();
    });
    
    if(activeToggle) activeToggle.dataset.original = activeToggle.classList.contains('active').toString();
  }

  const editButton = document.getElementById(editButtonId);
  const saveButton = document.getElementById(saveButtonId);

  // Debugging: log the elements to see if they are being selected correctly
  console.log(`Edit Button ID: ${editButtonId}, Element: `, editButton);//228
  console.log(`Save Button ID: ${saveButtonId}, Element: `, saveButton);//229

  // Check if the buttons are found
  if (!editButton || !saveButton) {
    console.error(`Buttons not found for schedule index ${index}`);
    return;
  }

  // Determine current editing state
  const isCurrentlyEditing = editButton.textContent === 'Edit';

  // Toggle button text and field states
  editButton.textContent = isCurrentlyEditing ? 'Cancel' : 'Edit';
  saveButton.disabled = !isCurrentlyEditing;

  // Toggle field editability
  [scheduleNameField, startTimeField, endTimeField].forEach(field => {
    if (field) field.readOnly = !isEditing[index];
  });

  // Toggle day buttons and active toggle button, only if in edit mode
  dayButtons.forEach(button => {
    button.onclick = isEditing[index] ? () => button.classList.toggle('selected') : null;
  });
  if (activeToggle) {
    activeToggle.onclick = isEditing[index] ? () => {
      activeToggle.classList.toggle('active');
      activeToggle.textContent = activeToggle.classList.contains('active') ? 'Active' : 'Inactive';
    } : null;
  }

  // If canceling, revert to original state
  if (!isEditing[index] && editButton.textContent === 'Cancel') {
    scheduleNameField.value = scheduleNameField.dataset.original;
    startTimeField.value = startTimeField.dataset.original;
    endTimeField.value = endTimeField.dataset.original;
    
    // Revert the selected state for each day button
    dayButtons.forEach(button => {
      const wasOriginallySelected = button.dataset.original === 'true';
      button.classList.toggle('selected', wasOriginallySelected);
    });
    
    // Revert the active state for the active toggle button
    const wasOriginallyActive = activeToggle.dataset.original === 'true';
    activeToggle.classList.toggle('active', wasOriginallyActive);
    activeToggle.textContent = wasOriginallyActive ? 'Active' : 'Inactive';
    
    console.log(`Edit canceled, reverted to original state for schedule ${index}`);
  }

  // Add console log for debugging
  console.log(`Toggled edit mode for schedule ${index}: ${isEditing[index]}`);
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
  // document.querySelectorAll('#dayButtons button').forEach(button => {
  //     button.addEventListener('click', function() {
  //         this.classList.toggle('selected');
  //     });
  // });

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
      console.log('the first function to be called: updateSchedulesUI');
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
      updateSchedulesUI(schedules);
      document.getElementById('scheduleNameInput').value = ''; // Clear input field
    });
  });
}
