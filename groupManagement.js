// Function to add a new group
function addGroup(groupName, websites, keywords) {
    chrome.storage.sync.get('websiteGroups', ({ websiteGroups = [] }) => {
      const newGroup = { groupName, websites, keywords };
      websiteGroups.push(newGroup);
      chrome.storage.sync.set({ websiteGroups });
    });
  }
  
  // Function to remove a group
  function removeGroup(groupName) {
    chrome.storage.sync.get('websiteGroups', ({ websiteGroups }) => {
      const updatedGroups = websiteGroups.filter(group => group.groupName !== groupName);
      chrome.storage.sync.set({ websiteGroups: updatedGroups });
    });
  }
  
  // Function to get keywords for a specific website
  function getKeywordsForWebsite(currentSite) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get('websiteGroups', ({ websiteGroups }) => {
        const group = websiteGroups.find(group => group.websites.includes(currentSite));
        resolve(group ? group.keywords : []);
      });
    });
  }
  
  // Other necessary functions for updating groups...
  