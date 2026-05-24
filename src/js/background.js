// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { initializeDefaultSettings } from './background/defaults.js';
import { initializeScheduleMonitor } from './background/scheduleMonitor.js';

chrome.action.onClicked.addListener(function(tab) {
  chrome.tabs.create({'url': chrome.runtime.getURL('src/options.html')});
});

function injectAndSendMessage(tabId, attempt) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: [
      'src/js/content/state.js',
      'src/js/content/url.js',
      'src/js/content/keywords.js',
      'src/js/content.js'
    ]
  }, () => {
    if (chrome.runtime.lastError) {
      console.error("Error injecting script: ", chrome.runtime.lastError.message);
      return;
    }

    setTimeout(() => {
      chrome.tabs.sendMessage(tabId, {action: "performSiteCheck"}, function(response) {
        if (chrome.runtime.lastError) {
          console.error("Error sending message: ", chrome.runtime.lastError.message);
          if (attempt < 3) { // Retry up to 3 times
            console.log(`Retrying... Attempt ${attempt + 1}`);
            injectAndSendMessage(tabId, attempt + 1);
          }
        } else {
          console.log(response ? response.status : "No response from content script");
        }
      });
    }, 1000 * (attempt + 1));
  });
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === 'updateBadge') {
    const scoreText = message.score.toString();
    chrome.action.setBadgeText({ text: scoreText, tabId: sender.tab.id });
  }
});

initializeDefaultSettings();
initializeScheduleMonitor();

