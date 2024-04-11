/*
 * Defense Against Distractions Extension
 *
 * file: whitelistManagement.js
 * 
 * This file is part of the Defense Against Distractions Extension.
 *
 * Defense Against Distractions Extension is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Defense Against Distractions Extension is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Defense Against Distractions Extension. If not, see <http://www.gnu.org/licenses/>.
 *
 * Author: Oleksandr Molodchyk
 * Copyright (C) 2023-2024 Oleksandr Molodchyk
 */

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

  chrome.storage.sync.get('schedules', (result) => {
    const schedules = result.schedules || [];
    if (isCurrentTimeInAnySchedule(schedules)) {
      console.log("Cannot add site to whitelist during active schedule");
      alert(chrome.i18n.getMessage("lockedScheduleErrorMessage"));
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

