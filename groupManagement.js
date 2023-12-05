// Function to update the UI for groups
function updateGroupsUI(websiteGroups) {
  const list = document.getElementById('groupList');
  list.innerHTML = '';
  websiteGroups.forEach((group, index) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div>Group Name: <input type="text" value="${group.groupName}" id="name-${index}"></div>
      <div>Websites: <input type="text" value="${group.websites.join(', ')}" id="websites-${index}"></div>
      <div>Keywords: <input type="text" value="${group.keywords.join(', ')}" id="keywords-${index}"></div>
      <button onclick="updateGroup(${index})">Update</button>
      <button onclick="removeGroup(${index})">Delete</button>
    `;
    list.appendChild(li);
  });
}

// Function to add a new group
function addGroup() {
  const groupName = document.getElementById('groupNameInput').value.trim();

  if (!groupName) return; // Don't add if the group name is empty

  chrome.storage.sync.get('websiteGroups', ({ websiteGroups = [] }) => {
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
