// Function to handle Enter key press on group name and websites input
function handleEnterKeyPress(event, nextElementId) {
  if (event.key === 'Enter') {
    document.getElementById(nextElementId).focus();
    event.preventDefault();
  }
}

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
