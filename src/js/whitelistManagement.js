// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { isCurrentTimeInAnySchedule } from './utilityFunctions.js';

import { getSizeOfObject } from './groupManagementFunctions.js';
import { normalizeUrl } from './shared/url.js';

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


function addWhitelistSite() {
  console.log("Attempting to add site to whitelist");
  const input = document.getElementById('whitelistInput');
  let site = input.value.trim();
  if (!site) {
      console.log("No site entered");
      return;
  }

  site = normalizeUrl(site);
  console.log(`Normalized site: ${site}`);

  chrome.storage.sync.get(['whitelistedSites', 'schedules'], (result) => {
      const schedules = result.schedules || [];
      if (isCurrentTimeInAnySchedule(schedules)) {
          console.log("Cannot add site to whitelist during active schedule");
          alert(chrome.i18n.getMessage("lockedScheduleErrorMessage"));
          return;
      }

      let whitelistedSites = result.whitelistedSites || [];
      if (!whitelistedSites.includes(site)) {
          const updatedSites = [...whitelistedSites, site];
          const estimatedNewDataSize = getSizeOfObject(updatedSites);

          chrome.storage.sync.getBytesInUse(null, function(bytesInUse) {
              if (bytesInUse + estimatedNewDataSize > chrome.storage.sync.QUOTA_BYTES) {
                  alert('Cannot add the site: Storage quota would be exceeded.');
                  return;
              }

              chrome.storage.sync.set({ whitelistedSites: updatedSites }, () => {
                  if (chrome.runtime.lastError) {
                      alert(`Failed to add site to whitelist: ${chrome.runtime.lastError.message}`);
                  } else {
                      console.log(`Added site: ${site}`);
                      updateWhitelistUI(updatedSites);
                      input.value = '';
                  }
              });
          });
      } else {
          console.log("Site already in whitelist");
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

  const whitelistInput = document.getElementById('whitelistInput');
  const addWhitelistButton = document.getElementById('addWhitelistButton'); // Initialize before first use

  chrome.storage.sync.get('whitelistedSites', ({ whitelistedSites = [] }) => {
      updateWhitelistUI(whitelistedSites);
  });

  chrome.storage.sync.get('schedules', ({ schedules }) => {
      const isLocked = isCurrentTimeInAnySchedule(schedules);
      addWhitelistButton.disabled = isLocked; // Disable the button if in a locked schedule

      addWhitelistButton.addEventListener('click', addWhitelistSite);

      whitelistInput.addEventListener('keypress', (event) => {
          if (event.key === 'Enter') {
              if (!isLocked) {
                  addWhitelistSite();
              }
              event.preventDefault(); // Prevent default action regardless of schedule state
          }
      });
  });
});

