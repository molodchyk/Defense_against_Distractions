function updateUI(blockedKeywords) {
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

document.getElementById('addButton').addEventListener('click', addKeyword);

document.getElementById('keywordInput').addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    addKeyword();
  }
});

chrome.storage.sync.get('blockedKeywords', ({ blockedKeywords }) => {
  updateUI(blockedKeywords);
});

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

// Initialize the whitelist UI
chrome.storage.sync.get('whitelistedSites', ({ whitelistedSites = [] }) => {
  updateWhitelistUI(whitelistedSites);
});

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


// Add event listeners and initialize UI
document.addEventListener('DOMContentLoaded', () => {
  // Initialize keyword list
  chrome.storage.sync.get('blockedKeywords', ({ blockedKeywords = [] }) => {
    updateKeywordUI(blockedKeywords);
  });

  // Initialize whitelist
  chrome.storage.sync.get('whitelistedSites', ({ whitelistedSites = [] }) => {
    updateWhitelistUI(whitelistedSites);
  });

  // Add keyword functionality
  document.getElementById('addButton').addEventListener('click', addKeyword);
  document.getElementById('keywordInput').addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      addKeyword();
    }
  });

    // Event listener for adding a group
    document.getElementById('addGroupButton').addEventListener('click', addGroup);

    // Initialize groups UI
    chrome.storage.sync.get('websiteGroups', ({ websiteGroups = [] }) => {
      updateGroupsUI(websiteGroups);
    });

  // Add whitelist functionality
  document.getElementById('addWhitelistButton').addEventListener('click', addWhitelistSite);
  document.getElementById('whitelistInput').addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      addWhitelistSite();
    }
  });
});



function updateGroupsUI(websiteGroups) {
  // Function to update the UI with existing groups
  // Assuming you have a container in your HTML for displaying groups
  const groupsContainer = document.getElementById('groupsContainer');
  groupsContainer.innerHTML = ''; // Clear existing content

  websiteGroups.forEach(group => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'group';

    const groupName = document.createElement('h3');
    groupName.textContent = group.groupName;

    const websitesList = document.createElement('ul');
    group.websites.forEach(site => {
      const siteItem = document.createElement('li');
      siteItem.textContent = site;
      websitesList.appendChild(siteItem);
    });

    const keywordsList = document.createElement('ul');
    group.keywords.forEach(keyword => {
      const keywordItem = document.createElement('li');
      keywordItem.textContent = keyword;
      keywordsList.appendChild(keywordItem);
    });

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete Group';
    deleteButton.onclick = () => removeGroup(group.groupName);

    groupDiv.appendChild(groupName);
    groupDiv.appendChild(websitesList);
    groupDiv.appendChild(keywordsList);
    groupDiv.appendChild(deleteButton);

    groupsContainer.appendChild(groupDiv);
  });
}

function addGroup() {
  const groupName = document.getElementById('groupNameInput').value.trim();
  const websites = document.getElementById('groupWebsitesInput').value.split(',').map(site => site.trim());
  const keywords = document.getElementById('groupKeywordsInput').value.split(',').map(keyword => keyword.trim());

  chrome.storage.sync.get('websiteGroups', ({ websiteGroups = [] }) => {
    websiteGroups.push({ groupName, websites, keywords });
    chrome.storage.sync.set({ websiteGroups }, () => {
      updateGroupsUI(websiteGroups);
    });
  });
}

function removeGroup(groupNameToRemove) {
  chrome.storage.sync.get('websiteGroups', ({ websiteGroups }) => {
    const updatedGroups = websiteGroups.filter(group => group.groupName !== groupNameToRemove);
    chrome.storage.sync.set({ websiteGroups: updatedGroups }, () => {
      updateGroupsUI(updatedGroups);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // ... Existing initialization code ...

  // Event listener for adding a group
  document.getElementById('addGroupButton').addEventListener('click', addGroup);

  // Initialize groups UI
  chrome.storage.sync.get('websiteGroups', ({ websiteGroups = [] }) => {
    updateGroupsUI(websiteGroups);
  });
});

// Function to handle Enter key press on group name and websites input
function handleEnterKeyPress(event, nextElementId) {
  if (event.key === 'Enter') {
    document.getElementById(nextElementId).focus();
    event.preventDefault();
  }
}

// Add event listeners for the group inputs
document.getElementById('groupNameInput').addEventListener('keypress', (event) => {
  handleEnterKeyPress(event, 'groupWebsitesInput');
});

document.getElementById('groupWebsitesInput').addEventListener('keypress', (event) => {
  handleEnterKeyPress(event, 'groupKeywordsInput');
});

// Add event listener for creating group on Enter key press in keywords input
document.getElementById('groupKeywordsInput').addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    addGroup();
    event.preventDefault();
  }
});


// Function to update the UI for groups
function updateGroupsUI(websiteGroups) {
  const list = document.getElementById('groupList');
  list.innerHTML = '';
  websiteGroups.forEach((group, index) => {
    const li = document.createElement('li');
    li.textContent = `Group: ${group.groupName}, Websites: ${group.websites.join(', ')}, Keywords: ${group.keywords.join(', ')}`;
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.onclick = () => removeGroup(index);
    li.appendChild(deleteButton);
    list.appendChild(li);
  });
}

// Function to add a new group
function addGroup() {
  const groupName = document.getElementById('groupNameInput').value.trim();
  const groupWebsites = document.getElementById('groupWebsitesInput').value.trim().split(',').map(site => site.trim());
  const groupKeywords = document.getElementById('groupKeywordsInput').value.trim().split(',').map(keyword => keyword.trim());

  chrome.storage.sync.get('websiteGroups', ({ websiteGroups = [] }) => {
    websiteGroups.push({ groupName, websites: groupWebsites, keywords: groupKeywords });
    chrome.storage.sync.set({ websiteGroups }, () => {
      updateGroupsUI(websiteGroups);
      // Clear input fields
      document.getElementById('groupNameInput').value = '';
      document.getElementById('groupWebsitesInput').value = '';
      document.getElementById('groupKeywordsInput').value = '';
    });
  });
}

// Function to remove a group
function removeGroup(index) {
  chrome.storage.sync.get('websiteGroups', ({ websiteGroups }) => {
    websiteGroups.splice(index, 1);
    chrome.storage.sync.set({ websiteGroups }, () => updateGroupsUI(websiteGroups));
  });
}

// ... rest of the existing script ...

// Event listeners for group management
document.getElementById('addGroupButton').addEventListener('click', addGroup);
document.getElementById('groupKeywordsInput').addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    addGroup();
    event.preventDefault();
  }
});

// Initialize the groups UI
chrome.storage.sync.get('websiteGroups', ({ websiteGroups = [] }) => {
  updateGroupsUI(websiteGroups);
});

// ... existing event listeners for keywords and whitelist ...
