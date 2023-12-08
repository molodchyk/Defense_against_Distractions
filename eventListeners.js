import { updateGroupsUI } from './uiFunctions.js';

// Event listener for adding group on Enter key press
document.getElementById('groupNameInput').addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    addGroup();
    event.preventDefault();
  }
});

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

    // Add new group
    websiteGroups.push({ groupName, websites: [], keywords: [] });
    chrome.storage.sync.set({ websiteGroups }, () => {
      updateGroupsUI(websiteGroups);
      document.getElementById('groupNameInput').value = ''; // Clear input field
    });
  });
}
