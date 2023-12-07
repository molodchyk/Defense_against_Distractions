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

function normalizeURL(site) {
  // Remove 'http://', 'https://', and 'www.' from the URL for normalization
  return site.replace(/^(?:https?:\/\/)?(?:www\.)?/, '').toLowerCase();
}

function addWhitelistSite() {
  const input = document.getElementById('whitelistInput');
  let site = input.value.trim();
  if (!site) return;

  // Normalize the site URL before adding it to the list
  site = normalizeURL(site);

  chrome.storage.sync.get('whitelistedSites', (result) => {
    let whitelistedSites = result.whitelistedSites || [];
    if (!whitelistedSites.includes(site)) {
      const updatedSites = [...whitelistedSites, site];
      chrome.storage.sync.set({ whitelistedSites: updatedSites }, () => {
        updateWhitelistUI(updatedSites);
        input.value = '';
      });
    } else {
      alert("This site is already in the whitelist.");
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