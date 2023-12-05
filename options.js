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

  // Add whitelist functionality
  document.getElementById('addWhitelistButton').addEventListener('click', addWhitelistSite);
  document.getElementById('whitelistInput').addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      addWhitelistSite();
    }
  });
});