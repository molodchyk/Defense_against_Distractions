import { isCurrentTimeInAnySchedule } from './utilityFunctions.js';

// Function to update the UI for whitelisted sites
export function updateWhitelistUI(whitelistedSites) {
  const list = document.getElementById('whitelist');
  list.innerHTML = '';

  // Fetch schedules for checking active schedule times
  chrome.storage.sync.get('schedules', (result) => {
    const schedules = result.schedules || [];
    const isInSchedule = isCurrentTimeInAnySchedule(schedules);

    whitelistedSites.forEach((site, index) => {
      const li = document.createElement('li');
      li.textContent = site;
      
      const deleteButton = document.createElement('button');
      deleteButton.textContent = chrome.i18n.getMessage("deleteButtonLabel");

      // Disable delete button if in schedule
      if (isInSchedule) {
        deleteButton.disabled = true;
      } else {
        deleteButton.onclick = () => removeWhitelistSite(index);
      }

      li.appendChild(deleteButton);
      list.appendChild(li);
    });
  });
}


function normalizeURL(site) {
  // Remove 'http://', 'https://', and 'www.' from the URL for normalization
  return site.replace(/^(?:https?:\/\/)?(?:www\.)?/, '').toLowerCase();
}

function addWhitelistSite() {
  console.log("Attempting to add site to whitelist"); // Log when function is called
  const input = document.getElementById('whitelistInput');
  let site = input.value.trim();
  if (!site) {
    console.log("No site entered"); // Log if input is empty
    return;
  }

  // Normalize the site URL before adding it to the list
  site = normalizeURL(site);
  console.log(`Normalized site: ${site}`); // Log normalized site

  chrome.storage.sync.get('whitelistedSites', (result) => {
    let whitelistedSites = result.whitelistedSites || [];
    if (!whitelistedSites.includes(site)) {
      const updatedSites = [...whitelistedSites, site];
      chrome.storage.sync.set({ whitelistedSites: updatedSites }, () => {
        console.log(`Added site: ${site}`); // Log site addition
        updateWhitelistUI(updatedSites);
        input.value = '';
      });
    } else {
      console.log("Site already in whitelist"); // Log if site is already in list
      alert(chrome.i18n.getMessage("whitelistExistsMessage"));
    }
  });
}

function removeWhitelistSite(index) {
  // Fetch both whitelistedSites and schedules
  chrome.storage.sync.get(['whitelistedSites', 'schedules'], (result) => {
    const { whitelistedSites, schedules } = result;

    if (isCurrentTimeInAnySchedule(schedules)) {
      alert(chrome.i18n.getMessage("deleteWhitelistError"));
      return;
    }

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
        event.preventDefault(); // Prevent default to stop form submission if applicable
      }
    });
});
