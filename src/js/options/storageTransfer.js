// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { clearSync, getSync, setSync } from '../shared/storage/chromeStorage.js';

export function initializeStorageTransfer() {
  const exportButton = document.getElementById('exportButton');
  const importButton = document.getElementById('importButton');
  const fileInput = document.getElementById('fileInput');

  exportButton.addEventListener('click', exportSettings);
  fileInput.addEventListener('change', importSettings);
  importButton.addEventListener('click', () => fileInput.click());
}

export async function exportSettings() {
  try {
    const items = await getSync(null);
    const result = JSON.stringify(items);
    const url = `data:text/json;charset=utf-8,${encodeURIComponent(result)}`;
    const dateString = new Date().toISOString().split('T')[0];
    const filename = `DaD-extension-data-${dateString}.json`;

    await new Promise((resolve, reject) => {
      chrome.downloads.download({ url, filename }, downloadId => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }

        resolve(downloadId);
      });
    });
  } catch (error) {
    console.error('Failed to export settings:', error);
    throw error;
  }
}

function importSettings(event) {
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = async e => {
    try {
      const contents = JSON.parse(e.target.result);
      await clearSync();
      await setSync(contents);
      window.location.reload();
    } catch (error) {
      console.error('Failed to import settings:', error);
    }
  };
  reader.readAsText(file);
}
