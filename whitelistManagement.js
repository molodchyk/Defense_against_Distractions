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

document.addEventListener('DOMContentLoaded', () => {
    // Initialize whitelist
    chrome.storage.sync.get('whitelistedSites', ({ whitelistedSites = [] }) => {
      updateWhitelistUI(whitelistedSites);
    });
  
    // Add whitelist functionality
    document.getElementById('addWhitelistButton').addEventListener('click', addWhitelistSite);
    document.getElementById('whitelistInput').addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        addWhitelistSite();
      }
    });
});