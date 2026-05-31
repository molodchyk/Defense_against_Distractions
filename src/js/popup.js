// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

function setStatus(message) {
  document.getElementById('statusText').textContent = message;
}

function getActiveTab() {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      resolve(tabs[0]);
    });
  });
}

async function startElementPicker() {
  const mode = document.getElementById('matchModeSelect').value;
  const depth = document.getElementById('matchDepthSelect').value;
  const activeTab = await getActiveTab();

  if (!activeTab?.id) {
    setStatus('Open a page before picking an element.');
    return;
  }

  chrome.tabs.sendMessage(activeTab.id, {
    action: 'startElementPicker',
    mode,
    depth
  }, response => {
    if (chrome.runtime.lastError) {
      setStatus('Reload this page, then try picking again.');
      return;
    }

    setStatus(response?.status || 'Element picker started.');
    window.close();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('pickElementButton').addEventListener('click', startElementPicker);
  document.getElementById('openOptionsButton').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
});
