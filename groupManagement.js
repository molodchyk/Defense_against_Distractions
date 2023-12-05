// Function to update the UI for groups
function updateGroupsUI(websiteGroups) {
  const list = document.getElementById('groupList');
  list.innerHTML = '';
  websiteGroups.forEach((group, index) => {
    const li = document.createElement('li');

    // Create elements for group details
    const groupNameDiv = document.createElement('div');
    const groupNameInput = document.createElement('input');
    groupNameInput.type = 'text';
    groupNameInput.value = group.groupName;
    groupNameInput.id = `name-${index}`;
    groupNameDiv.appendChild(groupNameInput);

    const websitesDiv = document.createElement('div');
    const websitesInput = document.createElement('input');
    websitesInput.type = 'text';
    websitesInput.value = group.websites.join(', ');
    websitesInput.id = `websites-${index}`;
    websitesDiv.appendChild(websitesInput);

    const keywordsDiv = document.createElement('div');
    const keywordsInput = document.createElement('input');
    keywordsInput.type = 'text';
    keywordsInput.value = group.keywords.join(', ');
    keywordsInput.id = `keywords-${index}`;
    keywordsDiv.appendChild(keywordsInput);

    // Create Update and Delete buttons
    const updateButton = document.createElement('button');
    updateButton.textContent = 'Update';
    updateButton.addEventListener('click', () => updateGroup(index));

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => removeGroup(index));

    // Append elements to the list item
    li.appendChild(groupNameDiv);
    li.appendChild(websitesDiv);
    li.appendChild(keywordsDiv);
    li.appendChild(updateButton);
    li.appendChild(deleteButton);

    list.appendChild(li);
  });
}


// Function to add a new group
function addGroup() {
  const groupName = document.getElementById('groupNameInput').value.trim();

  if (!groupName) {
    alert("Group name cannot be empty.");
    return;
  }

  chrome.storage.sync.get('websiteGroups', ({ websiteGroups = [] }) => {
    if (websiteGroups.some(group => group.groupName.toLowerCase() === groupName.toLowerCase())) {
      alert("A group with this name already exists.");
      return;
    }

    websiteGroups.push({ groupName, websites: [], keywords: [] });
    chrome.storage.sync.set({ websiteGroups }, () => {
      updateGroupsUI(websiteGroups);
      document.getElementById('groupNameInput').value = ''; // Clear input field
    });
  });
}

// Function to update an existing group
function updateGroup(index) {
  chrome.storage.sync.get('websiteGroups', ({ websiteGroups }) => {
    const groupName = document.getElementById(`name-${index}`).value.trim();
    const websites = document.getElementById(`websites-${index}`).value.split(',').map(site => site.trim());
    const keywords = document.getElementById(`keywords-${index}`).value.split(',').map(keyword => keyword.trim());

    websiteGroups[index] = { groupName, websites, keywords };
    chrome.storage.sync.set({ websiteGroups }, () => updateGroupsUI(websiteGroups));
  });
}

// Function to remove a group
function removeGroup(index) {
  chrome.storage.sync.get('websiteGroups', ({ websiteGroups }) => {
    websiteGroups.splice(index, 1);
    chrome.storage.sync.set({ websiteGroups }, () => updateGroupsUI(websiteGroups));
  });
}


document.addEventListener('DOMContentLoaded', () => {
  // Initialize groups UI
  chrome.storage.sync.get('websiteGroups', ({ websiteGroups = [] }) => {
    updateGroupsUI(websiteGroups);
  });

  // Add group functionality
  document.getElementById('addGroupButton').addEventListener('click', addGroup);
  document.getElementById('groupNameInput').addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      addGroup();
      event.preventDefault();
    }
  });
});
