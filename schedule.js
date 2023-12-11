// Saves the new or updated schedule to the storage
function saveSchedule(index) {
  const selectedDays = Array.from(document.querySelectorAll('#dayButtons button.selected')).map(button => button.textContent);
  const startTime = document.getElementById('startTime').value;
  const endTime = document.getElementById('endTime').value;

  const schedule = {
    days: selectedDays,
    start: startTime,
    end: endTime,
    isActive: true // or false, depending on your default or a UI element's state
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

function createButton(text, onClick, className) {
  const button = document.createElement('button');
  button.textContent = text;
  button.addEventListener('click', onClick);
  button.className = className;
  return button;
}

// Function to dynamically create the schedule UI
function updateSchedulesUI(schedules) {
  const scheduleList = document.getElementById('scheduleList');
  scheduleList.innerHTML = ''; // Clear the list

  schedules.forEach((schedule, index) => { //line 43
    const li = document.createElement('li');
    li.className = 'schedule-item';

    // Schedule Name
    createScheduleField(li, 'Schedule Name:', schedule.name, `schedule-name-${index}`, true, index);

    // Days of the week (just a placeholder, you'll want to create a proper UI element for this)
    createScheduleField(li, 'Days:', schedule.days.join(', '), `schedule-days-${index}`, true, index);

    // Start Time
    createScheduleField(li, 'Start Time:', schedule.startTime, `schedule-startTime-${index}`, true, index);

    // End Time
    createScheduleField(li, 'End Time:', schedule.endTime, `schedule-endTime-${index}`, true, index);

    // Active Toggle (again, placeholder for a UI toggle element)
    createScheduleField(li, 'Active:', schedule.isActive ? 'Yes' : 'No', `schedule-active-${index}`, true, index);

    // Edit and Delete buttons
    const editButton = createButton('Edit', () => toggleScheduleEdit(`schedule-${index}`, index), 'edit-button');//line 63
    const deleteButton = createButton('Delete', () => removeSchedule(index), 'delete-button');

    li.appendChild(editButton);
    li.appendChild(deleteButton);

    scheduleList.appendChild(li);
  });
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

// Toggles the schedule fields between read-only and editable
function toggleScheduleEdit(scheduleId, index) {
  const scheduleFields = [`schedule-name-${index}`, `schedule-days-${index}`, `schedule-startTime-${index}`, `schedule-endTime-${index}`];
  scheduleFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    field.readOnly = !field.readOnly;
  });

  const editButton = document.getElementById(`edit-schedule-${index}`);
  const saveButton = document.getElementById(`save-schedule-${index}`);

  if (editButton.innerText === 'Edit') {
    editButton.innerText = 'Cancel';
    saveButton.disabled = false;
  } else {
    editButton.innerText = 'Edit';
    saveButton.disabled = true;
    // Optionally reset the values if cancelled
  }
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

    chrome.storage.sync.set({ schedules }, () => {
      updateSchedulesUI(schedules); // You will need to implement this function //line 182
      document.getElementById('scheduleNameInput').value = ''; // Clear input field
    });
  });
}
