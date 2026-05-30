// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { isCurrentTimeInAnySchedule } from './utilityFunctions.js';

import { getSizeOfObject } from './groupManagementFunctions.js';
import { normalizeUrl } from './shared/url.js';
import { debugLog } from './shared/logger.js';
import {
  getBytesInUseSync,
  getSync,
  setSync
} from './shared/chromeStorage.js';

// Function to update the UI for whitelisted sites
export async function updateWhitelistUI(whitelistedSites) {
  const list = document.getElementById('whitelist');
  list.innerHTML = '';

  try {
    const { schedules = [] } = await getSync('schedules');
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
  } catch (error) {
    console.error('Failed to load schedules for whitelist UI:', error);
  }
}


async function addWhitelistSite() {
  const input = document.getElementById('whitelistInput');
  let site = input.value.trim();
  if (!site) {
      debugLog("No site entered");
      return;
  }

  site = normalizeUrl(site);
  debugLog(`Normalized site: ${site}`);

  try {
    const { whitelistedSites = [], schedules = [] } = await getSync(['whitelistedSites', 'schedules']);

    if (isCurrentTimeInAnySchedule(schedules)) {
      alert(chrome.i18n.getMessage("lockedScheduleErrorMessage"));
      return;
    }

    if (whitelistedSites.includes(site)) {
      alert(chrome.i18n.getMessage("whitelistExistsMessage"));
      return;
    }

    const updatedSites = [...whitelistedSites, site];
    const estimatedNewDataSize = getSizeOfObject(updatedSites);
    const bytesInUse = await getBytesInUseSync();

    if (bytesInUse + estimatedNewDataSize > chrome.storage.sync.QUOTA_BYTES) {
      alert('Cannot add the site: Storage quota would be exceeded.');
      return;
    }

    await setSync({ whitelistedSites: updatedSites });
    debugLog(`Added site: ${site}`);
    updateWhitelistUI(updatedSites);
    input.value = '';
  } catch (error) {
    console.error('Failed to add site to whitelist:', error);
    alert(`Failed to add site to whitelist: ${error.message}`);
  }
}

async function removeWhitelistSite(index) {
  // Fetch both whitelistedSites and schedules
  try {
    const { whitelistedSites = [], schedules = [] } = await getSync(['whitelistedSites', 'schedules']);

    if (isCurrentTimeInAnySchedule(schedules)) {
      alert(chrome.i18n.getMessage("deleteWhitelistError"));
      return;
    }

    whitelistedSites.splice(index, 1);
    await setSync({ whitelistedSites });
    updateWhitelistUI(whitelistedSites);
  } catch (error) {
    console.error('Failed to remove site from whitelist:', error);
    alert(`Failed to remove site from whitelist: ${error.message}`);
  }
}


document.addEventListener('DOMContentLoaded', async () => {

  const whitelistInput = document.getElementById('whitelistInput');
  const addWhitelistButton = document.getElementById('addWhitelistButton'); // Initialize before first use

  try {
    const { whitelistedSites = [] } = await getSync('whitelistedSites');
    await updateWhitelistUI(whitelistedSites);
  } catch (error) {
    console.error('Failed to load whitelisted sites:', error);
  }

  try {
    const { schedules } = await getSync('schedules');
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
  } catch (error) {
    console.error('Failed to initialize whitelist controls:', error);
  }
});

