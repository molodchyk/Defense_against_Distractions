// Function to update the UI for blocked keywords
function updateKeywordUI(blockedKeywords) {
  const list = document.getElementById('keywordList');
  list.innerHTML = '';
  blockedKeywords.forEach((keyword, index) => {
    const li = document.createElement('li');
    li.textContent = keyword;
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.onclick = () => removeKeyword(index);
    li.appendChild(deleteButton);
    list.appendChild(li);
  });
}

function addKeyword() {
  const input = document.getElementById('keywordInput');
  const keyword = input.value.trim().toLowerCase(); // Standardize the input to lower case
  if (!keyword) return; // Don't add if the input is empty

  chrome.storage.sync.get('blockedKeywords', ({ blockedKeywords }) => {
    if (blockedKeywords.map(k => k.toLowerCase()).includes(keyword)) {
      alert("This keyword already exists.");
      input.value = ''; // Clear the input field
      return;
    }

    const updatedKeywords = [...blockedKeywords, keyword];
    chrome.storage.sync.set({ blockedKeywords: updatedKeywords }, () => {
      updateUI(updatedKeywords);
      input.value = ''; // Clear the input field after adding
    });
  });
}

function removeKeyword(index) {
  chrome.storage.sync.get('blockedKeywords', ({ blockedKeywords }) => {
    blockedKeywords.splice(index, 1);
    chrome.storage.sync.set({ blockedKeywords }, () => updateUI(blockedKeywords));
  });
}


// Function to update the UI for whitelisted sites
function updateWhitelistUI(whitelistedSites) {
  const list = document.getElementById('whitelist');
  list.innerHTML = '';
  whitelistedSites.forEach((site, index) => {
    const li = document.createElement('li');
    li.textContent = site;
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.onclick = () => removeWhitelistSite(index);
    li.appendChild(deleteButton);
    list.appendChild(li);
  });
}

function addWhitelistSite() {
  const input = document.getElementById('whitelistInput');
  const site = input.value.trim().toLowerCase();
  if (!site) return;

  chrome.storage.sync.get('whitelistedSites', (result) => {
    let whitelistedSites = result.whitelistedSites || []; // Ensure whitelistedSites is an array
    if (!whitelistedSites.includes(site)) {
      const updatedSites = [...whitelistedSites, site];
      chrome.storage.sync.set({ whitelistedSites: updatedSites }, () => {
        updateWhitelistUI(updatedSites);
        input.value = '';
      });
    }
  });
}

function removeWhitelistSite(index) {
  chrome.storage.sync.get('whitelistedSites', ({ whitelistedSites }) => {
    whitelistedSites.splice(index, 1);
    chrome.storage.sync.set({ whitelistedSites }, () => updateWhitelistUI(whitelistedSites));
  });
}

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

// Function to handle Enter key press on group name and websites input
function handleEnterKeyPress(event, nextElementId) {
  if (event.key === 'Enter') {
    document.getElementById(nextElementId).focus();
    event.preventDefault();
  }
}

/*
// Event listeners and initialization
document.addEventListener('DOMContentLoaded', () => {
  // Initialize keyword list
  chrome.storage.sync.get('blockedKeywords', ({ blockedKeywords = [] }) => {
    updateKeywordUI(blockedKeywords);
  });

  // Initialize whitelist
  chrome.storage.sync.get('whitelistedSites', ({ whitelistedSites = [] }) => {
    updateWhitelistUI(whitelistedSites);
  });

  // Initialize groups UI
  chrome.storage.sync.get('websiteGroups', ({ websiteGroups = [] }) => {
    updateGroupsUI(websiteGroups);
  });

  // Add keyword functionality
  document.getElementById('addButton').addEventListener('click', addKeyword);
  document.getElementById('keywordInput').addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      addKeyword();
    }
  });

  // Add whitelist functionality
  document.getElementById('addWhitelistButton').addEventListener('click', addWhitelistSite);
  document.getElementById('whitelistInput').addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      addWhitelistSite();
    }
  });

  // Add group functionality
  document.getElementById('addGroupButton').addEventListener('click', addGroup);
  document.getElementById('groupNameInput').addEventListener('keypress', (event) => {
    handleEnterKeyPress(event, 'groupWebsitesInput');
  });
  document.getElementById('groupWebsitesInput').addEventListener('keypress', (event) => {
    handleEnterKeyPress(event, 'groupKeywordsInput');
  });
  document.getElementById('groupKeywordsInput').addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      addGroup();
      event.preventDefault();
    }
  });
});
*/

document.addEventListener('DOMContentLoaded', () => {
  // Initialize keyword list
  chrome.storage.sync.get('blockedKeywords', ({ blockedKeywords = [] }) => {
    updateKeywordUI(blockedKeywords);
  });

  // Initialize whitelist
  chrome.storage.sync.get('whitelistedSites', ({ whitelistedSites = [] }) => {
    updateWhitelistUI(whitelistedSites);
  });

  // Initialize groups UI
  chrome.storage.sync.get('websiteGroups', ({ websiteGroups = [] }) => {
    updateGroupsUI(websiteGroups);
  });

  // Add keyword functionality
  document.getElementById('addButton').addEventListener('click', addKeyword);
  document.getElementById('keywordInput').addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      addKeyword();
    }
  });

  // Add whitelist functionality
  document.getElementById('addWhitelistButton').addEventListener('click', addWhitelistSite);
  document.getElementById('whitelistInput').addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      addWhitelistSite();
    }
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
